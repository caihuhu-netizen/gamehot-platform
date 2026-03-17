import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ListChecks, Sparkles, Loader2, ThumbsUp, ThumbsDown,
  Lightbulb, Target, DollarSign, Users, Zap, Clock,
  CheckCircle2, XCircle, ArrowRight, Filter
} from "lucide-react";

const categoryLabels: Record<string, { label: string; icon: typeof Lightbulb; color: string }> = {
  retention: { label: "留存优化", icon: Users, color: "text-blue-500 bg-blue-500/10" },
  monetization: { label: "变现优化", icon: DollarSign, color: "text-green-500 bg-green-500/10" },
  engagement: { label: "参与度", icon: Target, color: "text-purple-500 bg-purple-500/10" },
  acquisition: { label: "获客优化", icon: Zap, color: "text-amber-500 bg-amber-500/10" },
  performance: { label: "性能优化", icon: Zap, color: "text-cyan-500 bg-cyan-500/10" },
  content: { label: "内容优化", icon: Lightbulb, color: "text-pink-500 bg-pink-500/10" },
};
const priorityLabels: Record<string, { label: string; color: string }> = {
  critical: { label: "紧急", color: "bg-red-500 text-white" },
  high: { label: "高", color: "bg-orange-500 text-white" },
  medium: { label: "中", color: "bg-amber-500 text-white" },
  low: { label: "低", color: "bg-muted text-muted-foreground" },
};
const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "待处理", color: "bg-muted text-muted-foreground" },
  accepted: { label: "已采纳", color: "bg-blue-500/10 text-blue-500" },
  rejected: { label: "已拒绝", color: "bg-red-500/10 text-red-500" },
  implemented: { label: "已实施", color: "bg-green-500/10 text-green-500" },
  verified: { label: "已验证", color: "bg-purple-500/10 text-purple-500" },
};

