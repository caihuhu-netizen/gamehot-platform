import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useMemo } from "react";
import { Plus, FlaskConical, Play, Pause, Square, Eye, Beaker, TrendingUp, TrendingDown, Minus, Award, AlertTriangle, CheckCircle, XCircle, BarChart3, Zap, ArrowRight, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTableSelection } from "@/hooks/useTableSelection";
import BatchActionBar from "@/components/BatchActionBar";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";
const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "草稿", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", icon: Beaker },
  RUNNING: { label: "运行中", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300", icon: Play },
  PAUSED: { label: "已暂停", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300", icon: Pause },
  COMPLETED: { label: "已完成", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", icon: Square },
  GRADUATED: { label: "已全量", color: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300", icon: Award },
  ABORTED: { label: "已终止", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: XCircle },
};

const EXP_TYPES = [
  { value: "DIFFICULTY", label: "难度实验" },
  { value: "MONETIZE", label: "变现实验" },
  { value: "UI", label: "UI实验" },
  { value: "FEATURE", label: "功能实验" },
  { value: "PRICING", label: "定价实验" },
];

const METRIC_OPTIONS = [
  { value: "retention_d1", label: "次日留存率" },
  { value: "retention_d7", label: "7日留存率" },
  { value: "pay_rate", label: "付费率" },
  { value: "ad_watch_rate", label: "广告观看率" },
  { value: "level_pass_rate", label: "关卡通过率" },
  { value: "arpu", label: "ARPU" },
  { value: "session_time", label: "平均会话时长" },
];

export default function Experiments() {
  const { currentGameId } = useGame();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedExp, setSelectedExp] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const utils = trpc.useUtils();

  const { data: experiments, isLoading } = trpc.experiments.list.useQuery({ gameId: currentGameId ?? undefined });
  const { data: expDetail } = trpc.experiments.getById.useQuery(
    { id: selectedExp! },
    { enabled: !!selectedExp }
  );
  const { data: analysis } = trpc.experiments.getAnalysis.useQuery(
    { experimentId: selectedExp! },
    { enabled: !!selectedExp && activeTab === "analysis" }
  );
  const { data: graduationCheck } = trpc.experiments.checkGraduation.useQuery(
    { experimentId: selectedExp! },
    { enabled: !!selectedExp && activeTab === "analysis" }
  );
  const { data: allRunningChecks } = trpc.experiments.checkAllRunning.useQuery(
    undefined,
    { enabled: activeTab === "automation" }
  );

  const createExp = trpc.experiments.create.useMutation({
    onSuccess: () => { utils.experiments.list.invalidate(); setShowCreate(false); toast.success("实验创建成功"); },
    onError: (err: unknown) => toast.error((err as Error).message),
  });
  const transitionExp = trpc.experiments.transition.useMutation({
    onSuccess: (data: any) => {
      utils.experiments.list.invalidate();
      utils.experiments.getById.invalidate();
      utils.experiments.getAnalysis.invalidate();
      utils.experiments.checkGraduation.invalidate();
      utils.experiments.checkAllRunning.invalidate();
      if (data.success) toast.success(data.message);
      else toast.error(data.message);
    },
    onError: (err: unknown) => toast.error((err as Error).message),
  });
  const graduateExp = trpc.experiments.graduate.useMutation({
    onSuccess: (data: any) => {
      utils.experiments.list.invalidate();
      utils.experiments.getById.invalidate();
      utils.experiments.checkAllRunning.invalidate();
      if (data.success) toast.success("实验已全量推送！");
      else toast.error(data.message);
    },
    onError: (err: unknown) => toast.error((err as Error).message),
  });
  const createVariant = trpc.experiments.createVariant.useMutation({
    onSuccess: () => { utils.experiments.getById.invalidate(); toast.success("变体创建成功"); },
    onError: (err: unknown) => toast.error((err as Error).message),
  });

  const runningCount = experiments?.filter((e: any) => e.status === "RUNNING").length ?? 0;
  const draftCount = experiments?.filter((e: any) => e.status === "DRAFT").length ?? 0;
  const graduatedCount = experiments?.filter((e: any) => e.status === "GRADUATED").length ?? 0;

  // Batch selection
  const selection = useTableSelection((experiments || []) as { id: number }[]);

  const handleBatchStart = async () => {
    const drafts = selection.selectedItems.filter((e: any) => e.status === "DRAFT");
    if (drafts.length === 0) { toast.error("选中的实验中没有草稿状态的实验"); return; }
    let success = 0, fail = 0;
    for (const item of drafts) {
      try { await transitionExp.mutateAsync({ experimentId: item.id, targetStatus: "RUNNING" }); success++; } catch { fail++; }
    }
    toast.success(`批量启动完成: ${success} 成功${fail > 0 ? `, ${fail} 失败` : ""}`);
    selection.clear();
  };

  const handleBatchPause = async () => {
    const running = selection.selectedItems.filter((e: any) => e.status === "RUNNING");
    if (running.length === 0) { toast.error("选中的实验中没有运行中的实验"); return; }
    let success = 0, fail = 0;
    for (const item of running) {
      try { await transitionExp.mutateAsync({ experimentId: item.id, targetStatus: "PAUSED" }); success++; } catch { fail++; }
    }
    toast.success(`批量暂停完成: ${success} 成功${fail > 0 ? `, ${fail} 失败` : ""}`);
    selection.clear();
  };

  const handleBatchAbort = async () => {
    let success = 0, fail = 0;
    for (const item of selection.selectedItems) {
      try { await transitionExp.mutateAsync({ experimentId: item.id, targetStatus: "ABORTED" }); success++; } catch { fail++; }
    }
    toast.success(`批量终止完成: ${success} 成功${fail > 0 ? `, ${fail} 失败` : ""}`);
    selection.clear();
  };

  return (
    <div className="space-y-6">
      <CrossModuleLinks links={MODULE_LINKS.experiments} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">A/B 实验平台</h1>
          <p className="text-muted-foreground text-sm mt-1">创建实验 → 自动分析显著性 → 一键全量推送</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />新建实验</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>创建A/B实验</DialogTitle></DialogHeader>
            <ExperimentForm onSubmit={(data) => createExp.mutate(data)} loading={createExp.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <Play className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">运行中</p>
              <p className="text-xl font-bold">{runningCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Beaker className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">草稿</p>
              <p className="text-xl font-bold">{draftCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
              <Award className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">已全量</p>
              <p className="text-xl font-bold">{graduatedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">总实验数</p>
              <p className="text-xl font-bold">{experiments?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">实验列表</TabsTrigger>
          <TabsTrigger value="analysis" disabled={!selectedExp}>显著性分析</TabsTrigger>
          <TabsTrigger value="automation">自动化引擎</TabsTrigger>
        </TabsList>

        {/* Tab: Experiment List */}
        <TabsContent value="list" className="space-y-3">
          {/* Batch Action Bar */}
          {selection.hasSelection && (
            <BatchActionBar
              selectedCount={selection.selectedCount}
              totalCount={(experiments || []).length}
              onClear={selection.clear}
              actions={[
                {
                  label: "批量启动",
                  icon: <Play className="h-3 w-3" />,
                  needsConfirm: true,
                  confirmTitle: "批量启动实验",
                  confirmDescription: `将启动选中的 ${selection.selectedItems.filter((e: any) => e.status === "DRAFT").length} 个草稿实验。`,
                  onClick: handleBatchStart,
                },
                {
                  label: "批量暂停",
                  icon: <Pause className="h-3 w-3" />,
                  variant: "secondary",
                  needsConfirm: true,
                  confirmTitle: "批量暂停实验",
                  confirmDescription: `将暂停选中的 ${selection.selectedItems.filter((e: any) => e.status === "RUNNING").length} 个运行中实验。`,
                  onClick: handleBatchPause,
                },
                {
                  label: "批量终止",
                  icon: <Trash2 className="h-3 w-3" />,
                  variant: "destructive",
                  needsConfirm: true,
                  confirmTitle: "批量终止实验",
                  confirmDescription: `将终止选中的 ${selection.selectedCount} 个实验，此操作不可恢复。`,
                  onClick: handleBatchAbort,
                },
              ]}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">实验列表</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="table-responsive">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={selection.isAllSelected} onCheckedChange={() => selection.toggleAll()} aria-label="全选" />
                      </TableHead>
                      <TableHead>实验名称</TableHead>
                      <TableHead className="hidden sm:table-cell">类型</TableHead>
                      <TableHead className="hidden md:table-cell">流量</TableHead>
                      <TableHead className="hidden md:table-cell">主指标</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                        ))}</TableRow>
                      ))
                    ) : experiments?.length ? (
                      experiments.map((exp: any) => {
                        const status = STATUS_MAP[exp.status] || STATUS_MAP.DRAFT;
                        return (
                          <TableRow key={exp.id} className={`${selectedExp === exp.id ? "bg-accent" : ""} ${selection.isSelected(exp.id) ? "bg-primary/5" : ""}`}>
                            <TableCell>
                              <Checkbox checked={selection.isSelected(exp.id)} onCheckedChange={() => selection.toggle(exp.id)} aria-label={`选择 ${exp.experimentName}`} />
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="text-sm font-medium">{exp.experimentName}</span>
                                <span className="block text-[10px] text-muted-foreground font-mono sm:hidden">{exp.experimentCode}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="text-xs">{EXP_TYPES.find(t => t.value === exp.experimentType)?.label || exp.experimentType}</Badge></TableCell>
                            <TableCell className="hidden md:table-cell text-sm">{(Number(exp.trafficPercent) * 100).toFixed(0)}%</TableCell>
                            <TableCell className="hidden md:table-cell text-xs">{METRIC_OPTIONS.find(m => m.value === exp.primaryMetric)?.label || exp.primaryMetric}</TableCell>
                            <TableCell><Badge className={`${status.color} text-xs`}>{status.label}</Badge></TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedExp(exp.id); }}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => { setSelectedExp(exp.id); setActiveTab("analysis"); }}>
                                  <BarChart3 className="h-3 w-3 text-blue-600" />
                                </Button>
                                {exp.status === "DRAFT" && (
                                  <Button variant="ghost" size="sm" onClick={() => transitionExp.mutate({ experimentId: exp.id, targetStatus: "RUNNING" })}>
                                    <Play className="h-3 w-3 text-emerald-600" />
                                  </Button>
                                )}
                                {exp.status === "RUNNING" && (
                                  <Button variant="ghost" size="sm" onClick={() => transitionExp.mutate({ experimentId: exp.id, targetStatus: "PAUSED" })}>
                                    <Pause className="h-3 w-3 text-amber-600" />
                                  </Button>
                                )}
                                {exp.status === "PAUSED" && (
                                  <Button variant="ghost" size="sm" onClick={() => transitionExp.mutate({ experimentId: exp.id, targetStatus: "RUNNING" })}>
                                    <RotateCcw className="h-3 w-3 text-emerald-600" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">暂无实验</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>

            {/* Detail Panel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">实验详情</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedExp && expDetail ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground">实验名称</p>
                      <p className="text-sm font-medium">{expDetail.experimentName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">假设</p>
                      <p className="text-sm">{expDetail.hypothesis || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">主要指标</p>
                      <p className="text-sm">{METRIC_OPTIONS.find(m => m.value === expDetail.primaryMetric)?.label || expDetail.primaryMetric}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">变体列表</p>
                      {expDetail.variants?.length ? (
                        <div className="space-y-2">
                          {expDetail.variants.map((v: any) => (
                            <div key={v.id} className="p-2 rounded border text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{v.variantName}</span>
                                <Badge variant={v.isControl ? "default" : "outline"} className="text-xs">
                                  {v.isControl ? "对照组" : `${(Number(v.trafficPercent) * 100).toFixed(0)}%`}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">暂无变体</p>
                      )}
                      <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => {
                        createVariant.mutate({
                          experimentId: selectedExp,
                          variantCode: `V${(expDetail.variants?.length || 0) + 1}`,
                          variantName: `变体 ${(expDetail.variants?.length || 0) + 1}`,
                          trafficPercent: "0.50",
                        });
                      }}>
                        <Plus className="h-3 w-3 mr-1" />添加变体
                      </Button>
                    </div>

                    {/* Quick Actions */}
                    <div className="pt-2 border-t space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">快捷操作</p>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => setActiveTab("analysis")}>
                        <BarChart3 className="h-3 w-3 mr-1" />查看显著性分析
                      </Button>
                      {expDetail.status === "RUNNING" && (
                        <Button size="sm" variant="outline" className="w-full text-amber-600" onClick={() => transitionExp.mutate({ experimentId: selectedExp, targetStatus: "COMPLETED" })}>
                          <Square className="h-3 w-3 mr-1" />结束实验
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">选择一个实验查看详情</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Significance Analysis */}
        <TabsContent value="analysis">
          {selectedExp && analysis ? (
            <div className="space-y-4">
              {/* Experiment Header */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{expDetail?.experimentName}</h3>
                      <p className="text-sm text-muted-foreground">
                        运行 {analysis.daysRunning ?? 0} 天 | 总样本 {(analysis.totalSampleSize ?? 0).toLocaleString()} | 
                        主指标: {METRIC_OPTIONS.find(m => m.value === expDetail?.primaryMetric)?.label || expDetail?.primaryMetric}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {graduationCheck?.canGraduate && (
                        <Button onClick={() => graduateExp.mutate({ experimentId: selectedExp })} disabled={graduateExp.isPending} className="bg-violet-600 hover:bg-violet-700">
                          <Zap className="h-4 w-4 mr-1" />一键全量推送
                        </Button>
                      )}
                      {expDetail?.status === "RUNNING" && (
                        <Button variant="outline" onClick={() => transitionExp.mutate({ experimentId: selectedExp, targetStatus: "COMPLETED" })}>
                          <Square className="h-4 w-4 mr-1" />结束实验
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Significance Result */}
              {analysis.significance ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Z-Test Results */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Z检验显著性分析</CardTitle>
                      <CardDescription>双尾检验，显著性水平 α=0.05</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg border">
                          <p className="text-xs text-muted-foreground">Z 值</p>
                          <p className="text-xl font-bold font-mono">{analysis.significance.zScore.toFixed(4)}</p>
                        </div>
                        <div className="p-3 rounded-lg border">
                          <p className="text-xs text-muted-foreground">P 值</p>
                          <p className={`text-xl font-bold font-mono ${analysis.significance.pValue < 0.05 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {analysis.significance.pValue.toFixed(6)}
                          </p>
                        </div>
                      </div>

                      {/* Confidence Bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">置信度</span>
                          <span className="font-medium">{analysis.significance.confidenceLevel.toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min(100, analysis.significance.confidenceLevel)} className="h-2" />
                        <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                          <span>0%</span>
                          <span className="text-amber-500">|95%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Power */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">统计功效 (Power)</span>
                          <span className="font-medium">{(analysis.significance.currentPower * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={analysis.significance.currentPower * 100} className="h-2" />
                      </div>

                      {/* Significance Badge */}
                      <div className={`p-3 rounded-lg ${analysis.significance.isSignificant ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'} border`}>
                        <div className="flex items-center gap-2">
                          {analysis.significance.isSignificant ? (
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                          )}
                          <span className="text-sm font-medium">
                            {analysis.significance.isSignificant ? "已达到统计显著性" : "尚未达到统计显著性"}
                          </span>
                        </div>
                        <p className="text-xs mt-1 text-muted-foreground">
                          需要每组约 {(analysis.significance.requiredSampleSize ?? 0).toLocaleString()} 样本达到 80% 统计功效
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Variant Comparison */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">变体对比</CardTitle>
                      <CardDescription>对照组 vs 实验组指标对比</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Conversion Rate Comparison */}
                      <div className="space-y-3">
                        {analysis.variants.map((v: any) => (
                          <div key={v.variantId} className={`p-3 rounded-lg border ${v.isControl ? 'border-gray-300 dark:border-gray-600' : 'border-blue-300 dark:border-blue-600'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={v.isControl ? "secondary" : "default"} className="text-xs">
                                  {v.isControl ? "对照组" : "实验组"}
                                </Badge>
                                <span className="text-sm font-medium">{v.variantName}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">n={(v.sampleSize ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-muted-foreground">转化率</p>
                                <p className="text-lg font-bold">{((v.conversionRate ?? 0) * 100).toFixed(2)}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">转化数</p>
                                <p className="text-lg font-bold">{(v.conversions ?? 0).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Lift */}
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">绝对提升</span>
                          <span className={`text-sm font-bold ${analysis.significance.absoluteLift > 0 ? 'text-emerald-600' : analysis.significance.absoluteLift < 0 ? 'text-red-600' : ''}`}>
                            {analysis.significance.absoluteLift > 0 ? '+' : ''}{(analysis.significance.absoluteLift * 100).toFixed(2)}pp
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-muted-foreground">相对提升</span>
                          <span className={`text-sm font-bold flex items-center gap-1 ${analysis.significance.relativeLift > 0 ? 'text-emerald-600' : analysis.significance.relativeLift < 0 ? 'text-red-600' : ''}`}>
                            {analysis.significance.relativeLift > 0 ? <TrendingUp className="h-3 w-3" /> : analysis.significance.relativeLift < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {analysis.significance.relativeLift > 0 ? '+' : ''}{(analysis.significance.relativeLift * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div className="p-3 rounded-lg border border-dashed">
                        <p className="text-xs text-muted-foreground mb-1">AI 建议</p>
                        <p className="text-sm">{analysis.significance.recommendation}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">需要至少2个变体（1个对照组 + 1个实验组）才能进行显著性分析</p>
                  </CardContent>
                </Card>
              )}

              {/* Graduation Check */}
              {graduationCheck && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      自动全量判定
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`p-4 rounded-lg border ${
                      graduationCheck.recommendation === 'GRADUATE' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800' :
                      graduationCheck.recommendation === 'ABORT' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                      graduationCheck.recommendation === 'CONTINUE' ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' :
                      'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {graduationCheck.recommendation === 'GRADUATE' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                          {graduationCheck.recommendation === 'ABORT' && <XCircle className="h-5 w-5 text-red-600" />}
                          {graduationCheck.recommendation === 'CONTINUE' && <Play className="h-5 w-5 text-blue-600" />}
                          {graduationCheck.recommendation === 'REVIEW' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold">
                              {graduationCheck.recommendation === 'GRADUATE' ? '可以全量推送' :
                               graduationCheck.recommendation === 'ABORT' ? '建议终止实验' :
                               graduationCheck.recommendation === 'CONTINUE' ? '建议继续运行' : '需要人工审核'}
                            </span>
                            {graduationCheck.winningVariant && (
                              <Badge variant="outline" className="text-xs">胜出: {graduationCheck.winningVariant}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{graduationCheck.reason}</p>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>运行天数: {graduationCheck.daysRunning}</span>
                            <span>置信度: {(graduationCheck.confidence ?? 0).toFixed(1)}%</span>
                          </div>
                        </div>
                        {graduationCheck.canGraduate && (
                          <Button size="sm" onClick={() => graduateExp.mutate({ experimentId: selectedExp! })} disabled={graduateExp.isPending} className="bg-violet-600 hover:bg-violet-700">
                            <Zap className="h-3 w-3 mr-1" />{graduateExp.isPending ? "推送中..." : "一键全量"}
                          </Button>
                        )}
                        {graduationCheck.recommendation === 'ABORT' && (
                          <Button size="sm" variant="destructive" onClick={() => transitionExp.mutate({ experimentId: selectedExp!, targetStatus: "ABORTED" })}>
                            <XCircle className="h-3 w-3 mr-1" />终止实验
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">请先在实验列表中选择一个实验，然后点击分析图标</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Automation Engine */}
        <TabsContent value="automation">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  自动化引擎 - 运行中实验监控
                </CardTitle>
                <CardDescription>
                  自动检测所有运行中实验的显著性，满足条件时推荐全量推送
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allRunningChecks?.length ? (
                  <div className="space-y-3">
                    {allRunningChecks.map((check: any) => (
                      <div key={check.experimentId} className={`p-4 rounded-lg border ${
                        check.recommendation === 'GRADUATE' ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/50' :
                        check.recommendation === 'ABORT' ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/50' :
                        'border-border'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              {check.recommendation === 'GRADUATE' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                              {check.recommendation === 'ABORT' && <XCircle className="h-5 w-5 text-red-600" />}
                              {check.recommendation === 'CONTINUE' && <Play className="h-5 w-5 text-blue-600" />}
                              {check.recommendation === 'REVIEW' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{check.experimentName}</p>
                              <p className="text-xs text-muted-foreground">{check.reason}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right text-xs text-muted-foreground mr-2">
                              <p>运行 {check.daysRunning} 天</p>
                              <p>置信度 {(check.confidence ?? 0).toFixed(1)}%</p>
                            </div>
                            {check.canGraduate && (
                              <Button size="sm" onClick={() => graduateExp.mutate({ experimentId: check.experimentId })} disabled={graduateExp.isPending} className="bg-violet-600 hover:bg-violet-700">
                                <Zap className="h-3 w-3 mr-1" />全量推送
                              </Button>
                            )}
                            {check.recommendation === 'ABORT' && (
                              <Button size="sm" variant="destructive" onClick={() => transitionExp.mutate({ experimentId: check.experimentId, targetStatus: "ABORTED" })}>
                                终止
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => { setSelectedExp(check.experimentId); setActiveTab("analysis"); }}>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>暂无运行中的实验</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lifecycle State Machine Diagram */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">实验生命周期状态机</CardTitle>
                <CardDescription>实验从创建到全量推送的完整流程</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-2 flex-wrap py-4">
                  {[
                    { status: "DRAFT", next: "RUNNING" },
                    { status: "RUNNING", next: "COMPLETED" },
                    { status: "COMPLETED", next: "GRADUATED" },
                  ].map((step, idx) => {
                    const s = STATUS_MAP[step.status];
                    const n = STATUS_MAP[step.next];
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`px-3 py-1.5 rounded-lg ${s.color} text-xs font-medium`}>{s.label}</div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        {idx === 2 && <div className={`px-3 py-1.5 rounded-lg ${n.color} text-xs font-medium`}>{n.label}</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-2">
                  <span>任意阶段可 → <Badge variant="destructive" className="text-xs">终止</Badge></span>
                  <span>运行中可 → <Badge className="bg-amber-100 text-amber-800 text-xs">暂停</Badge> → 恢复运行</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExperimentForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    experimentCode: "", experimentName: "", experimentType: "DIFFICULTY",
    primaryMetric: "retention_d1", trafficPercent: "0.10", hypothesis: "",
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label>实验编码</Label><Input value={form.experimentCode} onChange={(e) => setForm({ ...form, experimentCode: e.target.value })} placeholder="EXP_001" /></div>
        <div><Label>实验名称</Label><Input value={form.experimentName} onChange={(e) => setForm({ ...form, experimentName: e.target.value })} placeholder="难度曲线优化" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label>实验类型</Label>
          <Select value={form.experimentType} onValueChange={(v) => setForm({ ...form, experimentType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EXP_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>主要指标</Label>
          <Select value={form.primaryMetric} onValueChange={(v) => setForm({ ...form, primaryMetric: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{METRIC_OPTIONS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>流量比例 (0-1)</Label><Input value={form.trafficPercent} onChange={(e) => setForm({ ...form, trafficPercent: e.target.value })} placeholder="0.10" /></div>
      <div><Label>实验假设</Label><Textarea value={form.hypothesis} onChange={(e) => setForm({ ...form, hypothesis: e.target.value })} placeholder="降低L5用户前10关难度可提升D1留存5%" rows={3} /></div>
      <Button onClick={() => onSubmit(form)} disabled={loading || !form.experimentCode || !form.experimentName} className="w-full">{loading ? "创建中..." : "创建实验"}</Button>
    </div>
  );
}
