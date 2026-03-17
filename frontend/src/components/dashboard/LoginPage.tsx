import { useEffect, useRef, useState } from "react";
import { Gamepad2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export function LoginPage() {
  const feishuLogin = trpc.feishu.getLoginUrl.useQuery(
    { origin: window.location.origin, returnPath: window.location.pathname || "/" },
    { retry: false }
  );
  const [feishuLoading, setFeishuLoading] = useState(false);
  const autoRedirected = useRef(false);

  // Check for feishu error from server-side redirect
  const feishuError = new URLSearchParams(window.location.search).get("feishu_error");
  const feishuErrorMsg = feishuError === "access_denied" ? "您取消了飞书授权" 
    : feishuError === "missing_code" ? "授权码缺失，请重试"
    : feishuError === "callback_failed" ? "飞书登录失败，请重试"
    : feishuError ? "飞书登录异常，请重试" : null;

  // Auto-redirect to Feishu login if no error and URL is available
  useEffect(() => {
    if (autoRedirected.current) return;
    if (feishuError) return; // Don't auto-redirect if there was an error
    if (feishuLogin.data?.url) {
      autoRedirected.current = true;
      setFeishuLoading(true);
      window.location.href = feishuLogin?.data?.url;
    }
  }, [feishuLogin.data, feishuError]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Gamepad2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-center">
            GAMEHOT CDP系统
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            用户分层 · 难度调度 · 变现触发 · A/B实验 一站式管理
          </p>
        </div>

        {!feishuError && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#3370ff]" />
            <p className="text-sm text-muted-foreground">正在跳转飞书登录...</p>
          </div>
        )}

        {feishuErrorMsg && (
          <div className="w-full p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm text-center">
            {feishuErrorMsg}
          </div>
        )}

        {feishuError && (
          <div className="w-full space-y-3">
            <Button
              onClick={() => {
                if (feishuLogin.data?.url) {
                  setFeishuLoading(true);
                  window.location.href = feishuLogin?.data?.url;
                }
              }}
              size="lg"
              className="w-full shadow-lg hover:shadow-xl transition-all bg-[#3370ff] hover:bg-[#2860e0] text-white"
              disabled={feishuLoading || !feishuLogin.data?.url}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M3.5 5.5L10.5 2L20.5 8.5L13.5 12L3.5 5.5Z" fill="currentColor" opacity="0.8"/>
                <path d="M3.5 5.5L13.5 12V22L3.5 15.5V5.5Z" fill="currentColor" opacity="0.6"/>
                <path d="M13.5 12L20.5 8.5V18.5L13.5 22V12Z" fill="currentColor"/>
              </svg>
              {feishuLoading ? "跳转中..." : "重新飞书登录"}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          登录即表示同意服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
