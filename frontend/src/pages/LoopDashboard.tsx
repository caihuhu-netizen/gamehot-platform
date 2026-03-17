import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { fmtDate, fmtDateShort } from "@/lib/dateFormat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Eye, Brain, Gauge, Crosshair, Target, FlaskConical, Activity,
  Search, ChevronLeft, ChevronRight, Edit2, Save, ArrowUpDown, } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell, } from "recharts";

export default function LoopDashboard() {
  const { currentGameId } = useGame();
  const [activeTab, setActiveTab] = useState("behavior");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">闭环引擎管理</h1>
        <p className="text-muted-foreground text-sm mt-1">六步闭环各环节数据管理与分析</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="behavior" className="text-xs gap-1"><Eye className="h-3 w-3" />行为事件</TabsTrigger>
          <TabsTrigger value="labels" className="text-xs gap-1"><Brain className="h-3 w-3" />预测标签</TabsTrigger>
          <TabsTrigger value="difficulty" className="text-xs gap-1"><Gauge className="h-3 w-3" />难度映射</TabsTrigger>
          <TabsTrigger value="tracking" className="text-xs gap-1"><Crosshair className="h-3 w-3" />埋点监控</TabsTrigger>
          <TabsTrigger value="decisions" className="text-xs gap-1"><Target className="h-3 w-3" />决策追踪</TabsTrigger>
          <TabsTrigger value="links" className="text-xs gap-1"><FlaskConical className="h-3 w-3" />实验联动</TabsTrigger>
        </TabsList>

        <TabsContent value="behavior"><BehaviorEventsTab /></TabsContent>
        <TabsContent value="labels"><PredictiveLabelsTab /></TabsContent>
        <TabsContent value="difficulty"><DifficultyMappingTab /></TabsContent>
        <TabsContent value="tracking"><LevelTrackingTab /></TabsContent>
        <TabsContent value="decisions"><DecisionTracesTab /></TabsContent>
        <TabsContent value="links"><ExperimentLinksTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== Tab 1: Behavior Events ====================
function BehaviorEventsTab() {
  const { currentGameId } = useGame();
  const [userId, setUserId] = useState("");
  const [eventType, setEventType] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.loopEngine.listBehaviorEvents.useQuery({
    userId: userId || undefined,
    eventType: eventType || undefined,
    page,
    pageSize: 20,
    gameId: currentGameId ?? undefined,
  });
  const { data: stats } = trpc.loopEngine.behaviorEventStats.useQuery({ gameId: currentGameId ?? undefined });

  const eventColors: Record<string, string> = {
    LEVEL_START: "#6366f1", LEVEL_COMPLETE: "#10b981", LEVEL_FAIL: "#ef4444",
    AD_WATCH: "#f59e0b", PURCHASE: "#8b5cf6", SESSION_START: "#06b6d4",
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="按用户ID搜索..." value={userId} onChange={e => { setUserId(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={eventType} onValueChange={v => { setEventType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="事件类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="LEVEL_START">开始关卡</SelectItem>
            <SelectItem value="LEVEL_COMPLETE">完成关卡</SelectItem>
            <SelectItem value="LEVEL_FAIL">关卡失败</SelectItem>
            <SelectItem value="AD_WATCH">观看广告</SelectItem>
            <SelectItem value="PURCHASE">付费</SelectItem>
            <SelectItem value="SESSION_START">会话开始</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">事件类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.map((s: any) => ({ name: s.eventType, count: s.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="数量" radius={[4, 4, 0, 0]}>
                    {stats.map((s: any, i: number) => (
                      <Cell key={i} fill={eventColors[s.eventType] || "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">暂无事件统计数据</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">事件概览</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">{data?.total ?? 0}</div>
              <p className="text-xs text-muted-foreground">总事件数</p>
              <div className="space-y-1 mt-3">
                {(stats || []).slice(0, 5).map((s: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: eventColors[s.eventType] || "#94a3b8" }} />
                      {s.eventType}
                    </span>
                    <span className="text-muted-foreground">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">用户ID</th>
                <th className="pb-2 font-medium text-muted-foreground">事件类型</th>
                <th className="pb-2 font-medium text-muted-foreground">关卡</th>
                <th className="pb-2 font-medium text-muted-foreground">当时分层</th>
                <th className="pb-2 font-medium text-muted-foreground">会话ID</th>
                <th className="pb-2 font-medium text-muted-foreground">时间</th>
              </tr></thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">加载中...</td></tr>
                ) : (data?.data || []).length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">暂无事件数据</td></tr>
                ) : (data?.data || []).map((e: any) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{e.userId}</td>
                    <td className="py-2"><Badge variant="outline" style={{ borderColor: eventColors[e.eventType] || "#94a3b8", color: eventColors[e.eventType] || "#94a3b8" }}>{e.eventType}</Badge></td>
                    <td className="py-2">{e.levelCode || "-"}</td>
                    <td className="py-2">{e.segmentLayerAtEvent !== null ? `Layer ${e.segmentLayerAtEvent}` : "-"}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">{e.sessionId?.slice(0, 8) || "-"}</td>
                    <td className="py-2 text-muted-foreground text-xs">{e.createdAt ? new Date(e.createdAt).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && data.total > 20 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">共 {data.total} 条</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm flex items-center px-2">{page}</span>
                <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Tab 2: Predictive Labels ====================
function PredictiveLabelsTab() {
  const { currentGameId } = useGame();
  const [phase, setPhase] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.loopEngine.listPredictiveLabels.useQuery({ page, pageSize: 20, phase: phase || undefined,
  gameId: currentGameId ?? undefined,
});
  const { data: dist } = trpc.loopEngine.labelDistribution.useQuery({ gameId: currentGameId ?? undefined });

  const phaseColors: Record<string, string> = {
    NEW: "#6366f1", GROWING: "#10b981", MATURE: "#f59e0b", DECLINING: "#ef4444", CHURNED: "#94a3b8",
  };
  const phaseLabels: Record<string, string> = {
    NEW: "新用户", GROWING: "成长期", MATURE: "成熟期", DECLINING: "衰退期", CHURNED: "流失",
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3">
        <Select value={phase} onValueChange={v => { setPhase(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="生命周期阶段" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部阶段</SelectItem>
            <SelectItem value="NEW">新用户</SelectItem>
            <SelectItem value="GROWING">成长期</SelectItem>
            <SelectItem value="MATURE">成熟期</SelectItem>
            <SelectItem value="DECLINING">衰退期</SelectItem>
            <SelectItem value="CHURNED">流失</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">生命周期分布</CardTitle></CardHeader>
          <CardContent>
            {dist && dist.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dist.map((d: any) => ({ name: phaseLabels[d.engagementPhase] || d.engagementPhase, value: d.count, phase: d.engagementPhase }))} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {dist.map((d: any, i: number) => (
                      <Cell key={i} fill={phaseColors[d.engagementPhase] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">暂无分布数据</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">阶段统计</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(dist || []).map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: phaseColors[d.engagementPhase] || "#94a3b8" }} />
                    {phaseLabels[d.engagementPhase] || d.engagementPhase}
                  </span>
                  <div className="text-right">
                    <span className="font-semibold">{d.count}</span>
                    <span className="text-xs text-muted-foreground ml-2">付费{(Number(d.avgPayProb) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">用户ID</th>
                <th className="pb-2 font-medium text-muted-foreground">生命周期</th>
                <th className="pb-2 font-medium text-muted-foreground">付费概率</th>
                <th className="pb-2 font-medium text-muted-foreground">流失风险</th>
                <th className="pb-2 font-medium text-muted-foreground">活跃度</th>
                <th className="pb-2 font-medium text-muted-foreground">LTV(7d)</th>
                <th className="pb-2 font-medium text-muted-foreground">LTV(30d)</th>
                <th className="pb-2 font-medium text-muted-foreground">趋势</th>
              </tr></thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">加载中...</td></tr>
                ) : (data?.data || []).length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">暂无预测标签数据</td></tr>
                ) : (data?.data || []).map((l: any) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{l.userId}</td>
                    <td className="py-2"><Badge style={{ backgroundColor: phaseColors[l.engagementPhase] + "20", color: phaseColors[l.engagementPhase], border: "none" }}>{phaseLabels[l.engagementPhase] || l.engagementPhase}</Badge></td>
                    <td className="py-2">{(Number(l.payProbability) * 100).toFixed(1)}%</td>
                    <td className="py-2"><span style={{ color: Number(l.churnRiskScore) > 0.7 ? "#ef4444" : Number(l.churnRiskScore) > 0.4 ? "#f59e0b" : "#10b981" }}>{(Number(l.churnRiskScore) * 100).toFixed(1)}%</span></td>
                    <td className="py-2">{(Number(l.activityScore) * 100).toFixed(1)}%</td>
                    <td className="py-2">${Number(l.ltv7d).toFixed(2)}</td>
                    <td className="py-2">${Number(l.ltv30d).toFixed(2)}</td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-xs">
                        {l.churnRiskTrend === "RISING" ? "↑风险上升" : l.churnRiskTrend === "FALLING" ? "↓风险下降" : "→稳定"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && data.total > 20 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">共 {data.total} 条</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm flex items-center px-2">{page}</span>
                <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Tab 3: Difficulty Mapping ====================
function DifficultyMappingTab() {
  const { currentGameId } = useGame();
  const { data: mappings, isLoading } = trpc.loopEngine.listDifficultyMappings.useQuery({ gameId: currentGameId ?? undefined });
  const utils = trpc.useUtils();
  const updateMutation = trpc.loopEngine.updateDifficultyMapping.useMutation({
    onSuccess: () => { utils.loopEngine.listDifficultyMappings.invalidate(); toast.success("更新成功"); },
    onError: () => toast.error("更新失败"),
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  const handleEdit = (m: any) => {
    setEditId(m.id);
    setEditData({
      difficultyMultiplier: Number(m.difficultyMultiplier),
      maxConsecutiveFails: m.maxConsecutiveFails,
      failRecoveryReduction: Number(m.failRecoveryReduction),
      passStreakIncrease: Number(m.passStreakIncrease),
      hintBudget: m.hintBudget,
      itemBoostMultiplier: Number(m.itemBoostMultiplier),
    });
  };

  const handleSave = () => {
    if (editId === null) return;
    updateMutation.mutate({ id: editId, ...editData });
    setEditId(null);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">分层-难度映射配置（10层差异化）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">层级</th>
                <th className="pb-2 font-medium text-muted-foreground">层名称</th>
                <th className="pb-2 font-medium text-muted-foreground">难度系数</th>
                <th className="pb-2 font-medium text-muted-foreground">最大连败</th>
                <th className="pb-2 font-medium text-muted-foreground">失败降难</th>
                <th className="pb-2 font-medium text-muted-foreground">连胜加难</th>
                <th className="pb-2 font-medium text-muted-foreground">提示预算</th>
                <th className="pb-2 font-medium text-muted-foreground">道具加成</th>
                <th className="pb-2 font-medium text-muted-foreground">操作</th>
              </tr></thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">加载中...</td></tr>
                ) : (mappings || []).map((m: any) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2"><Badge variant="outline">Layer {m.layerId}</Badge></td>
                    <td className="py-2 font-medium">{m.layerName}</td>
                    {editId === m.id ? (
                      <>
                        <td className="py-2"><Input type="number" step="0.05" value={editData.difficultyMultiplier} onChange={e => setEditData({ ...editData, difficultyMultiplier: Number(e.target.value) })} className="w-20 h-7 text-xs" /></td>
                        <td className="py-2"><Input type="number" value={editData.maxConsecutiveFails} onChange={e => setEditData({ ...editData, maxConsecutiveFails: Number(e.target.value) })} className="w-16 h-7 text-xs" /></td>
                        <td className="py-2"><Input type="number" step="0.01" value={editData.failRecoveryReduction} onChange={e => setEditData({ ...editData, failRecoveryReduction: Number(e.target.value) })} className="w-20 h-7 text-xs" /></td>
                        <td className="py-2"><Input type="number" step="0.01" value={editData.passStreakIncrease} onChange={e => setEditData({ ...editData, passStreakIncrease: Number(e.target.value) })} className="w-20 h-7 text-xs" /></td>
                        <td className="py-2"><Input type="number" value={editData.hintBudget} onChange={e => setEditData({ ...editData, hintBudget: Number(e.target.value) })} className="w-16 h-7 text-xs" /></td>
                        <td className="py-2"><Input type="number" step="0.1" value={editData.itemBoostMultiplier} onChange={e => setEditData({ ...editData, itemBoostMultiplier: Number(e.target.value) })} className="w-20 h-7 text-xs" /></td>
                        <td className="py-2"><Button size="sm" variant="default" onClick={handleSave} className="h-7 text-xs"><Save className="h-3 w-3 mr-1" />保存</Button></td>
                      </>
                    ) : (
                      <>
                        <td className="py-2">{Number(m.difficultyMultiplier).toFixed(2)}x</td>
                        <td className="py-2">{m.maxConsecutiveFails}</td>
                        <td className="py-2">-{(Number(m.failRecoveryReduction) * 100).toFixed(0)}%</td>
                        <td className="py-2">+{(Number(m.passStreakIncrease) * 100).toFixed(0)}%</td>
                        <td className="py-2">{m.hintBudget}</td>
                        <td className="py-2">{Number(m.itemBoostMultiplier).toFixed(1)}x</td>
                        <td className="py-2"><Button size="sm" variant="ghost" onClick={() => handleEdit(m)} className="h-7 text-xs"><Edit2 className="h-3 w-3 mr-1" />编辑</Button></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">难度系数可视化</CardTitle></CardHeader>
        <CardContent>
          {mappings && mappings.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mappings.map((m: any) => ({
                name: `L${m.layerId}`,
                难度系数: Number(m.difficultyMultiplier),
                道具加成: Number(m.itemBoostMultiplier),
                提示预算: m.hintBudget / 5,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="难度系数" fill="#6366f1" radius={[2, 2, 0, 0]} />
                <Bar dataKey="道具加成" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="提示预算" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Tab 4: Level Event Tracking ====================
function LevelTrackingTab() {
  const { currentGameId } = useGame();
  const { data: events } = trpc.loopEngine.listLevelEvents.useQuery({});
  const { data: summary } = trpc.loopEngine.levelEventSummary.useQuery({ gameId: currentGameId ?? undefined });

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">关卡通过率排行</CardTitle></CardHeader>
          <CardContent>
            {summary && summary.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summary.map((s: any) => ({
                  name: s.levelCode,
                  通过率: Number(s.totalAttempts) > 0 ? (Number(s.totalPasses) / Number(s.totalAttempts) * 100) : 0,
                  尝试次数: Number(s.totalAttempts),
                })).sort((a: any, b: any) => a.通过率 - b.通过率).slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="通过率" name="通过率(%)" radius={[4, 4, 0, 0]}>
                    {summary.map((_: any, i: number) => (
                      <Cell key={i} fill={i < 5 ? "#ef4444" : i < 10 ? "#f59e0b" : "#10b981"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">暂无关卡统计数据</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">变现转化率 (按关卡)</CardTitle></CardHeader>
          <CardContent>
            {summary && summary.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summary.filter((s: any) => Number(s.totalMonetizeTriggers) > 0).map((s: any) => ({
                  name: s.levelCode,
                  触发次数: Number(s.totalMonetizeTriggers),
                  转化次数: Number(s.totalMonetizeConverts),
                  转化率: Number(s.totalMonetizeTriggers) > 0 ? (Number(s.totalMonetizeConverts) / Number(s.totalMonetizeTriggers) * 100) : 0,
                })).slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="触发次数" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="转化次数" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">暂无变现数据</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">每日关卡埋点数据</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">日期</th>
                <th className="pb-2 font-medium text-muted-foreground">关卡</th>
                <th className="pb-2 font-medium text-muted-foreground">尝试</th>
                <th className="pb-2 font-medium text-muted-foreground">通过</th>
                <th className="pb-2 font-medium text-muted-foreground">失败</th>
                <th className="pb-2 font-medium text-muted-foreground">通过率</th>
                <th className="pb-2 font-medium text-muted-foreground">平均步数</th>
                <th className="pb-2 font-medium text-muted-foreground">平均时长</th>
                <th className="pb-2 font-medium text-muted-foreground">提示使用率</th>
              </tr></thead>
              <tbody>
                {(events || []).length === 0 ? (
                  <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">暂无埋点数据</td></tr>
                ) : (events || []).slice(0, 20).map((e: any) => {
                  const passRate = e.totalAttempts > 0 ? (e.totalPasses / e.totalAttempts * 100) : 0;
                  return (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2 text-xs">{fmtDate(e.statDate)}</td>
                      <td className="py-2 font-medium">{e.levelCode}</td>
                      <td className="py-2">{e.totalAttempts}</td>
                      <td className="py-2 text-emerald-600">{e.totalPasses}</td>
                      <td className="py-2 text-red-500">{e.totalFails}</td>
                      <td className="py-2"><span style={{ color: passRate < 40 ? "#ef4444" : passRate < 60 ? "#f59e0b" : "#10b981" }}>{passRate.toFixed(1)}%</span></td>
                      <td className="py-2">{Number(e.avgMoves).toFixed(1)}</td>
                      <td className="py-2">{Number(e.avgDurationSeconds).toFixed(0)}s</td>
                      <td className="py-2">{(Number(e.hintUsageRate) * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Tab 5: Decision Traces ====================
function DecisionTracesTab() {
  const { currentGameId } = useGame();
  const [userId, setUserId] = useState("");
  const [result, setResult] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.loopEngine.listDecisionTraces.useQuery({
    userId: userId || undefined,
    result: result || undefined,
    page,
    pageSize: 20,
    gameId: currentGameId ?? undefined,
  });
  const { data: stats } = trpc.loopEngine.decisionTraceStats.useQuery({ gameId: currentGameId ?? undefined });
  const { data: funnel } = trpc.loopEngine.decisionFunnel.useQuery({ gameId: currentGameId ?? undefined });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="按用户ID搜索..." value={userId} onChange={e => { setUserId(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={result} onValueChange={v => { setResult(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="决策结果" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部结果</SelectItem>
            <SelectItem value="TRIGGERED">已触发</SelectItem>
            <SelectItem value="SUPPRESSED">被抑制</SelectItem>
            <SelectItem value="COOLDOWN">冷却中</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">决策结果分布</CardTitle></CardHeader>
          <CardContent>
            {stats && stats.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.map((s: any) => ({ name: s.decisionResult, value: s.count }))} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" nameKey="name" label>
                    {stats.map((_: any, i: number) => (
                      <Cell key={i} fill={["#10b981", "#ef4444", "#f59e0b", "#6366f1"][i % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">变现漏斗</CardTitle></CardHeader>
          <CardContent>
            {funnel && (funnel.triggered + funnel.suppressed) > 0 ? (
              <div className="space-y-2 pt-2">
                {[
                  { label: "决策总数", value: funnel.triggered + funnel.suppressed, color: "#6366f1" },
                  { label: "实际触发", value: funnel.triggered, color: "#8b5cf6" },
                  { label: "观看广告", value: funnel.watchedAd, color: "#10b981" },
                  { label: "完成付费", value: funnel.purchased, color: "#f59e0b" },
                ].map((item, i) => {
                  const maxVal = funnel.triggered + funnel.suppressed;
                  const pct = maxVal > 0 ? (item.value / maxVal * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{item.label}</span>
                        <span>{item.value} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-6 bg-muted rounded overflow-hidden">
                        <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">暂无漏斗数据</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">用户ID</th>
                <th className="pb-2 font-medium text-muted-foreground">规则</th>
                <th className="pb-2 font-medium text-muted-foreground">分层</th>
                <th className="pb-2 font-medium text-muted-foreground">付费概率</th>
                <th className="pb-2 font-medium text-muted-foreground">决策</th>
                <th className="pb-2 font-medium text-muted-foreground">弹窗</th>
                <th className="pb-2 font-medium text-muted-foreground">用户行为</th>
                <th className="pb-2 font-medium text-muted-foreground">收入</th>
                <th className="pb-2 font-medium text-muted-foreground">时间</th>
              </tr></thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">加载中...</td></tr>
                ) : (data?.data || []).length === 0 ? (
                  <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">暂无决策追踪数据</td></tr>
                ) : (data?.data || []).map((t: any) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{t.userId}</td>
                    <td className="py-2 text-xs">{t.ruleCode || "-"}</td>
                    <td className="py-2">{t.userLayer !== null ? `L${t.userLayer}` : "-"}</td>
                    <td className="py-2">{t.payProbability ? `${(Number(t.payProbability) * 100).toFixed(0)}%` : "-"}</td>
                    <td className="py-2">
                      <Badge variant={t.decisionResult === "TRIGGERED" ? "default" : "secondary"} className="text-xs">
                        {t.decisionResult}
                      </Badge>
                    </td>
                    <td className="py-2">{t.popupType || "-"}</td>
                    <td className="py-2">{t.userAction || "-"}</td>
                    <td className="py-2">{t.revenueAmount ? `$${Number(t.revenueAmount).toFixed(2)}` : "-"}</td>
                    <td className="py-2 text-xs text-muted-foreground">{t.createdAt ? new Date(t.createdAt).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && data.total > 20 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">共 {data.total} 条</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm flex items-center px-2">{page}</span>
                <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Tab 6: Experiment-Segment Links ====================
function ExperimentLinksTab() {
  const { currentGameId } = useGame();
  const { data: links, isLoading } = trpc.loopEngine.listExperimentLinks.useQuery({});
  const { data: healthTrend } = trpc.loopEngine.loopHealthTrend.useQuery({ days: 14,
  gameId: currentGameId ?? undefined,
});

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">闭环健康度趋势（14天）</CardTitle></CardHeader>
        <CardContent>
          {healthTrend && healthTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={[...healthTrend].reverse().map((h: any) => ({
                date: fmtDateShort(h.metricDate),
                健康度: Number(h.overallHealthScore),
                分层新鲜度: Number(h.segmentFreshness) * 100,
                触发精准率: Number(h.triggerPrecision) * 100,
                实验显著: h.experimentsWithSignificance,
                自动应用: h.autoAppliedCount,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="健康度" stroke="#6366f1" strokeWidth={2} />
                <Line type="monotone" dataKey="分层新鲜度" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="触发精准率" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">暂无趋势数据</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">实验-分层联动配置</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">实验ID</th>
                <th className="pb-2 font-medium text-muted-foreground">目标层级</th>
                <th className="pb-2 font-medium text-muted-foreground">参数类型</th>
                <th className="pb-2 font-medium text-muted-foreground">基线值</th>
                <th className="pb-2 font-medium text-muted-foreground">实验值</th>
                <th className="pb-2 font-medium text-muted-foreground">自动应用</th>
                <th className="pb-2 font-medium text-muted-foreground">显著性阈值</th>
                <th className="pb-2 font-medium text-muted-foreground">状态</th>
              </tr></thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">加载中...</td></tr>
                ) : (links || []).length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">暂无实验联动配置，可在A/B实验模块创建关联</td></tr>
                ) : (links || []).map((l: any) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2">#{l.experimentId}</td>
                    <td className="py-2">
                      {Array.isArray(l.targetLayerIds) ? l.targetLayerIds.map((id: number) => (
                        <Badge key={id} variant="outline" className="mr-1 text-xs">L{id}</Badge>
                      )) : "-"}
                    </td>
                    <td className="py-2">{l.parameterType}</td>
                    <td className="py-2 font-mono text-xs max-w-[120px] truncate" title={JSON.stringify(l.baselineValue, null, 2)}>
                      {typeof l.baselineValue === 'object' ? Object.entries(l.baselineValue || {}).map(([k, v]) => `${k}: ${v}`).join(', ') : String(l.baselineValue ?? '-')}
                    </td>
                    <td className="py-2 font-mono text-xs max-w-[120px] truncate" title={JSON.stringify(l.experimentValue, null, 2)}>
                      {typeof l.experimentValue === 'object' ? Object.entries(l.experimentValue || {}).map(([k, v]) => `${k}: ${v}`).join(', ') : String(l.experimentValue ?? '-')}
                    </td>
                    <td className="py-2">{l.autoApplyOnSuccess ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">自动</Badge> : <Badge variant="secondary" className="text-xs">手动</Badge>}</td>
                    <td className="py-2">{l.successThreshold ? `p < ${l.successThreshold}` : "-"}</td>
                    <td className="py-2">{l.appliedAt ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">已应用</Badge> : <Badge variant="outline" className="text-xs">等待中</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
