import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Activity, PlusCircle, Loader2, Trash2, Play, BarChart3, GitBranch, ArrowRight, ArrowDown, Users, Calendar, TrendingDown, Repeat } from "lucide-react";
import { trpc } from "@/lib/trpc";
import CrossModuleLinks from "@/components/CrossModuleLinks";

const analysisTypeMap: Record<string, { label: string; icon: any }> = {
  funnel: { label: "漏斗分析", icon: ArrowRight },
  path: { label: "路径分析", icon: GitBranch },
  retention: { label: "留存分析", icon: BarChart3 },
  distribution: { label: "分布分析", icon: Activity },
};

export default function EventAnalysis() {
  const { currentGameId } = useGame();
  const utils = trpc.useUtils();
  const { data: events = [], isLoading: eventsLoading } = trpc.eventAnalysis.listEvents.useQuery({ gameId: currentGameId ?? undefined });
  const { data: configs = [], isLoading: configsLoading } = trpc.eventAnalysis.listConfigs.useQuery({ gameId: currentGameId ?? undefined });
  const { data: stats } = trpc.eventAnalysis.stats.useQuery({ gameId: currentGameId ?? undefined });

  const createEventMutation = trpc.eventAnalysis.createEvent.useMutation({
    onSuccess: () => { utils.eventAnalysis.listEvents.invalidate(); utils.eventAnalysis.stats.invalidate(); toast.success("事件创建成功"); setShowCreateEvent(false); resetEventForm(); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const deleteEventMutation = trpc.eventAnalysis.deleteEvent.useMutation({
    onSuccess: () => { utils.eventAnalysis.listEvents.invalidate(); utils.eventAnalysis.stats.invalidate(); toast.success("事件已删除"); },
  });
  const createConfigMutation = trpc.eventAnalysis.createConfig.useMutation({
    onSuccess: () => { utils.eventAnalysis.listConfigs.invalidate(); toast.success("分析配置创建成功"); setShowCreateConfig(false); resetConfigForm(); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const executeAnalysisMutation = trpc.eventAnalysis.executeAnalysis.useMutation({
    onSuccess: (data: any) => { setResultData(data.data); setShowResult(true); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const deleteConfigMutation = trpc.eventAnalysis.deleteConfig.useMutation({
    onSuccess: () => { utils.eventAnalysis.listConfigs.invalidate(); toast.success("配置已删除"); },
  });

  // Funnel analysis
  const funnelMutation = trpc.eventAnalysis.funnelAnalysis.useMutation({
    onSuccess: (data: any) => { setFunnelResult(data); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const [funnelSteps, setFunnelSteps] = useState<{ eventCode: string; eventName: string }[]>([]);
  const [funnelDateRange, setFunnelDateRange] = useState({ start: getDefaultDateStr(-30), end: getDefaultDateStr(0) });
  const [funnelResult, setFunnelResult] = useState<any>(null);

  // Retention analysis
  const retentionMutation = trpc.eventAnalysis.retentionAnalysis.useMutation({
    onSuccess: (data: any) => { setRetentionResult(data); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const [retStartEvent, setRetStartEvent] = useState("");
  const [retReturnEvent, setRetReturnEvent] = useState("");
  const [retDateRange, setRetDateRange] = useState({ start: getDefaultDateStr(-14), end: getDefaultDateStr(-1) });
  const [retentionDays, setRetentionDays] = useState([1, 3, 7, 14, 30]);
  const [retentionResult, setRetentionResult] = useState<any>(null);

  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateConfig, setShowCreateConfig] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  const [eventForm, setEventForm] = useState({ eventCode: "", eventName: "", category: "gameplay", description: "" });
  const [configForm, setConfigForm] = useState({ name: "", analysisType: "funnel" as "funnel" | "path" | "retention" | "distribution", eventIds: [] as number[] });

  const resetEventForm = () => setEventForm({ eventCode: "", eventName: "", category: "gameplay", description: "" });
  const resetConfigForm = () => setConfigForm({ name: "", analysisType: "funnel", eventIds: [] });

  const toggleEventId = (id: number) => {
    setConfigForm(prev => ({
      ...prev,
      eventIds: prev.eventIds.includes(id) ? prev.eventIds.filter(x => x !== id) : [...prev.eventIds, id],
    }));
  };

  const addFunnelStep = () => {
    setFunnelSteps(prev => [...prev, { eventCode: "", eventName: "" }]);
  };

  const removeFunnelStep = (index: number) => {
    setFunnelSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateFunnelStep = (index: number, eventCode: string) => {
    const event = events.find((e: any) => e.eventCode === eventCode);
    setFunnelSteps(prev => {
      const updated = [...prev];
      updated[index] = { eventCode, eventName: event?.eventName || eventCode };
      return updated;
    });
  };

  const handleFunnelAnalysis = () => {
    if (funnelSteps.length < 2) { toast.error("漏斗至少需要 2 个步骤"); return; }
    if (funnelSteps.some(s => !s.eventCode)) { toast.error("请为每个步骤选择事件"); return; }
    funnelMutation.mutate({
      steps: funnelSteps,
      dateRange: funnelDateRange,
      gameId: currentGameId ?? undefined,
    });
  };

  const handleRetentionAnalysis = () => {
    if (!retStartEvent) { toast.error("请选择起始事件"); return; }
    if (!retReturnEvent) { toast.error("请选择回访事件"); return; }
    retentionMutation.mutate({
      startEvent: retStartEvent,
      returnEvent: retReturnEvent,
      dateRange: retDateRange,
      retentionDays,
      gameId: currentGameId ?? undefined,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CrossModuleLinks links={[
        { label: "自定义报表", path: "/custom-report", description: "SQL 查询构建器" },
        { label: "用户画像", path: "/user-profiles", description: "用户行为分析" },
        { label: "用户分层", path: "/segments", description: "分层配置" },
      ]} />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">自定义事件</p><p className="text-2xl font-bold">{stats?.totalEvents || 0}</p></div><Activity className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">分析配置</p><p className="text-2xl font-bold">{stats?.totalConfigs || 0}</p></div><BarChart3 className="h-8 w-8 text-blue-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">活跃事件</p><p className="text-2xl font-bold">{stats?.activeEvents || 0}</p></div><Play className="h-8 w-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">总触发数</p><p className="text-2xl font-bold">{(stats?.totalTriggers || 0).toLocaleString()}</p></div><GitBranch className="h-8 w-8 text-yellow-500" /></div></CardContent></Card>
      </div>

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">事件管理</TabsTrigger>
          <TabsTrigger value="analysis">分析配置</TabsTrigger>
          <TabsTrigger value="funnel"><ArrowDown className="mr-1 h-3.5 w-3.5" />漏斗分析</TabsTrigger>
          <TabsTrigger value="retention"><Repeat className="mr-1 h-3.5 w-3.5" />留存分析</TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { resetEventForm(); setShowCreateEvent(true); }}><PlusCircle className="mr-2 h-4 w-4" />注册事件</Button>
          </div>
          {eventsLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : events.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <Activity className="mx-auto h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">暂无自定义事件</p>
              <p className="mt-1">注册自定义事件来追踪用户行为</p>
            </CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>事件代码</TableHead>
                    <TableHead>事件名称</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-sm">{e.eventCode}</TableCell>
                      <TableCell className="font-medium">{e.eventName}</TableCell>
                      <TableCell><Badge variant="outline">{e.category || "未分类"}</Badge></TableCell>
                      <TableCell><Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status === "active" ? "活跃" : "停用"}</Badge></TableCell>
                      <TableCell className="text-xs">{new Date(e.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" aria-label="删除" onClick={() => { if (confirm("确认删除?")) deleteEventMutation.mutate({ id: e.id }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Analysis Configs Tab */}
        <TabsContent value="analysis" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { resetConfigForm(); setShowCreateConfig(true); }} disabled={events.length === 0}>
              <PlusCircle className="mr-2 h-4 w-4" />创建分析
            </Button>
          </div>
          {configsLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : configs.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">暂无分析配置</p>
              <p className="mt-1">先注册事件，然后创建分析配置</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {configs.map((c: any) => {
                const aType = analysisTypeMap[c.analysisType] || analysisTypeMap.funnel;
                const Icon = aType.icon;
                return (
                  <Card key={c.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><Icon className="h-5 w-5" /><CardTitle className="text-lg">{c.name}</CardTitle></div>
                        <Badge variant="outline">{aType.label}</Badge>
                      </div>
                      <CardDescription>关联事件: {(c.eventIds as number[])?.length || 0} 个</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground mb-3">
                        创建于: {new Date(c.createdAt).toLocaleDateString()}
                        {c.lastRunAt && <span className="ml-3">上次运行: {new Date(c.lastRunAt).toLocaleString()}</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => executeAnalysisMutation.mutate({ id: c.id })} disabled={executeAnalysisMutation.isPending}>
                          {executeAnalysisMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                          运行分析
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm("确认删除?")) deleteConfigMutation.mutate({ id: c.id }); }}>
                          <Trash2 className="mr-1 h-3 w-3" />删除
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ==================== Funnel Analysis Tab ==================== */}
        <TabsContent value="funnel" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ArrowDown className="h-5 w-5 text-orange-500" />漏斗分析</CardTitle>
              <CardDescription>定义事件序列，分析用户在各步骤之间的转化率和流失率（如：注册 → 首次登录 → 完成新手引导 → 首次付费）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Range */}
              <div className="flex gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />开始日期</label>
                  <Input type="date" value={funnelDateRange.start} onChange={e => setFunnelDateRange(prev => ({ ...prev, start: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">结束日期</label>
                  <Input type="date" value={funnelDateRange.end} onChange={e => setFunnelDateRange(prev => ({ ...prev, end: e.target.value }))} />
                </div>
              </div>

              {/* Funnel Steps */}
              <div className="space-y-2">
                <label className="text-sm font-medium">漏斗步骤</label>
                {funnelSteps.map((step, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</div>
                    <Select value={step.eventCode} onValueChange={v => updateFunnelStep(i, v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="选择事件..." /></SelectTrigger>
                      <SelectContent>
                        {events.map((e: any) => (
                          <SelectItem key={e.eventCode} value={e.eventCode}>{e.eventName} ({e.eventCode})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" aria-label="删除" onClick={() => removeFunnelStep(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addFunnelStep} disabled={events.length === 0}>
                  <PlusCircle className="mr-1 h-3 w-3" />添加步骤
                </Button>
              </div>

              <Button onClick={handleFunnelAnalysis} disabled={funnelMutation.isPending || funnelSteps.length < 2}>
                {funnelMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                执行漏斗分析
              </Button>
            </CardContent>
          </Card>

          {/* Funnel Result */}
          {funnelResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">漏斗分析结果</CardTitle>
                  <Badge variant={funnelResult.overallConversion > 10 ? "default" : "destructive"}>
                    整体转化率: {funnelResult.overallConversion}%
                  </Badge>
                </div>
                <CardDescription>
                  {funnelResult.dateRange?.start} ~ {funnelResult.dateRange?.end} | {funnelResult.totalSteps} 个步骤
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Visual Funnel */}
                <div className="space-y-1 mb-6">
                  {funnelResult.steps?.map((step: any, i: number) => {
                    const maxUsers = funnelResult.steps[0]?.uniqueUsers || 1;
                    const widthPct = maxUsers > 0 ? Math.max((step.uniqueUsers / maxUsers) * 100, 5) : 5;
                    return (
                      <div key={i}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">{step.step}</div>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{step.eventName}</span>
                              <span className="text-muted-foreground">{step.uniqueUsers.toLocaleString()} 用户</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                              <div
                                className="h-full bg-primary/80 rounded-full flex items-center justify-end pr-2 text-xs text-primary-foreground font-medium transition-all"
                                style={{ width: `${widthPct}%` }}
                              >
                                {step.conversionRate}%
                              </div>
                            </div>
                          </div>
                        </div>
                        {i < funnelResult.steps.length - 1 && step.dropoffRate > 0 && (
                          <div className="ml-11 flex items-center gap-1 text-xs text-destructive py-0.5">
                            <TrendingDown className="h-3 w-3" />流失 {step.dropoffRate}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Data Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>步骤</TableHead>
                      <TableHead>事件</TableHead>
                      <TableHead className="text-right">独立用户</TableHead>
                      <TableHead className="text-right">总事件数</TableHead>
                      <TableHead className="text-right">转化率</TableHead>
                      <TableHead className="text-right">流失率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funnelResult.steps?.map((step: any) => (
                      <TableRow key={step.step}>
                        <TableCell className="font-bold">{step.step}</TableCell>
                        <TableCell>
                          <div className="font-medium">{step.eventName}</div>
                          <div className="text-xs text-muted-foreground font-mono">{step.eventCode}</div>
                        </TableCell>
                        <TableCell className="text-right">{step.uniqueUsers.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{step.totalEvents.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={step.conversionRate >= 50 ? "default" : step.conversionRate >= 20 ? "secondary" : "destructive"}>
                            {step.conversionRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{step.dropoffRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== Retention Analysis Tab ==================== */}
        <TabsContent value="retention" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Repeat className="h-5 w-5 text-blue-500" />留存分析</CardTitle>
              <CardDescription>选择起始事件和回访事件，按日期队列分析用户的 N 日留存率</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Range */}
              <div className="flex gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />开始日期</label>
                  <Input type="date" value={retDateRange.start} onChange={e => setRetDateRange(prev => ({ ...prev, start: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">结束日期</label>
                  <Input type="date" value={retDateRange.end} onChange={e => setRetDateRange(prev => ({ ...prev, end: e.target.value }))} />
                </div>
              </div>

              {/* Event Selection */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1"><Users className="h-3.5 w-3.5" />起始事件（新用户定义）</label>
                  <Select value={retStartEvent} onValueChange={setRetStartEvent}>
                    <SelectTrigger><SelectValue placeholder="选择起始事件..." /></SelectTrigger>
                    <SelectContent>
                      {events.map((e: any) => (
                        <SelectItem key={e.eventCode} value={e.eventCode}>{e.eventName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1"><Repeat className="h-3.5 w-3.5" />回访事件（留存定义）</label>
                  <Select value={retReturnEvent} onValueChange={setRetReturnEvent}>
                    <SelectTrigger><SelectValue placeholder="选择回访事件..." /></SelectTrigger>
                    <SelectContent>
                      {events.map((e: any) => (
                        <SelectItem key={e.eventCode} value={e.eventCode}>{e.eventName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Retention Days */}
              <div className="space-y-1">
                <label className="text-sm font-medium">留存天数</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 5, 7, 14, 30, 60, 90].map(d => (
                    <Badge
                      key={d}
                      variant={retentionDays.includes(d) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setRetentionDays(prev =>
                          prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b)
                        );
                      }}
                    >
                      D{d}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={handleRetentionAnalysis} disabled={retentionMutation.isPending || !retStartEvent || !retReturnEvent}>
                {retentionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                执行留存分析
              </Button>
            </CardContent>
          </Card>

          {/* Retention Result */}
          {retentionResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">留存分析结果</CardTitle>
                <CardDescription>
                  起始事件: {retentionResult.startEvent} | 回访事件: {retentionResult.returnEvent} |
                  {retentionResult.dateRange?.start} ~ {retentionResult.dateRange?.end}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Summary Cards */}
                {retentionResult.summary && (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                    {retentionResult.retentionDays?.map((day: number) => (
                      <Card key={day}>
                        <CardContent className="pt-4 text-center">
                          <p className="text-xs text-muted-foreground">D{day} 平均留存</p>
                          <p className={`text-xl font-bold ${
                            retentionResult.summary[day] >= 30 ? "text-green-500" :
                            retentionResult.summary[day] >= 15 ? "text-yellow-500" : "text-red-500"
                          }`}>
                            {retentionResult.summary[day]}%
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Retention Matrix */}
                {retentionResult.cohorts?.length > 0 && (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10">日期</TableHead>
                          <TableHead className="text-right">新增用户</TableHead>
                          {retentionResult.retentionDays?.map((day: number) => (
                            <TableHead key={day} className="text-center">D{day}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {retentionResult.cohorts.map((cohort: any) => (
                          <TableRow key={cohort.date}>
                            <TableCell className="sticky left-0 bg-background z-10 font-medium whitespace-nowrap">{cohort.date}</TableCell>
                            <TableCell className="text-right">{cohort.cohortSize.toLocaleString()}</TableCell>
                            {retentionResult.retentionDays?.map((day: number) => {
                              const ret = cohort.retention[day];
                              if (!ret || ret.rate < 0) return <TableCell key={day} className="text-center text-muted-foreground">-</TableCell>;
                              const rate = ret.rate;
                              const bgOpacity = Math.min(rate / 50, 1);
                              return (
                                <TableCell
                                  key={day}
                                  className="text-center text-xs font-medium"
                                  style={{
                                    backgroundColor: `oklch(0.7 0.15 145 / ${bgOpacity * 0.4})`,
                                  }}
                                >
                                  {rate}%
                                  <div className="text-[10px] text-muted-foreground">{ret.count}</div>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Event Dialog */}
      <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
        <DialogContent>
          <DialogHeader><DialogTitle>注册自定义事件</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">事件代码 *</label><Input placeholder="例如: level_complete" value={eventForm.eventCode} onChange={e => setEventForm({ ...eventForm, eventCode: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">事件名称 *</label><Input placeholder="例如: 关卡完成" value={eventForm.eventName} onChange={e => setEventForm({ ...eventForm, eventName: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">分类</label>
              <Select value={eventForm.category} onValueChange={v => setEventForm({ ...eventForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gameplay">游戏玩法</SelectItem>
                  <SelectItem value="monetization">变现</SelectItem>
                  <SelectItem value="social">社交</SelectItem>
                  <SelectItem value="system">系统</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">描述</label><Textarea placeholder="事件描述" rows={2} value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateEvent(false)}>取消</Button>
            <Button onClick={() => {
              if (!eventForm.eventCode || !eventForm.eventName) { toast.error("请填写事件代码和名称"); return; }
              createEventMutation.mutate(eventForm);
            }} disabled={createEventMutation.isPending}>{createEventMutation.isPending ? "创建中..." : "注册事件"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Analysis Config Dialog */}
      <Dialog open={showCreateConfig} onOpenChange={setShowCreateConfig}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>创建分析配置</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">分析名称 *</label><Input placeholder="例如: 新手引导漏斗" value={configForm.name} onChange={e => setConfigForm({ ...configForm, name: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">分析类型</label>
              <Select value={configForm.analysisType} onValueChange={(v: "funnel" | "path" | "retention" | "distribution") => setConfigForm({ ...configForm, analysisType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="funnel">漏斗分析</SelectItem>
                  <SelectItem value="path">路径分析</SelectItem>
                  <SelectItem value="retention">留存分析</SelectItem>
                  <SelectItem value="distribution">分布分析</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">选择事件 *</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
                {events.map((e: any) => (
                  <Badge key={e.id} variant={configForm.eventIds.includes(e.id) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleEventId(e.id)}>
                    {e.eventName}
                  </Badge>
                ))}
              </div>
              {events.length === 0 && <p className="text-sm text-muted-foreground">请先注册事件</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateConfig(false)}>取消</Button>
            <Button onClick={() => {
              if (!configForm.name) { toast.error("请输入分析名称"); return; }
              if (configForm.eventIds.length === 0) { toast.error("请至少选择一个事件"); return; }
              createConfigMutation.mutate({ ...configForm, config: {} });
            }} disabled={createConfigMutation.isPending}>{createConfigMutation.isPending ? "创建中..." : "创建分析"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>分析结果</DialogTitle></DialogHeader>
          {resultData ? (
            <div className="space-y-4">
              {resultData.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(resultData.summary).map(([key, val]: [string, any]) => (
                    <Card key={key}><CardContent className="pt-4 text-center">
                      <p className="text-sm text-muted-foreground">{key}</p>
                      <p className="text-xl font-bold">{typeof val === "number" ? val.toLocaleString() : String(val)}</p>
                    </CardContent></Card>
                  ))}
                </div>
              )}
              {resultData.steps && (
                <div className="space-y-2">
                  {resultData.steps.map((step: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{i + 1}</div>
                      <div className="flex-1">
                        <p className="font-medium">{step.eventName || step.name || `步骤 ${i + 1}`}</p>
                        <p className="text-sm text-muted-foreground">用户数: {(step.uniqueUsers || step.count || 0).toLocaleString()}</p>
                      </div>
                      {(step.conversionRate !== undefined) && <Badge variant="outline">{step.conversionRate}%</Badge>}
                    </div>
                  ))}
                </div>
              )}
              {resultData.type === "retention" && resultData.rates && (
                <div className="grid grid-cols-5 gap-3">
                  {resultData.periods?.map((p: string, i: number) => (
                    <Card key={p}><CardContent className="pt-4 text-center">
                      <p className="text-xs text-muted-foreground">{p}</p>
                      <p className="text-xl font-bold">{resultData.rates[i]}%</p>
                    </CardContent></Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">暂无数据</p>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setShowResult(false)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getDefaultDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
