/**
 * Frontend Error Reporter
 * Captures and reports frontend errors to the backend for monitoring.
 *
 * Features:
 * - Global window.onerror handler
 * - Unhandled promise rejection handler
 * - Deduplication (same error within 5 seconds is ignored)
 * - Rate limiting (max 10 errors per minute)
 * - Chunk load error detection
 */

type ErrorSeverity = "critical" | "error" | "warning";
type ErrorType = "runtime" | "unhandled_rejection" | "chunk_load" | "network" | "render" | "unknown";

interface ErrorReport {
  errorMessage: string;
  errorStack?: string;
  componentStack?: string;
  errorType: ErrorType;
  severity: ErrorSeverity;
  url?: string;
  userAgent?: string;
  browserInfo?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ── Deduplication & Rate Limiting ──────────────────────────────
const recentErrors = new Map<string, number>();
const DEDUP_WINDOW_MS = 5000;
const MAX_ERRORS_PER_MINUTE = 10;
let errorsThisMinute = 0;
let minuteResetTimer: ReturnType<typeof setInterval> | null = null;

function getErrorFingerprint(message: string, stack?: string): string {
  return `${message}::${(stack || "").substring(0, 200)}`;
}

function shouldReport(fingerprint: string): boolean {
  // Rate limit check
  if (errorsThisMinute >= MAX_ERRORS_PER_MINUTE) return false;

  // Dedup check
  const lastSeen = recentErrors.get(fingerprint);
  if (lastSeen && Date.now() - lastSeen < DEDUP_WINDOW_MS) return false;

  recentErrors.set(fingerprint, Date.now());
  errorsThisMinute++;

  // Clean old entries
  if (recentErrors.size > 50) {
    const cutoff = Date.now() - DEDUP_WINDOW_MS;
    const keysToDelete: string[] = [];
    recentErrors.forEach((time, key) => {
      if (time < cutoff) keysToDelete.push(key);
    });
    keysToDelete.forEach(k => recentErrors.delete(k));
  }

  return true;
}

// ── Browser Info ───────────────────────────────────────────────
function getBrowserInfo(): Record<string, unknown> {
  return {
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screenWidth: screen.width,
    screenHeight: screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    timestamp: Date.now(),
  };
}

// ── Error Classification ───────────────────────────────────────
function classifyError(error: Error | string): { type: ErrorType; severity: ErrorSeverity } {
  const msg = typeof error === "string" ? error : error.message || "";
  const lower = msg.toLowerCase();

  if (lower.includes("loading chunk") || lower.includes("dynamically imported module") || lower.includes("failed to fetch")) {
    return { type: "chunk_load", severity: "warning" };
  }
  if (lower.includes("network") || lower.includes("timeout") || lower.includes("econnrefused")) {
    return { type: "network", severity: "warning" };
  }
  if (lower.includes("typeerror") || lower.includes("referenceerror") || lower.includes("syntaxerror")) {
    return { type: "runtime", severity: "error" };
  }
  if (lower.includes("cannot read") || lower.includes("is not a function") || lower.includes("undefined")) {
    return { type: "runtime", severity: "error" };
  }
  return { type: "unknown", severity: "error" };
}

// ── Report Sender ──────────────────────────────────────────────
async function sendReport(report: ErrorReport): Promise<void> {
  try {
    // Use fetch directly to avoid tRPC dependency in error handler
    await fetch("/api/trpc/frontendErrors.report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": getCsrfToken(),
      },
      body: JSON.stringify({
        json: report,
      }),
    });
  } catch {
    // Silently ignore - we can't report errors about error reporting
  }
}

function getCsrfToken(): string {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : "";
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Report a React ErrorBoundary catch to the backend.
 */
export function reportRenderError(error: Error, componentStack?: string): void {
  const fingerprint = getErrorFingerprint(error.message, error.stack);
  if (!shouldReport(fingerprint)) return;

  sendReport({
    errorMessage: error.message,
    errorStack: error.stack,
    componentStack,
    errorType: "render",
    severity: "critical",
    url: window.location.href,
    userAgent: navigator.userAgent,
    browserInfo: getBrowserInfo(),
  });
}

/**
 * Report a custom error manually.
 */
export function reportError(
  message: string,
  options?: {
    stack?: string;
    type?: ErrorType;
    severity?: ErrorSeverity;
    metadata?: Record<string, unknown>;
  }
): void {
  const fingerprint = getErrorFingerprint(message, options?.stack);
  if (!shouldReport(fingerprint)) return;

  sendReport({
    errorMessage: message,
    errorStack: options?.stack,
    errorType: options?.type || "runtime",
    severity: options?.severity || "error",
    url: window.location.href,
    userAgent: navigator.userAgent,
    browserInfo: getBrowserInfo(),
    metadata: options?.metadata,
  });
}

/**
 * Initialize global error handlers.
 * Call once at app startup.
 */
export function initErrorReporter(): void {
  // Reset rate limit counter every minute
  if (minuteResetTimer) clearInterval(minuteResetTimer);
  minuteResetTimer = setInterval(() => {
    errorsThisMinute = 0;
  }, 60_000);

  // Global error handler
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const msg = typeof message === "string" ? message : "Unknown error";
    const { type, severity } = classifyError(error || msg);
    const fingerprint = getErrorFingerprint(msg, error?.stack);

    if (shouldReport(fingerprint)) {
      sendReport({
        errorMessage: msg,
        errorStack: error?.stack,
        errorType: type,
        severity,
        url: window.location.href,
        userAgent: navigator.userAgent,
        browserInfo: getBrowserInfo(),
        metadata: { source, lineno, colno },
      });
    }

    // Call original handler if exists
    if (typeof originalOnError === "function") {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // Unhandled promise rejection handler
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason;
    const msg = error instanceof Error ? error.message : String(error || "Unhandled promise rejection");
    const stack = error instanceof Error ? error.stack : undefined;
    const { severity } = classifyError(error || msg);
    const fingerprint = getErrorFingerprint(msg, stack);

    if (shouldReport(fingerprint)) {
      sendReport({
        errorMessage: msg,
        errorStack: stack,
        errorType: "unhandled_rejection",
        severity,
        url: window.location.href,
        userAgent: navigator.userAgent,
        browserInfo: getBrowserInfo(),
      });
    }
  });
}
