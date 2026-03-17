import { cn } from "@/lib/utils";
import { reportRenderError } from "@/lib/errorReporter";
import { AlertTriangle, ChevronDown, ChevronUp, Home, RefreshCw, RotateCcw, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import { Component, type ReactNode } from "react";
import React from "react";

interface Props {
  children: ReactNode;
  /** 页面级错误边界（不影响侧边栏） vs 全局级（整页） */
  isPageLevel?: boolean;
  /** 返回首页路径 */
  fallbackPath?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
  retryCount: number;
  isRetrying: boolean;
}

/** 判断是否为 chunk/module 加载失败 */
function isChunkLoadError(error: Error): boolean {
  const msg = error.message?.toLowerCase() || "";
  const name = error.name?.toLowerCase() || "";
  return (
    msg.includes("loading chunk") ||
    msg.includes("loading css chunk") ||
    msg.includes("dynamically imported module") ||
    msg.includes("failed to fetch") ||
    msg.includes("loading module") ||
    msg.includes("importing a module") ||
    name === "chunkerror" ||
    name === "chunkloaderror" ||
    msg.includes("unable to preload") ||
    msg.includes("preloading") ||
    msg.includes("failed to load module")
  );
}

/** 判断是否为网络错误 */
function isNetworkError(error: Error): boolean {
  const msg = error.message?.toLowerCase() || "";
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("net::err")
  );
}

const MAX_AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

/**
 * 全局错误边界组件 (增强版)
 * 
 * 功能：
 * - Chunk 加载失败自动重试（最多3次，间隔1.5s）
 * - 网络错误友好提示
 * - 页面级 vs 全局级错误隔离
 * - 错误详情折叠展示
 * - 自动重试动画反馈
 * - 刷新时自动清除浏览器缓存
 */
class ErrorBoundary extends Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary]", error, errorInfo);
    // Report to backend error monitoring
    reportRenderError(error, errorInfo?.componentStack || undefined);

    // Chunk 加载失败 → 自动重试
    if (isChunkLoadError(error) && this.state.retryCount < MAX_AUTO_RETRIES) {
      this.autoRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  autoRetry = () => {
    this.setState({ isRetrying: true });
    this.retryTimer = setTimeout(() => {
      this.setState(prev => ({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
        retryCount: prev.retryCount + 1,
      }));
    }, RETRY_DELAY_MS);
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0,
      isRetrying: false,
    });
  };

  handleReload = () => {
    // 清除浏览器缓存后刷新，确保获取最新资源
    if ("caches" in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = this.props.fallbackPath || "/";
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    // 自动重试中 → 显示加载动画
    if (this.state.isRetrying) {
      return (
        <div className={cn(
          "flex items-center justify-center p-8",
          this.props.isPageLevel ? "min-h-[60vh]" : "min-h-screen bg-background"
        )}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">正在重新加载...</p>
              <p className="text-xs text-muted-foreground mt-1">
                第 {this.state.retryCount + 1}/{MAX_AUTO_RETRIES} 次尝试
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (this.state.hasError) {
      const { isPageLevel } = this.props;
      const { error, errorInfo, showDetails, retryCount } = this.state;
      const isChunk = error ? isChunkLoadError(error) : false;
      const isNetwork = error ? isNetworkError(error) : false;
      const exhaustedRetries = isChunk && retryCount >= MAX_AUTO_RETRIES;

      return (
        <div className={cn(
          "flex items-center justify-center p-8",
          isPageLevel ? "min-h-[60vh]" : "min-h-screen bg-background"
        )}>
          <div className="flex flex-col items-center w-full max-w-lg">
            {/* 图标 */}
            <div className={cn(
              "flex items-center justify-center w-16 h-16 rounded-full mb-6",
              isChunk || isNetwork
                ? "bg-blue-100 dark:bg-blue-900/30"
                : isPageLevel
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
            )}>
              {isNetwork ? (
                <WifiOff size={32} className="text-blue-600 dark:text-blue-400" />
              ) : isChunk ? (
                <Wifi size={32} className="text-blue-600 dark:text-blue-400" />
              ) : isPageLevel ? (
                <AlertTriangle size={32} className="text-amber-600 dark:text-amber-400" />
              ) : (
                <ShieldAlert size={32} className="text-red-600 dark:text-red-400" />
              )}
            </div>

            {/* 标题 */}
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {isNetwork
                ? "网络连接异常"
                : isChunk
                  ? exhaustedRetries
                    ? "页面资源加载失败"
                    : "正在重新加载页面..."
                  : isPageLevel
                    ? "页面加载出错"
                    : "系统遇到意外错误"
              }
            </h2>

            <p className="text-sm text-muted-foreground mb-6 text-center">
              {isNetwork
                ? "请检查您的网络连接后重试。如果使用VPN，请尝试切换节点。"
                : isChunk
                  ? exhaustedRetries
                    ? "多次重试后仍无法加载页面资源。这通常是由于网络不稳定或系统刚刚更新。请刷新页面重试。"
                    : "页面资源正在重新加载，请稍候..."
                  : isPageLevel
                    ? "当前页面发生异常，您可以重试或返回首页。其他页面不受影响。"
                    : "应用程序发生了意外错误，请尝试刷新页面。如果问题持续存在，请联系管理员。"
              }
            </p>

            {/* 重试次数提示 */}
            {exhaustedRetries && (
              <div className="w-full mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                  已自动重试 {retryCount} 次。系统可能刚刚更新，刷新页面可获取最新版本。
                </p>
              </div>
            )}

            {/* 错误摘要 */}
            {error && !isChunk && !isNetwork && (
              <div className="w-full mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-mono text-destructive truncate">
                  {error.message || "Unknown Error"}
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center gap-3 mb-4">
              {isChunk || isNetwork ? (
                <>
                  <button
                    onClick={this.handleReload}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium",
                      "bg-primary text-primary-foreground",
                      "hover:opacity-90 cursor-pointer transition-opacity"
                    )}
                  >
                    <RefreshCw size={15} />
                    刷新页面
                  </button>
                  <button
                    onClick={this.handleRetry}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium",
                      "bg-secondary text-secondary-foreground",
                      "hover:opacity-80 cursor-pointer transition-opacity"
                    )}
                  >
                    <RotateCcw size={15} />
                    重试
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={isPageLevel ? this.handleRetry : this.handleReload}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium",
                      "bg-primary text-primary-foreground",
                      "hover:opacity-90 cursor-pointer transition-opacity"
                    )}
                  >
                    <RotateCcw size={15} />
                    {isPageLevel ? "重试" : "刷新页面"}
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium",
                      "bg-secondary text-secondary-foreground",
                      "hover:opacity-80 cursor-pointer transition-opacity"
                    )}
                  >
                    <Home size={15} />
                    返回首页
                  </button>
                </>
              )}
            </div>

            {/* 错误详情折叠 */}
            {(error?.stack || errorInfo) && (
              <div className="w-full">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors mx-auto"
                >
                  {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showDetails ? "隐藏错误详情" : "查看错误详情"}
                </button>
                {showDetails && (
                  <div className="mt-3 p-4 w-full rounded-lg bg-muted overflow-auto max-h-64 border border-border">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono">
                      {error?.stack}
                      {errorInfo?.componentStack && (
                        <>
                          {"\n\n--- Component Stack ---\n"}
                          {errorInfo.componentStack}
                        </>
                      )}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
