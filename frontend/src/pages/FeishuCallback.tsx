import { useEffect, useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle, XCircle, ShieldX } from "lucide-react";

export default function FeishuCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error" | "denied">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const calledRef = useRef(false);

  const loginMutation = trpc.feishu.loginWithCode.useMutation({
    onSuccess: () => {
      setStatus("success");
      // Cookie is set by server, redirect after short delay
      setTimeout(() => {
        try {
          const params = new URLSearchParams(window.location.search);
          const stateStr = params.get("state");
          if (stateStr) {
            const state = JSON.parse(decodeURIComponent(stateStr));
            if (state.returnPath && state.returnPath !== "/api/feishu/callback") {
              window.location.href = state.returnPath;
              return;
            }
          }
        } catch {}
        window.location.href = "/";
      }, 800);
    },
    onError: (err) => {
      setStatus("error");
      setErrorMsg(err.message || "飞书登录失败");
    },
  });

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const params = new URLSearchParams(window.location.search);

    // Handle user denied authorization
    const error = params.get("error");
    if (error === "access_denied") {
      setStatus("denied");
      return;
    }

    const code = params.get("code");
    if (!code) {
      setStatus("error");
      setErrorMsg("缺少授权码参数");
      return;
    }

    loginMutation.mutate({ code, origin: window.location.origin });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4 p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-[#3370ff]" />
            <h2 className="text-lg font-semibold">飞书登录中...</h2>
            <p className="text-sm text-muted-foreground">正在验证身份信息，请稍候</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h2 className="text-lg font-semibold">登录成功</h2>
            <p className="text-sm text-muted-foreground">正在跳转到系统...</p>
          </>
        )}
        {status === "denied" && (
          <>
            <ShieldX className="h-12 w-12 text-amber-500" />
            <h2 className="text-lg font-semibold">授权已取消</h2>
            <p className="text-sm text-muted-foreground">您取消了飞书授权，可以重新尝试登录</p>
            <button
              onClick={() => window.location.href = "/"}
              className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
            >
              返回登录页
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-lg font-semibold">登录失败</h2>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <button
              onClick={() => window.location.href = "/"}
              className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
            >
              返回首页重试
            </button>
          </>
        )}
      </div>
    </div>
  );
}
