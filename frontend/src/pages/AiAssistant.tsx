import { useState, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Plus, MessageSquare, Trash2, Clock,
  Database, TrendingUp, Users, DollarSign, BarChart3,
  Send, Loader2, Sparkles, Table, Gamepad2, Target,
  Stethoscope, ChevronRight, } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  queryResult?: { rowCount: number; preview: any[] };
  status?: string;
}

// 产品优化平台 AI 产品顾问快捷问题
const QUICK_PROMPT_CATEGORIES = [
  {
    category: "关卡分析",
    icon: Gamepad2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    prompts: [
      { label: "关卡流失热点", prompt: "分析哪些关卡的流失率最高，找出前10个流失最严重的关卡，并分析可能的原因" },
      { label: "难度曲线诊断", prompt: "分析当前关卡的难度曲线是否合理，找出通关率异常偏低或偏高的关卡" },
      { label: "道具使用分析", prompt: "分析各关卡的道具使用情况，哪些关卡玩家最依赖道具？道具使用与通关率的关系如何？" },
      { label: "新手漏斗", prompt: "分析新用户从第1关到第15关的通关漏斗，每一关的流失率是多少？" },
    ],
  },
  {
    category: "用户洞察",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    prompts: [
      { label: "分层价值对比", prompt: "对比6个用户分层的ARPU、留存率、广告观看频次和付费率，找出最有提升空间的层级" },
      { label: "流失预警", prompt: "找出近7天活跃度显著下降的用户群体，按分层统计流失风险分布" },
      { label: "付费转化路径", prompt: "分析首次付费用户的行为特征：平均在第几关首付？首付金额分布？付费前的广告观看次数？" },
      { label: "高价值用户画像", prompt: "分析L1鲸鱼用户的行为特征：平均通关数、会话时长、付费频次、最常购买的商品" },
    ],
  },
  {
    category: "收入分析",
    icon: DollarSign,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    prompts: [
      { label: "收入结构拆解", prompt: "拆解过去30天的总收入结构：IAP vs 广告各占多少？各分层用户的收入贡献如何？" },
      { label: "广告eCPM趋势", prompt: "分析各广告网络过去30天的eCPM趋势，哪个网络表现最好？哪个在下滑？" },
      { label: "内购商品排行", prompt: "统计过去30天各内购商品的销售额和购买次数排行，哪些商品最受欢迎？" },
      { label: "ARPU日趋势", prompt: "展示过去30天的ARPU日趋势，标注异常波动点并分析可能原因" },
    ],
  },
  {
    category: "获客效率",
    icon: Target,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    prompts: [
      { label: "渠道ROI对比", prompt: "对比各获客渠道的CPI、D7留存率和30天ROAS，哪个渠道性价比最高？" },
      { label: "地区表现", prompt: "按国家/地区统计用户数、ARPU和留存率，哪些市场值得加大投放？" },
      { label: "投放效率趋势", prompt: "分析过去30天各投放活动的花费、安装量和ROAS趋势" },
    ],
  },
  {
    category: "运营诊断",
    icon: Stethoscope,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    prompts: [
      { label: "今日运营概览", prompt: "给我一份今日的运营数据概览：DAU、收入、新增、留存、付费率等核心指标，并与昨日对比" },
      { label: "异常指标排查", prompt: "检查最近的异常告警记录，有哪些指标出现了异常？严重程度如何？" },
      { label: "周度复盘", prompt: "做一份过去7天的运营数据复盘：核心指标变化趋势、亮点和风险点" },
    ],
  },
];

