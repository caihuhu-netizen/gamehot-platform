import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot, Send, Loader2, Sparkles, X, Maximize2, MessageSquare,
  Gamepad2, Users, DollarSign, Target, Stethoscope, Table,
  ChevronRight, Plus, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  queryResult?: { rowCount: number; preview: any[] };
}

interface ContextPrompt {
  icon: string;
  label: string;
  prompt: string;
  color: string;
}

// 图标映射
const ICON_MAP: Record<string, React.ElementType> = {
  stethoscope: Stethoscope,
  gamepad: Gamepad2,
  dollar: DollarSign,
  users: Users,
  target: Target,
};

// 默认快捷问题（后备方案）
const DEFAULT_QUICK_PROMPTS: ContextPrompt[] = [
  { icon: "stethoscope", label: "今日运营概览", prompt: "给我一份今日的运营数据概览：DAU、收入、新增、留存、付费率等核心指标，并与昨日对比", color: "text-rose-500" },
  { icon: "gamepad", label: "关卡流失热点", prompt: "分析哪些关卡的通关率最低，找出前10个流失最严重的关卡", color: "text-emerald-500" },
  { icon: "dollar", label: "收入结构拆解", prompt: "拆解过去7天的总收入结构：IAP vs 广告各占多少？", color: "text-amber-500" },
  { icon: "users", label: "流失预警", prompt: "找出churn_risk最高的用户群体，按分层统计流失风险分布", color: "text-blue-500" },
  { icon: "target", label: "渠道ROI对比", prompt: "对比各获客渠道的CPI和安装量，哪个渠道性价比最高？", color: "text-purple-500" },
];

// 页面名称映射（用于显示当前上下文）
const PAGE_NAME_MAP: Record<string, string> = {
  "/": "经营仪表盘",
  "/segments": "用户分层",
  "/probes": "探针关卡",
  "/difficulty": "难度调度",
  "/monetize": "变现触发",
  "/experiments": "A/B实验",
  "/user-profiles": "用户画像",
  "/analytics": "数据分析",
  "/levels": "关卡管理",
  "/loop-engine": "闭环引擎",
  "/cohort-retention": "Cohort留存",
  "/acquisition": "获客渠道",
  "/cost-profit": "成本利润",
  "/ad-revenue": "广告聚合",
  "/daily-report": "投放日报",
  "/push-center": "推送中心",
  "/audience": "用户分群",
  "/user-recall": "用户召回",
  "/iap-products": "内购商品",
  "/anomaly-monitor": "异常监控",
  "/monetize-daily": "变现日报",
  "/pricing-engine": "智能定价",
  "/ai-daily-report": "AI日报",
  "/daily-overview": "每日总览",
};

// sessionStorage key for persisting bubble state
const BUBBLE_STATE_KEY = "ai_bubble_state";

interface BubblePersistedState {
  sessionId?: number;
  messages: ChatMessage[];
  lastRoute?: string;
}

