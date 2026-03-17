import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ScrollText, CheckCircle2, XCircle, Edit3, Clock, TrendingUp, TrendingDown, Minus,
  BarChart3, Brain, AlertTriangle, Zap, ChevronDown, ChevronUp, } from "lucide-react";

type SourceType = "ai_daily_report" | "anomaly_alert" | "smart_suggestion" | "auto_response";
type HumanAction = "accepted" | "rejected" | "modified";
type HumanActionAll = HumanAction | "pending";
type EffectEval = "positive" | "negative" | "neutral" | "pending";

const sourceLabels: Record<SourceType, { label: string; icon: any; color: string }> = {
  ai_daily_report: { label: "AI日报", icon: Brain, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  anomaly_alert: { label: "异常告警", icon: AlertTriangle, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  smart_suggestion: { label: "智能建议", icon: Zap, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  auto_response: { label: "自动响应", icon: ScrollText, color: "bg-green-500/10 text-green-400 border-green-500/20" },
};

const actionLabels: Record<HumanActionAll, { label: string; icon: any; color: string }> = {
  accepted: { label: "已采纳", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  rejected: { label: "已拒绝", icon: XCircle, color: "bg-red-500/10 text-red-400 border-red-500/20" },
  modified: { label: "已修改", icon: Edit3, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  pending: { label: "待处理", icon: Clock, color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

const effectLabels: Record<EffectEval, { label: string; icon: any; color: string }> = {
  positive: { label: "正向", icon: TrendingUp, color: "text-emerald-400" },
  negative: { label: "负向", icon: TrendingDown, color: "text-red-400" },
  neutral: { label: "中性", icon: Minus, color: "text-gray-400" },
  pending: { label: "待评估", icon: Clock, color: "text-gray-500" },
};

export default function DecisionLogs() {
  const { user } = useAuth();
  const { currentGameId } = useGame();
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionDialog, setActionDialog] = useState<{ id: number; type: "action" | "effect" } | null>(null);
  const [selectedAction, setSelectedAction] = useState<HumanAction>("accepted");
  const [humanNote, setHumanNote] = useState("");
  const [modifiedAction, setModifiedAction] = useState("");
  const [effectEval, setEffectEval] = useState<"positive" | "negative" | "neutral">("positive");
  const [effectNote, setEffectNote] = useState("");

  const { data: logs, refetch } = trpc.decisionLogs.list.useQuery({
    sourceType: sourceFilter !== "all" ? sourceFilter : undefined,
    humanAction: actionFilter !== "all" ? actionFilter : undefined,
    gameId: currentGameId ?? undefined,
    limit: 100,
  });

  const { data: stats } = trpc.decisionLogs.stats.useQuery();

  const updateAction = trpc.decisionLogs.updateAction.useMutation({
    onSuccess: () => {
      toast.success("操作已记录");
      refetch();
      setActionDialog(null);
    },
  });

  const updateEffect = trpc.decisionLogs.updateEffect.useMutation({
    onSuccess: () => {
      toast.success("效果评估已保存");
      refetch();
      setActionDialog(null);
    },
  });

  const handleSubmitAction = () => {
    if (!actionDialog) return;
    updateAction.mutate({
      id: actionDialog.id,
      humanAction: selectedAction,
      humanNote: humanNote || undefined,
      modifiedAction: selectedAction === "modified" ? modifiedAction : undefined,
    });
  };

  const handleSubmitEffect = () => {
    if (!actionDialog) return;
    updateEffect.mutate({
      id: actionDialog.id,
      effectEvaluation: effectEval,
      effectNote: effectNote || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">决策日志</h1>
          <p className="text-muted-foreground mt-1">追踪AI建议的采纳情况和实际效果，持续优化AI决策质量</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">总建议数</div>
              <div className="text-2xl font-bold mt-1">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">待处理</div>
              <div className="text-2xl font-bold mt-1 text-amber-400">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">采纳率</div>
              <div className="text-2xl font-bold mt-1 text-emerald-400">{stats.adoptionRate}%</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">正向效果率</div>
              <div className="text-2xl font-bold mt-1 text-blue-400">{stats.effectPositiveRate}%</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">已评估</div>
              <div className="text-2xl font-bold mt-1">{stats.effectPositive + stats.effectNegative}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="来源筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部来源</SelectItem>
            <SelectItem value="ai_daily_report">AI日报</SelectItem>
            <SelectItem value="anomaly_alert">异常告警</SelectItem>
            <SelectItem value="smart_suggestion">智能建议</SelectItem>
            <SelectItem value="auto_response">自动响应</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待处理</SelectItem>
            <SelectItem value="accepted">已采纳</SelectItem>
            <SelectItem value="rejected">已拒绝</SelectItem>
            <SelectItem value="modified">已修改</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Decision Log List */}
      <div className="space-y-3">
        {(!logs || logs.length === 0) ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <ScrollText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">暂无决策日志</p>
              <p className="text-sm text-muted-foreground/70 mt-1">当AI日报或异常监控产生建议时，将自动记录到此处</p>
            </CardContent>
          </Card>
        ) : (
          (logs ?? []).map((log: Record<string,unknown>) => {
            const source = sourceLabels[log.sourceType as SourceType];
            const action = actionLabels[log.humanAction as HumanActionAll];
            const effect = effectLabels[(log.effectEvaluation || "pending") as EffectEval];
            const isExpanded = expandedId === log.id;
            const SourceIcon = source.icon;
            const ActionIcon = action.icon;
            const EffectIcon = effect.icon;

            return (
              <Card key={log.id} className="border-border/50 hover:border-border transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Source Icon */}
                    <div className={`p-2 rounded-lg border ${source.color} shrink-0`}>
                      <SourceIcon className="w-4 h-4" />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={source.color}>{source.label}</Badge>
                        <Badge variant="outline" className={action.color}>
                          <ActionIcon className="w-3 h-3 mr-1" />
                          {action.label}
                        </Badge>
                        {log.effectEvaluation && log.effectEvaluation !== "pending" && (
                          <span className={`flex items-center gap-1 text-xs ${effect.color}`}>
                            <EffectIcon className="w-3 h-3" />
                            {effect.label}效果
                          </span>
                        )}
                        {log.aiSuggestionType && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {log.aiSuggestionType}
                          </span>
                        )}
                      </div>

                      <p className="text-sm line-clamp-2">{log.aiSuggestion}</p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{new Date(log.createdAt).toLocaleString("zh-CN")}</span>
                        {log.operatorName && <span>操作人: {log.operatorName}</span>}
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 space-y-3 border-t border-border/50 pt-3">
                          {log.humanNote && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">操作备注</div>
                              <p className="text-sm bg-muted/50 p-2 rounded">{log.humanNote}</p>
                            </div>
                          )}
                          {log.modifiedAction && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">修改后的执行方案</div>
                              <p className="text-sm bg-muted/50 p-2 rounded">{log.modifiedAction}</p>
                            </div>
                          )}
                          {log.effectNote && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">效果评估备注</div>
                              <p className="text-sm bg-muted/50 p-2 rounded">{log.effectNote}</p>
                            </div>
                          )}
                          {log.effectMetricBefore && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">执行前指标</div>
                              <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto">
                                {JSON.stringify(log.effectMetricBefore, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.effectMetricAfter && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">执行后指标</div>
                              <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto">
                                {JSON.stringify(log.effectMetricAfter, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {log.humanAction === "pending" && user && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActionDialog({ id: log.id, type: "action" });
                            setSelectedAction("accepted");
                            setHumanNote("");
                            setModifiedAction("");
                          }}
                        >
                          处理
                        </Button>
                      )}
                      {log.humanAction !== "pending" && (!log.effectEvaluation || log.effectEvaluation === "pending") && user && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActionDialog({ id: log.id, type: "effect" });
                            setEffectEval("positive");
                            setEffectNote("");
                          }}
                        >
                          评估效果
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialog?.type === "action"} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>处理AI建议</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">决策</label>
              <Select value={selectedAction} onValueChange={(v) => setSelectedAction(v as HumanAction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accepted">采纳 — 按AI建议执行</SelectItem>
                  <SelectItem value="modified">修改 — 调整后执行</SelectItem>
                  <SelectItem value="rejected">拒绝 — 不执行</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedAction === "modified" && (
              <div>
                <label className="text-sm font-medium mb-2 block">修改后的执行方案</label>
                <Textarea
                  value={modifiedAction}
                  onChange={(e) => setModifiedAction(e.target.value)}
                  placeholder="描述您实际执行的方案..."
                  rows={3}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">备注（可选）</label>
              <Textarea
                value={humanNote}
                onChange={(e) => setHumanNote(e.target.value)}
                placeholder="为什么做出这个决策..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>取消</Button>
            <Button onClick={handleSubmitAction} disabled={updateAction.isPending}>
              {updateAction.isPending ? "提交中..." : "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Effect Evaluation Dialog */}
      <Dialog open={actionDialog?.type === "effect"} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>评估执行效果</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">效果评估</label>
              <Select value={effectEval} onValueChange={(v) => setEffectEval(v as "positive" | "negative" | "neutral")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">正向 — 指标改善</SelectItem>
                  <SelectItem value="neutral">中性 — 无明显变化</SelectItem>
                  <SelectItem value="negative">负向 — 指标恶化</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">评估说明（可选）</label>
              <Textarea
                value={effectNote}
                onChange={(e) => setEffectNote(e.target.value)}
                placeholder="描述具体的指标变化..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>取消</Button>
            <Button onClick={handleSubmitEffect} disabled={updateEffect.isPending}>
              {updateEffect.isPending ? "提交中..." : "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