export default function OptimizationSuggestions() {
  const { currentGame } = useGame();
  const gameId = currentGame?.id ?? 0;
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [generating, setGenerating] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);

  const suggestions = trpc.productOptimization.suggestions.list.useQuery(
    {
      gameId,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      limit: 50,
    },
    { enabled: !!gameId }
  );

  const generateAI = trpc.productOptimization.suggestions.generateAI.useMutation({
    onSuccess: (data: any) => {
      toast.success(`AI 生成了优化建议`);
      suggestions.refetch();
      setGenerating(false);
    },
    onError: (e: unknown) => { toast.error((e as Error).message); setGenerating(false); },
  });

  const updateStatus = trpc.productOptimization.suggestions.update.useMutation({
    onSuccess: () => { toast.success("状态已更新"); suggestions.refetch(); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const stats = useMemo(() => {
    const list = suggestions.data ?? [];
    return {
      total: list.length,
      pending: list.filter((s: any) => s.status === "pending").length,
      accepted: list.filter((s: any) => s.status === "accepted").length,
      implemented: list.filter((s: any) => s.status === "implemented" || s.status === "verified").length,
    };
  }, [suggestions.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" /> 优化建议
          </h1>
          <p className="text-muted-foreground mt-1">基于数据分析和 AI 洞察，生成可执行的产品优化建议</p>
        </div>
        <Button
          onClick={() => { setGenerating(true); generateAI.mutate({ gameId, context: "请分析当前游戏的核心指标，给出产品优化建议", focusArea: "general" }); }}
          disabled={!gameId || generating}
          variant="default"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          AI 生成建议
        </Button>
      </div>

      {!gameId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">请先在顶部选择一个游戏项目</CardContent></Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="总建议数" value={stats.total} icon={ListChecks} color="text-primary" />
            <StatCard label="待处理" value={stats.pending} icon={Clock} color="text-amber-500" />
            <StatCard label="已采纳" value={stats.accepted} icon={ThumbsUp} color="text-blue-500" />
            <StatCard label="已实施" value={stats.implemented} icon={CheckCircle2} color="text-green-500" />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="分类" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Suggestion List */}
          {suggestions.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary/60" /></div>
          ) : (suggestions.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">暂无优化建议</p>
                <p className="text-sm">点击「AI 生成建议」让 AI 分析当前数据并生成优化方案</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(suggestions.data ?? []).map((s: any) => {
                const cat = categoryLabels[s.category] || categoryLabels.content;
                const CatIcon = cat.icon;
                const pri = priorityLabels[s.priority] || priorityLabels.medium;
                const sta = statusLabels[s.status] || statusLabels.pending;
                return (
                  <Card key={s.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedSuggestion(s)}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${cat.color}`}>
                          <CatIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{s.title}</h3>
                            <Badge className={pri.color} variant="secondary">{pri.label}</Badge>
                            <Badge className={sta.color} variant="outline">{sta.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                          {s.expectedImpact && (
                            <p className="text-xs text-primary/70 mt-2 flex items-center gap-1">
                              <Target className="h-3 w-3" /> 预期影响: {s.expectedImpact}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {s.status === "pending" && (
                            <>
                              <Button size="sm" variant="ghost" className="text-green-500 hover:text-green-600" onClick={e => { e.stopPropagation(); updateStatus.mutate({ id: s.id, status: "accepted" }); }}>
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={e => { e.stopPropagation(); updateStatus.mutate({ id: s.id, status: "rejected" as any }); }}>
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Detail Dialog */}
          <SuggestionDetailDialog
            suggestion={selectedSuggestion}
            open={!!selectedSuggestion}
            onClose={() => setSelectedSuggestion(null)}
            onStatusChange={(id: number, status: string) => { updateStatus.mutate({ id, status: status as any }); }}
          />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof ListChecks; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-8 w-8 ${color}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SuggestionDetailDialog({ suggestion, open, onClose, onStatusChange }: {
  suggestion: any; open: boolean; onClose: () => void; onStatusChange: (id: number, status: string) => void;
}) {
  if (!suggestion) return null;
  const cat = categoryLabels[suggestion.category] || categoryLabels.content;
  const CatIcon = cat.icon;
  const sta = statusLabels[suggestion.status] || statusLabels.pending;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CatIcon className={`h-5 w-5 ${cat.color.split(" ")[1]}`} />
            {suggestion.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={sta.color} variant="outline">{sta.label}</Badge>
            <Badge className={priorityLabels[suggestion.priority]?.color} variant="secondary">
              {priorityLabels[suggestion.priority]?.label || suggestion.priority}
            </Badge>
            <Badge variant="outline">{cat.label}</Badge>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">问题描述</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{suggestion.description}</p>
          </div>
          {suggestion.actionItems && (
            <div>
              <h4 className="text-sm font-medium mb-1">执行步骤</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{suggestion.actionItems}</p>
            </div>
          )}
          {suggestion.expectedImpact && (
            <div>
              <h4 className="text-sm font-medium mb-1">预期影响</h4>
              <p className="text-sm text-primary/80">{suggestion.expectedImpact}</p>
            </div>
          )}
          {suggestion.dataEvidence && (
            <div>
              <h4 className="text-sm font-medium mb-1">数据依据</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{suggestion.dataEvidence}</p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          {suggestion.status === "pending" && (
            <>
              <Button variant="outline" className="text-red-500" onClick={() => { onStatusChange(suggestion.id, "rejected"); onClose(); }}>
                <XCircle className="h-4 w-4 mr-1" />拒绝
              </Button>
              <Button onClick={() => { onStatusChange(suggestion.id, "accepted"); onClose(); }}>
                <CheckCircle2 className="h-4 w-4 mr-1" />采纳
              </Button>
            </>
          )}
          {suggestion.status === "accepted" && (
            <Button onClick={() => { onStatusChange(suggestion.id, "implemented"); onClose(); }}>
              <CheckCircle2 className="h-4 w-4 mr-1" />标记已实施
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
