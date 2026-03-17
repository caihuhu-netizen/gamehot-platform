/**
 * CSRF Token Utility
 * 
 * Reads the CSRF token from the cookie set by the server
 * and provides it for inclusion in request headers.
 * 
 * Used by the tRPC client to automatically attach the
 * X-CSRF-Token header to all mutation requests.
 */

const CSRF_COOKIE_NAME = "__csrf_token";

/**
 * Read the CSRF token from the browser cookie.
 * Returns undefined if the cookie is not set.
 */
export function getCsrfToken(): string | undefined {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return undefined;
}