function loadPersistedState(): BubblePersistedState | null {
  try {
    const raw = sessionStorage.getItem(BUBBLE_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function savePersistedState(state: BubblePersistedState) {
  try {
    sessionStorage.setItem(BUBBLE_STATE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export default function FloatingAIBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [streamStatus, setStreamStatus] = useState("");
  const [showSessions, setShowSessions] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [contextPrompts, setContextPrompts] = useState<ContextPrompt[]>(DEFAULT_QUICK_PROMPTS);
  const [currentPageName, setCurrentPageName] = useState("经营仪表盘");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);
  const [location, navigate] = useLocation();

  // 从 sessionStorage 恢复上次对话状态
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const persisted = loadPersistedState();
    if (persisted && persisted.messages.length > 0) {
      setMessages(persisted.messages);
      setActiveSessionId(persisted.sessionId);
      setHasNewMessage(true); // 提示有未读的历史对话
    }
  }, []);

  // 持久化当前对话状态到 sessionStorage
  useEffect(() => {
    if (messages.length > 0 || activeSessionId) {
      savePersistedState({
        sessionId: activeSessionId,
        messages,
        lastRoute: location,
      });
    }
  }, [messages, activeSessionId, location]);

  // 获取会话列表
  const { data: sessions, refetch: refetchSessions } = trpc.aiAssistant.listSessions.useQuery(
    undefined,
    { enabled: isOpen }
  );

  // 获取当前会话
  const { data: currentSession } = trpc.aiAssistant.getSession.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId && isOpen }
  );

  // 删除会话
  const deleteMutation = trpc.aiAssistant.deleteSession.useMutation({
    onSuccess: () => {
      refetchSessions();
      if (activeSessionId) {
        setActiveSessionId(undefined);
        setMessages([]);
        savePersistedState({ messages: [] });
      }
      toast.success("会话已删除");
    },
  });

  // 加载会话消息
  useEffect(() => {
    if (currentSession?.messages) {
      const msgs = typeof currentSession.messages === "string"
        ? JSON.parse(currentSession.messages)
        : currentSession.messages;
      const loadedMessages = (msgs as Record<string, unknown>[])
        .filter((m: any) => m.role === "user" || m.role === "assistant")
        .map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          queryResult: m.queryResult,
        }));
      setMessages(loadedMessages);
    }
  }, [currentSession]);

  // 根据当前路由获取上下文感知的快捷问题
  useEffect(() => {
    const pageName = PAGE_NAME_MAP[location] || "经营仪表盘";
    setCurrentPageName(pageName);

    // 从后端获取上下文感知的快捷问题
    fetch(`/api/ai-chat/context-prompts?route=${encodeURIComponent(location)}`)
      .then(res => res.json())
      .then(data => {
        if (data.prompts && data.prompts.length > 0) {
          setContextPrompts(data.prompts);
        }
        if (data.pageName) {
          setCurrentPageName(data.pageName);
        }
      })
      .catch(() => {
        // 后备：使用默认快捷问题
        setContextPrompts(DEFAULT_QUICK_PROMPTS);
      });
  }, [location]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamStatus]);

  // 打开气泡时清除新消息标记
  useEffect(() => {
    if (isOpen) setHasNewMessage(false);
  }, [isOpen]);

  // SSE 流式发送消息
  const handleSend = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    setInputValue("");
    setStreamStatus("connecting");

    setMessages(prev => [...prev, { role: "user", content }]);
    setMessages(prev => [...prev, { role: "assistant", content: "", isStreaming: true }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/ai-chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId: activeSessionId,
          message: content,
          pageContext: location, // 传递当前页面路由作为上下文
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`请求失败: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("无法读取响应流");

      let buffer = "";
      let fullContent = "";
      let queryResult: any = null;
      let newSessionId: number | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) continue;
          if (line.startsWith("data: ")) {
            const rawData = line.slice(6).trim();
            try {
              const data = JSON.parse(rawData);
              if (data.phase) {
                setStreamStatus(data.text || data.phase);
              } else if (data.content !== undefined) {
                fullContent += data.content;
                setMessages(prev => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                    updated[lastIdx] = { ...updated[lastIdx], content: fullContent };
                  }
                  return updated;
                });
              } else if (data.rowCount !== undefined && data.preview) {
                queryResult = data;
              } else if (data.sessionId !== undefined) {
                newSessionId = data.sessionId;
                if (data.queryResult) queryResult = data.queryResult;
              } else if (data.message) {
                toast.error("AI 错误: " + data.message);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: fullContent,
            isStreaming: false,
            queryResult,
          };
        }
        return updated;
      });

      if (newSessionId) setActiveSessionId(newSessionId);
      refetchSessions();
    } catch (err) {
      if ((err as any).name !== "AbortError") {
        toast.error("连接失败: " + (err as Error).message);
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === "assistant" && !updated[updated.length - 1].content) {
            updated.pop();
          }
          return updated;
        });
      }
    } finally {
      setIsLoading(false);
      setStreamStatus("");
      abortControllerRef.current = null;
    }
  }, [activeSessionId, isLoading, refetchSessions, location]);

  const handleNewChat = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setActiveSessionId(undefined);
    setMessages([]);
    setIsLoading(false);
    setStreamStatus("");
    setShowSessions(false);
    savePersistedState({ messages: [] });
  };

  const handleSelectSession = (id: number) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setActiveSessionId(id);
    setIsLoading(false);
    setStreamStatus("");
    setShowSessions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const handleOpenFullPage = () => {
    setIsOpen(false);
    navigate("/ai-assistant");
  };

  return (
    <>
      {/* 悬浮气泡按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center",
          "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
          "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
          "hover:shadow-xl hover:scale-105 active:scale-95",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
      >
        <Bot className="h-6 w-6" />
        {hasNewMessage && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive animate-pulse" />
        )}
      </button>

      {/* 对话框面板 */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 flex flex-col",
          "w-[420px] h-[600px] rounded-2xl shadow-2xl border",
          "bg-card text-card-foreground overflow-hidden",
          "transition-all duration-300 origin-bottom-right",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-tight">AI 运营分析师</h3>
              <p className="text-[10px] text-muted-foreground">
                当前页面: {currentPageName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* 会话列表切换 */}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setShowSessions(!showSessions)}
              title="历史会话"
              aria-label="历史会话"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
            {/* 新对话 */}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleNewChat}
              title="新对话"
              aria-label="新对话"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            {/* 打开完整版 */}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleOpenFullPage}
              title="在完整页面中打开"
              aria-label="在完整页面中打开"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            {/* 关闭（不清空对话） */}
            <Button
              size="icon"
              variant="ghost"
              aria-label="关闭"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* 会话列表抽屉 */}
        {showSessions && (
          <div className="border-b bg-muted/30 max-h-[200px] overflow-hidden flex-shrink-0">
            <ScrollArea className="h-full max-h-[200px]">
              <div className="p-2 space-y-0.5">
                {!sessions?.length ? (
                  <p className="text-xs text-muted-foreground text-center py-4">暂无历史会话</p>
                ) : (
                  sessions.map((s: any) => (
                    <div
                      key={s.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-md px-2.5 py-1.5 cursor-pointer transition-colors text-xs",
                        activeSessionId === s.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                      onClick={() => handleSelectSession(s.id)}
                    >
                      <MessageSquare className="h-3 w-3 flex-shrink-0 opacity-60" />
                      <span className="truncate flex-1">{s.title || "新对话"}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate({ sessionId: s.id });
                        }}
                      >
                        <Trash2 className="h-2.5 w-2.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* 消息区域 */}
        <ScrollArea className="flex-1 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-4 h-full">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3 shadow">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">有什么我能帮你分析的？</p>
              <p className="text-[11px] text-muted-foreground mb-1 text-center">
                支持自然语言查询数据、关卡分析、变现优化
              </p>
              {/* 当前页面上下文提示 */}
              <Badge variant="secondary" className="text-[10px] mb-3 px-2 py-0.5">
                📍 {currentPageName} · 已为您推荐相关问题
              </Badge>

              {/* 上下文感知的快捷问题 */}
              <div className="w-full space-y-1.5">
                {contextPrompts.map((item, i) => {
                  const Icon = ICON_MAP[item.icon] || Stethoscope;
                  return (
                    <button
                      key={i}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/20 transition-all text-left group"
                      onClick={() => handleSend(item.prompt)}
                      disabled={isLoading}
                    >
                      <Icon className={cn("h-4 w-4 flex-shrink-0", item.color)} />
                      <span className="text-xs font-medium group-hover:text-primary transition-colors">{item.label}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>

              {/* 打开完整版提示 */}
              <button
                className="mt-3 text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                onClick={handleOpenFullPage}
              >
                <Maximize2 className="h-3 w-3" />
                打开完整版查看更多快捷问题
              </button>
            </div>
          ) : (
            <div className="space-y-3 p-3">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%]", msg.role === "user" ? "order-2" : "")}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <Bot className="h-3 w-3 text-primary" />
                        <span className="text-[10px] text-muted-foreground">AI 分析师</span>
                        {msg.isStreaming && streamStatus && (
                          <Badge variant="secondary" className="text-[9px] h-3.5 px-1 animate-pulse">
                            {streamStatus}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className={cn(
                      "rounded-lg px-3 py-2 text-[13px]",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-xs dark:prose-invert max-w-none [&_p]:text-[13px] [&_li]:text-[13px] [&_h1]:text-sm [&_h2]:text-[13px] [&_h3]:text-[13px] [&_code]:text-[11px] [&_table]:text-[11px]">
                          <Streamdown>{msg.content || (msg.isStreaming ? "..." : "")}</Streamdown>
                          {msg.isStreaming && !msg.content && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span className="text-[10px]">{streamStatus || "思考中..."}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-[13px]">{msg.content}</p>
                      )}
                    </div>

                    {/* 查询结果表格 - 紧凑版 */}
                    {msg.queryResult && msg.queryResult.rowCount > 0 && (
                      <div className="mt-1.5 rounded-lg border overflow-hidden">
                        <div className="bg-muted/50 px-2.5 py-1 flex items-center gap-1.5 border-b">
                          <Table className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            查询结果: {msg.queryResult.rowCount} 行
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="border-b bg-muted/30">
                                {Object.keys(msg.queryResult.preview[0] || {}).map((key) => (
                                  <th key={key} className="px-2 py-1 text-left font-medium text-muted-foreground whitespace-nowrap">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.queryResult.preview.slice(0, 5).map((row: any, ri: number) => (
                                <tr key={ri} className="border-b last:border-0">
                                  {Object.values(row).map((val: any, ci: number) => (
                                    <td key={ci} className="px-2 py-1 whitespace-nowrap">
                                      {val === null ? <span className="text-muted-foreground italic">null</span> : String(val)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {msg.queryResult.rowCount > 5 && (
                            <div className="px-2 py-1 text-[9px] text-muted-foreground text-center border-t">
                              显示前5行，共 {msg.queryResult.rowCount} 行
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* 输入区域 */}
        <div className="border-t p-3 flex-shrink-0 bg-background/50">
          <div className="flex items-end gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`问我关于${currentPageName}的运营问题...`}
              className="min-h-[38px] max-h-[80px] resize-none text-[13px]"
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="icon"
              aria-label="发送消息"
              className="h-[38px] w-[38px] flex-shrink-0"
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
