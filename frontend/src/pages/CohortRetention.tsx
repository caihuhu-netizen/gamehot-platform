import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, } from "recharts";
import { CalendarDays, TrendingUp, Users, DollarSign, ArrowRight } from "lucide-react";
import { useMemo } from "react";
const RETENTION_COLORS = {
  d1: "#6366f1", d3: "#8b5cf6", d7: "#a78bfa", d14: "#f59e0b", d30: "#10b981",
};

const HEATMAP_COLORS = [
  "#fef2f2", "#fee2e2", "#fecaca", "#fca5a5", "#f87171",
  "#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d",
];

function getHeatmapColor(rate: number): string {
  if (rate <= 0) return "#f8fafc";
  return HEATMAP_COLORS[Math.min(Math.floor(rate / 10), 9)];
}
function getTextColor(rate: number): string {
  return rate > 40 ? "#ffffff" : "#1e293b";
}

function RetentionHeatmap() {
  const { currentGameId } = useGame();
  const { data: cohorts, isLoading } = trpc.analytics.cohortRetention.useQuery({ gameId: currentGameId ?? undefined });
  if (isLoading) return <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">加载中...</div>;
  const rows = (cohorts as unknown as unknown as Record<string, unknown>[]) || [];
  if (rows.length === 0) return <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">暂无 Cohort 数据</div>;

  const retentionDays = [
    { key: "d1_retained", label: "D1" }, { key: "d3_retained", label: "D3" },
    { key: "d7_retained", label: "D7" }, { key: "d14_retained", label: "D14" },
    { key: "d30_retained", label: "D30" },
  ];
  const avgRetention = retentionDays.map(d => {
    const validRows = (rows ?? []).filter((r: Record<string,unknown>) => Number(r.cohort_size) > 0);
    const avg = validRows.length > 0
      ? validRows.reduce((sum: number, r: any) => sum + (Number(r[d.key]) / Number(r.cohort_size)) * 100, 0) / validRows.length : 0;
    return { label: d.label, avg: avg.toFixed(1) };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {avgRetention.map((d, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="pt-3 pb-2 px-3 text-center">
              <p className="text-xs text-muted-foreground">{d.label} 平均留存</p>
              <p className="text-xl font-bold" style={{ color: Object.values(RETENTION_COLORS)[i] }}>{d.avg}%</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />Cohort 留存热力图
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-28">安装日期</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium w-16">用户数</th>
                  {retentionDays.map(d => (
                    <th key={d.key} className="text-center py-2 px-3 font-medium w-16" style={{ color: RETENTION_COLORS[d.label.toLowerCase() as keyof typeof RETENTION_COLORS] }}>{d.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((row: any, i: number) => {
                  const size = Number(row.cohort_size);
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium text-xs">{row.cohort_date}</td>
                      <td className="py-2 px-3 text-center text-xs font-semibold">{size}</td>
                      {retentionDays.map(d => {
                        const rate = size > 0 ? (Number(row[d.key]) / size) * 100 : 0;
                        return (
                          <td key={d.key} className="py-2 px-3 text-center text-xs font-semibold transition-colors"
                            style={{ backgroundColor: getHeatmapColor(rate), color: getTextColor(rate) }}>
                            {rate > 0 ? `${rate.toFixed(1)}%` : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-2 justify-end">
            <span className="text-xs text-muted-foreground">低</span>
            {HEATMAP_COLORS.map((c, i) => (<div key={i} className="w-5 h-3 rounded-sm" style={{ backgroundColor: c }} />))}
            <span className="text-xs text-muted-foreground">高</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RetentionTrendChart() {
  const { currentGameId } = useGame();
  const { data: cohorts, isLoading } = trpc.analytics.cohortRetention.useQuery({ gameId: currentGameId ?? undefined });
  if (isLoading) return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">加载中...</div>;
  const rows = ((cohorts as unknown as unknown as Record<string, unknown>[]) || []).slice(0, 14).reverse();
  const chartData = (rows ?? []).map((r: Record<string,unknown>) => {
    const size = Number(r.cohort_size) || 1;
    return {
      date: r.cohort_date?.slice(5) || "",
      D1: ((Number(r.d1_retained) / size) * 100).toFixed(1),
      D3: ((Number(r.d3_retained) / size) * 100).toFixed(1),
      D7: ((Number(r.d7_retained) / size) * 100).toFixed(1),
      D14: ((Number(r.d14_retained) / size) * 100).toFixed(1),
      D30: ((Number(r.d30_retained) / size) * 100).toFixed(1),
    };
  });
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />留存率趋势
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
            <Tooltip formatter={(v: any) => `${v}%`} />
            <Legend />
            <Line type="monotone" dataKey="D1" stroke={RETENTION_COLORS.d1} strokeWidth={2} dot={{ r: 3 }} name="D1留存" />
            <Line type="monotone" dataKey="D3" stroke={RETENTION_COLORS.d3} strokeWidth={2} dot={{ r: 3 }} name="D3留存" />
            <Line type="monotone" dataKey="D7" stroke={RETENTION_COLORS.d7} strokeWidth={2} dot={{ r: 3 }} name="D7留存" />
            <Line type="monotone" dataKey="D14" stroke={RETENTION_COLORS.d14} strokeWidth={2} dot={{ r: 3 }} name="D14留存" />
            <Line type="monotone" dataKey="D30" stroke={RETENTION_COLORS.d30} strokeWidth={2} dot={{ r: 3 }} name="D30留存" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function LTVCohortTab() {
  const { currentGameId } = useGame();
  const { data: ltvData, isLoading } = trpc.analytics.cohortLTV.useQuery({ gameId: currentGameId ?? undefined });
  if (isLoading) return <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">加载中...</div>;
  const rows = ((ltvData as unknown as unknown as Record<string, unknown>[]) || []).slice(0, 14).reverse();
  const chartData = (rows ?? []).map((r: Record<string,unknown>) => {
    const size = Number(r.cohort_size) || 1;
    return {
      date: r.cohort_date?.slice(5) || "",
      D1: (Number(r.ltv_d1) / size).toFixed(2),
      D7: (Number(r.ltv_d7) / size).toFixed(2),
      D30: (Number(r.ltv_d30) / size).toFixed(2),
    };
  });
  const allRows = (ltvData as unknown as unknown as Record<string, unknown>[]) || [];
  const totalSize = allRows.reduce((s: number, r: any) => s + Number(r.cohort_size || 0), 0) || 1;
  const avgLTV = {
    d1: (allRows.reduce((s: number, r: any) => s + Number(r.ltv_d1 || 0), 0) / totalSize).toFixed(3),
    d3: (allRows.reduce((s: number, r: any) => s + Number(r.ltv_d3 || 0), 0) / totalSize).toFixed(3),
    d7: (allRows.reduce((s: number, r: any) => s + Number(r.ltv_d7 || 0), 0) / totalSize).toFixed(3),
    d14: (allRows.reduce((s: number, r: any) => s + Number(r.ltv_d14 || 0), 0) / totalSize).toFixed(3),
    d30: (allRows.reduce((s: number, r: any) => s + Number(r.ltv_d30 || 0), 0) / totalSize).toFixed(3),
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(avgLTV).map(([key, val]) => (
          <Card key={key} className="border-none shadow-sm">
            <CardContent className="pt-3 pb-2 px-3 text-center">
              <p className="text-xs text-muted-foreground">{key.toUpperCase()} 平均 LTV</p>
              <p className="text-xl font-bold text-green-600">${val}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />Cohort LTV 趋势（每用户平均）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="$" />
              <Tooltip formatter={(v: any) => `$${v}`} />
              <Legend />
              <Bar dataKey="D1" fill={RETENTION_COLORS.d1} name="D1 LTV" radius={[2, 2, 0, 0]} />
              <Bar dataKey="D7" fill={RETENTION_COLORS.d7} name="D7 LTV" radius={[2, 2, 0, 0]} />
              <Bar dataKey="D30" fill={RETENTION_COLORS.d30} name="D30 LTV" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Cohort LTV 明细</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">安装日期</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">用户数</th>
                  <th className="text-center py-2 px-3 font-medium text-indigo-600">D1 LTV</th>
                  <th className="text-center py-2 px-3 font-medium text-purple-600">D3 LTV</th>
                  <th className="text-center py-2 px-3 font-medium text-violet-500">D7 LTV</th>
                  <th className="text-center py-2 px-3 font-medium text-amber-600">D14 LTV</th>
                  <th className="text-center py-2 px-3 font-medium text-emerald-600">D30 LTV</th>
                </tr>
              </thead>
              <tbody>
                {((ltvData as unknown as unknown as Record<string, unknown>[]) || []).slice(0, 20).map((r: any, i: number) => {
                  const size = Number(r.cohort_size) || 1;
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium text-xs">{r.cohort_date}</td>
                      <td className="py-2 px-3 text-center text-xs">{size}</td>
                      <td className="py-2 px-3 text-center text-xs font-semibold">${(Number(r.ltv_d1) / size).toFixed(3)}</td>
                      <td className="py-2 px-3 text-center text-xs font-semibold">${(Number(r.ltv_d3) / size).toFixed(3)}</td>
                      <td className="py-2 px-3 text-center text-xs font-semibold">${(Number(r.ltv_d7) / size).toFixed(3)}</td>
                      <td className="py-2 px-3 text-center text-xs font-semibold">${(Number(r.ltv_d14) / size).toFixed(3)}</td>
                      <td className="py-2 px-3 text-center text-xs font-semibold">${(Number(r.ltv_d30) / size).toFixed(3)}</td>
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

function LifecycleJourneyTab() {
  const { currentGameId } = useGame();
  const { data: lifecycle, isLoading } = trpc.analytics.lifecycleStages.useQuery({ gameId: currentGameId ?? undefined });
  const { data: bySegment } = trpc.analytics.lifecycleBySegment.useQuery({ gameId: currentGameId ?? undefined });
  if (isLoading) return <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">加载中...</div>;

  const stages = (lifecycle?.stages as unknown as unknown as Record<string, unknown>[]) || [];
  const funnel = lifecycle?.funnel || { totalUsers: 0, activeD7: 0, activeD30: 0, payingUsers: 0, repeatPayers: 0 };
  const phaseLabels: Record<string, string> = {
    new: "新用户", exploring: "探索期", engaged: "活跃期", paying: "付费期", loyal: "忠诚期", churning: "流失风险", churned: "已流失",
  };
  const phaseColors: Record<string, string> = {
    new: "#3b82f6", exploring: "#8b5cf6", engaged: "#10b981", paying: "#f59e0b", loyal: "#6366f1", churning: "#ef4444", churned: "#94a3b8",
  };
  const phaseIcons: Record<string, string> = {
    new: "\u{1F331}", exploring: "\u{1F50D}", engaged: "\u{1F3AE}", paying: "\u{1F4B0}", loyal: "\u{1F451}", churning: "\u{26A0}\u{FE0F}", churned: "\u{1F4A4}",
  };
  const journeySteps = [
    { name: "总注册用户", count: funnel.totalUsers, color: "#3b82f6" },
    { name: "30日活跃", count: funnel.activeD30, color: "#8b5cf6" },
    { name: "7日活跃", count: funnel.activeD7, color: "#10b981" },
    { name: "付费用户", count: funnel.payingUsers, color: "#f59e0b" },
    { name: "复购用户", count: funnel.repeatPayers, color: "#6366f1" },
  ];
  const maxCount = journeySteps[0]?.count || 1;
  const segmentPhaseData = (bySegment as unknown as unknown as Record<string, unknown>[]) || [];
  const allPhases = ["new", "exploring", "engaged", "paying", "loyal", "churning", "churned"];
  const allSegments = Array.from(new Set(segmentPhaseData.map((r: Record<string,unknown>) => r.segment_level))).sort();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {(stages ?? []).map((s: any, i: number) => {
          const phase = s.phase || "unknown";
          return (
            <Card key={i} className="border-none shadow-sm">
              <CardContent className="pt-3 pb-2 px-3 text-center">
                <div className="text-2xl mb-1">{phaseIcons[phase] || "?"}</div>
                <p className="text-xs text-muted-foreground">{phaseLabels[phase] || phase}</p>
                <p className="text-lg font-bold" style={{ color: phaseColors[phase] || "#64748b" }}>{Number(s.user_count).toLocaleString()}</p>
                <div className="mt-1 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">LTV ${Number(s.avg_ltv || 0).toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">流失率 {(Number(s.avg_churn_risk || 0) * 100).toFixed(0)}%</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />用户生命周期旅程漏斗
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-w-3xl mx-auto">
            {journeySteps.map((step, i) => {
              const width = Math.max(20, (step.count / maxCount) * 100);
              const convRate = i > 0 && journeySteps[i - 1].count > 0
                ? ((step.count / journeySteps[i - 1].count) * 100).toFixed(1) : null;
              return (
                <div key={i}>
                  {i > 0 && (
                    <div className="flex items-center justify-center py-1">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground ml-1">转化 {convRate}%</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0 text-right">{step.name}</span>
                    <div className="flex-1 relative">
                      <div className="h-10 rounded-lg flex items-center justify-between px-3 transition-all"
                        style={{ width: `${width}%`, backgroundColor: step.color, marginLeft: `${(100 - width) / 2}%` }}>
                        <span className="text-white text-xs font-semibold">{step.count.toLocaleString()}</span>
                        <span className="text-white/80 text-[10px]">{((step.count / maxCount) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      {allSegments.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">分层 x 生命周期阶段矩阵</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">分层</th>
                    {allPhases.map(p => (
                      <th key={p} className="text-center py-2 px-2 font-medium text-xs" style={{ color: phaseColors[p] }}>{phaseLabels[p] || p}</th>
                    ))}
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">平均LTV</th>
                  </tr>
                </thead>
                <tbody>
                  {allSegments.map((seg: string) => {
                    const segRows = segmentPhaseData.filter((r: Record<string,unknown>) => r.segment_level === seg);
                    const totalLTV = segRows.reduce((s: number, r: any) => s + Number(r.avg_ltv || 0) * Number(r.user_count || 0), 0);
                    const totalCount = segRows.reduce((s: number, r: any) => s + Number(r.user_count || 0), 0);
                    return (
                      <tr key={seg} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-3 font-semibold text-xs"><Badge variant="outline" className="text-xs">{seg}</Badge></td>
                        {allPhases.map(p => {
                          const row = segRows.find((r: any) => r.engagement_phase === p);
                          const count = Number(row?.user_count || 0);
                          return (
                            <td key={p} className="py-2 px-2 text-center text-xs">
                              {count > 0 ? <span className="font-semibold">{count}</span> : <span className="text-muted-foreground">-</span>}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center text-xs font-semibold text-green-600">
                          ${totalCount > 0 ? (totalLTV / totalCount).toFixed(2) : '0.00'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CohortRetention() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cohort 留存 & 生命周期</h1>
        <p className="text-muted-foreground text-sm mt-1">按安装日期分组的留存分析、LTV 队列追踪、用户生命周期旅程可视化</p>
      </div>
      <Tabs defaultValue="retention">
        <TabsList className="flex-wrap">
          <TabsTrigger value="retention">留存热力图</TabsTrigger>
          <TabsTrigger value="trend">留存趋势</TabsTrigger>
          <TabsTrigger value="ltv">LTV 队列</TabsTrigger>
          <TabsTrigger value="lifecycle">生命周期旅程</TabsTrigger>
        </TabsList>
        <TabsContent value="retention" className="mt-4"><RetentionHeatmap /></TabsContent>
        <TabsContent value="trend" className="mt-4"><RetentionTrendChart /></TabsContent>
        <TabsContent value="ltv" className="mt-4"><LTVCohortTab /></TabsContent>
        <TabsContent value="lifecycle" className="mt-4"><LifecycleJourneyTab /></TabsContent>
      </Tabs>
    </div>
  );
}