export default function AiAssistant() {
  const [activeSessionId, setActiveSessionId] = useState<number | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [streamStatus, setStreamStatus] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 获取会话列表
  const { data: sessions, refetch: refetchSessions } = trpc.aiAssistant.listSessions.useQuery();

  // 获取当前会话
  const { data: currentSession } = trpc.aiAssistant.getSession.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId }
  );

  // 删除会话
  const deleteMutation = trpc.aiAssistant.deleteSession.useMutation({
    onSuccess: () => {
      refetchSessions();
      if (activeSessionId) {
        setActiveSessionId(undefined);
        setMessages([]);
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
      setMessages(
        (msgs as Record<string, unknown>[])
          .filter((m: any) => m.role === "user" || m.role === "assistant")
          .map((m: any) => ({
            role: m.role,
            content: m.content,
            queryResult: m.queryResult,
          }))
      );
    }
  }, [currentSession]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamStatus]);

  // SSE 流式发送消息
  const handleSend = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    setInputValue("");
    setStreamStatus("connecting");

    // 添加用户消息
    setMessages(prev => [...prev, { role: "user", content }]);

    // 添加空的助手消息（用于流式填充）
    setMessages(prev => [...prev, { role: "assistant", content: "", isStreaming: true }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/ai-chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId, message: content }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

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
          if (line.startsWith("event: ")) {
            continue;
          }
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

      // Finalize the streaming message
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

      if (newSessionId) {
        setActiveSessionId(newSessionId);
      }
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
  }, [activeSessionId, isLoading, refetchSessions]);

  // 新建对话
  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setActiveSessionId(undefined);
    setMessages([]);
    setIsLoading(false);
    setStreamStatus("");
  };

  // 选择会话
  const handleSelectSession = (id: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setActiveSessionId(id);
    setIsLoading(false);
    setStreamStatus("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* 左侧会话列表 */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                AI 运营分析师
              </CardTitle>
              <Button size="sm" variant="outline" onClick={handleNewChat} className="h-7 px-2">
                <Plus className="h-3.5 w-3.5 mr-1" />
                新对话
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <ScrollArea className="flex-1 p-2">
            {!sessions?.length ? (
              <div className="text-center text-muted-foreground text-xs py-8">
                暂无对话记录
              </div>
            ) : (
              <div className="space-y-1">
                {sessions.map((s: any) => (
                  <div
                    key={s.id}
                    className={`group flex items-center gap-2 rounded-md px-2.5 py-2 cursor-pointer transition-colors ${
                      activeSessionId === s.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => handleSelectSession(s.id)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                    <span className="text-xs truncate flex-1">
                      {s.title || "新对话"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate({ sessionId: s.id });
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* 底部能力提示 */}
          <Separator />
          <div className="p-3 space-y-2 flex-shrink-0">
            <p className="text-[10px] text-muted-foreground font-medium">AI 分析师能力</p>
            <div className="grid grid-cols-2 gap-1">
              {[
                { icon: Database, label: "SQL 数据查询" },
                { icon: TrendingUp, label: "趋势分析" },
                { icon: Gamepad2, label: "关卡诊断" },
                { icon: DollarSign, label: "变现优化" },
                { icon: BarChart3, label: "分层洞察" },
                { icon: Clock, label: "实时数据" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 右侧对话区域 */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* 消息区域 */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 shadow-lg">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Color Block Jam AI 运营分析师</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  专属消除游戏运营分析，支持自然语言查询数据库、关卡级精细分析、分层变现策略建议
                </p>

                {/* 快捷问题面板 */}
                <div className="w-full max-w-2xl space-y-2">
                  {QUICK_PROMPT_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isExpanded = expandedCategory === cat.category;
                    return (
                      <div key={cat.category} className="rounded-lg border bg-card overflow-hidden">
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                          onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                        >
                          <div className={`h-7 w-7 rounded-md ${cat.bgColor} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`h-3.5 w-3.5 ${cat.color}`} />
                          </div>
                          <span className="text-sm font-medium flex-1">{cat.category}</span>
                          <Badge variant="secondary" className="text-[10px] h-5">{cat.prompts.length}</Badge>
                          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 grid grid-cols-2 gap-1.5">
                            {cat.prompts.map((p, i) => (
                              <button
                                key={i}
                                className="text-left text-xs p-2.5 rounded-md border bg-muted/30 hover:bg-muted hover:border-primary/30 transition-all group"
                                onClick={() => handleSend(p.prompt)}
                              >
                                <span className="font-medium text-foreground group-hover:text-primary transition-colors">{p.label}</span>
                                <p className="text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{p.prompt}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] ${msg.role === "user" ? "order-2" : ""}`}>
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs text-muted-foreground">AI 分析师</span>
                          {msg.isStreaming && streamStatus && (
                            <Badge variant="secondary" className="text-[10px] h-4 animate-pulse">
                              {streamStatus}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className={`rounded-lg px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}>
                        {msg.role === "assistant" ? (
                          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                            <Streamdown>{msg.content || (msg.isStreaming ? "..." : "")}</Streamdown>
                            {msg.isStreaming && !msg.content && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span className="text-xs">{streamStatus || "思考中..."}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      {/* 查询结果表格 */}
                      {msg.queryResult && msg.queryResult.rowCount > 0 && (
                        <div className="mt-2 rounded-lg border overflow-hidden">
                          <div className="bg-muted/50 px-3 py-1.5 flex items-center gap-2 border-b">
                            <Table className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              查询结果: {msg.queryResult.rowCount} 行
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b bg-muted/30">
                                  {Object.keys(msg.queryResult.preview[0] || {}).map((key) => (
                                    <th key={key} className="px-3 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                                      {key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {msg.queryResult.preview.map((row: any, ri: number) => (
                                  <tr key={ri} className="border-b last:border-0">
                                    {Object.values(row).map((val: any, ci: number) => (
                                      <td key={ci} className="px-3 py-1.5 whitespace-nowrap">
                                        {val === null ? <span className="text-muted-foreground italic">null</span> : String(val)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
          <div className="border-t p-4">
            <div className="flex items-end gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="问我任何关于产品优化的问题，例如：最新版本的留存率有没有提升？第30关的流失率为什么这么高？"
                className="min-h-[44px] max-h-[120px] resize-none"
                rows={1}
                disabled={isLoading}
              />
              <Button
                size="icon"
                aria-label="发送消息"
                className="h-[44px] w-[44px] flex-shrink-0"
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
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              支持自然语言查询数据库 · 自动执行SQL并分析结果 · 版本效果对比 · 产品优化建议
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
