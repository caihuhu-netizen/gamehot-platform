import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, FlaskConical, TrendingUp, BarChart3, Activity,
  Brain, Target, Crosshair, CheckCircle2, AlertTriangle,
  Layers, Gauge, Zap, PieChart as PieChartIcon, ShieldCheck, Clock, ThumbsUp } from "lucide-react";
import { useLocation } from "wouter";
import { fmtDateShort } from "@/lib/dateFormat";
import { Button } from "@/components/ui/button";
import { lazy, Suspense, useState, useMemo } from "react";
import OnboardingTour, { useOnboarding } from "@/components/OnboardingTour";
import { DateRangePicker, toDateParams } from "@/components/DateRangePicker";
import { subDays } from "date-fns";
import { Maximize2, Loader2 } from "lucide-react";

const BigScreenDashboard = lazy(() => import("@/components/BigScreenDashboard"));
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";

import {
  KPICard, HealthMetricCard, AlertSummaryCard, DailyReportCard,
  LoopPipeline, QuickAccessGrid, GameBanner, getHealthColor,
} from "@/components/home";

const SEGMENT_COLORS: Record<string, string> = {
  L1: "#6366f1", L2: "#8b5cf6", L3: "#a78bfa",
  L4: "#c4b5fd", L5: "#ddd6fe", L6: "#ede9fe",
};
const SEGMENT_LABELS: Record<string, string> = {
  L1: "鲸鱼用户", L2: "海豚用户", L3: "小鱼用户",
  L4: "观望用户", L5: "新用户", L6: "流失风险",
};

export default function Home() {
  const { currentGameId, isAllGamesMode, currentGame, games } = useGame();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const dateParams = useMemo(() => toDateParams(dateRange), [dateRange]);
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery({ gameId: currentGameId ?? undefined, ...dateParams });
  const { data: timeline } = trpc.dashboard.revenueTimeline.useQuery({ days: 30, gameId: currentGameId ?? undefined, ...dateParams });
  const { data: enhanced } = trpc.loopEngine.enhancedDashboard.useQuery({ gameId: currentGameId ?? undefined, ...dateParams });
  const { data: profitData } = trpc.costProfit.getProfitAnalysis.useQuery({ gameId: currentGameId ?? undefined, ...dateParams });
  const { data: latestReport } = trpc.dailyReport.list.useQuery({ limit: 1 } as any);
  const { data: alertSummary } = trpc.alerts.dashboardSummary.useQuery({ gameId: currentGameId ?? undefined });
  const { data: approvalStats } = trpc.dashboard.approvalDashboard.useQuery({ gameId: currentGameId ?? undefined });
  const [, setLocation] = useLocation();

  const segmentData = stats?.segmentDistribution?.map((s: Record<string,unknown>) => ({
    name: SEGMENT_LABELS[s.segmentLevel] || s.segmentLevel,
    value: Number(s.count),
    level: s.segmentLevel,
  })) || [];

  const timelineData = (timeline || []).map((t: Record<string,unknown>) => ({
    date: fmtDateShort(t.statDate),
    revenue: Number(t.totalRevenue || 0),
    users: Number(t.uniqueUsers || 0),
  })).reverse();

  const totalUsers = stats?.totalUsers ?? 0;
  // Use profitData?.totalRevenue (IAP+Ad) for accurate revenue; fallback to stats.totalRevenue (game_users.totalPayAmount)
  const totalRevenue = profitData ? Number(profitData?.totalRevenue ?? 0) : Number(stats?.totalRevenue ?? 0);
  const arpu = totalUsers > 0 ? (totalRevenue / totalUsers).toFixed(2) : "0.00";

  const loopHealth = enhanced?.loopHealth;
  const healthScore = Number(loopHealth?.overallHealthScore ?? 0);
  const healthTrend = enhanced?.healthTrend || [];
  const funnel = enhanced?.decisionFunnel;
  const labelDist = enhanced?.labelDistribution || [];

  // Radar data for loop health dimensions
  const radarData = loopHealth ? [
    { dimension: "分层覆盖", value: Number(loopHealth?.segmentCoverage) * 100, fullMark: 100 },
    { dimension: "标签精度", value: Number(loopHealth?.labelAccuracy) * 100, fullMark: 100 },
    { dimension: "难度适配", value: Number(loopHealth?.difficultyAdaptRate) * 100, fullMark: 100 },
    { dimension: "埋点覆盖", value: Number(loopHealth?.eventTrackingRate) * 100, fullMark: 100 },
    { dimension: "触发精准", value: Number(loopHealth?.triggerPrecision) * 100, fullMark: 100 },
    { dimension: "实验覆盖", value: loopHealth?.activeExperiments > 0 ? Math.min(Number(loopHealth?.experimentsWithSignificance) / Number(loopHealth?.activeExperiments) * 100, 100) : 0, fullMark: 100 },
  ] : [];

  // Funnel data
  const funnelData = funnel ? [
    { name: "触发总数", value: funnel.triggered + funnel.suppressed, fill: "#6366f1" },
    { name: "实际弹出", value: funnel.triggered, fill: "#8b5cf6" },
    { name: "观看广告", value: funnel.watchedAd, fill: "#10b981" },
    { name: "完成付费", value: funnel.purchased, fill: "#f59e0b" },
  ] : [];

  const [showBigScreen, setShowBigScreen] = useState(false);
  const onboarding = useOnboarding();

  return (
    <div className="space-y-6">
      {onboarding.shouldShow && (
        <OnboardingTour onClose={() => { onboarding.dismiss(); }} />
      )}

      {showBigScreen && (
        <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}>
          <BigScreenDashboard onExit={() => setShowBigScreen(false)} />
        </Suspense>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">经营仪表盘</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">GAMEHOT CDP 六步闭环运营指标概览</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={(r) => setDateRange(r)} />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowBigScreen(true)}>
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">大屏模式</span>
          </Button>
          {loopHealth && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">闭环健康度</p>
                <p className="text-2xl font-bold" style={{ color: getHealthColor(healthScore) }}>
                  {healthScore.toFixed(1)}
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: getHealthColor(healthScore) + "20", color: getHealthColor(healthScore) }}>
                <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Banner */}
      <GameBanner isAllGamesMode={isAllGamesMode} currentGame={currentGame} games={games} />

      {/* Six-Step Loop Pipeline */}
      <LoopPipeline loopHealth={loopHealth} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="总用户数" value={totalUsers.toLocaleString()} icon={Users} color="text-blue-600" loading={isLoading} />
        <KPICard title="总收入" value={`$${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} icon={DollarSign} color="text-emerald-600" loading={isLoading} subtitle={profitData ? `IAP $${Number(profitData?.iapRevenue).toLocaleString(undefined, {maximumFractionDigits: 0})} + 广告 $${Number(profitData?.adRevenue).toLocaleString(undefined, {maximumFractionDigits: 0})}` : undefined} />
        <KPICard title="总成本" value={profitData ? `$${Number(profitData?.totalCost ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "--"} icon={PieChartIcon} color="text-red-500" loading={isLoading} />
        <KPICard title="净利润" value={profitData ? `$${Number(profitData?.profit ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "--"} icon={TrendingUp} color={Number(profitData?.profit ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"} loading={isLoading} subtitle={profitData?.margin != null ? `利润率 ${Number(profitData?.margin).toFixed(1)}%` : undefined} />
        <KPICard title="ARPU" value={`$${arpu}`} icon={DollarSign} color="text-violet-600" loading={isLoading} />
        <KPICard title="运行中实验" value={String(stats?.activeExperiments ?? 0)} icon={FlaskConical} color="text-orange-600" loading={isLoading} subtitle={`${stats?.activeMonetizeRules ?? 0} 条规则`} />
      </div>

      {/* Quick Access */}
      <QuickAccessGrid />

      {/* Alert Summary */}
      {alertSummary && <AlertSummaryCard alertSummary={alertSummary as any} onViewAll={() => setLocation('/anomaly-monitor')} />}

      {/* Latest Daily Report */}
      {latestReport && (latestReport as Record<string, unknown>[]).length > 0 && (
        <DailyReportCard report={(latestReport as unknown as Array<{ reportDate: string | Date; status: string; kpiSnapshot?: { dau?: number; arpdau?: number; revenue?: number; retention_d1?: number }; summary?: string }>)[0]} onViewAll={() => setLocation('/daily-report')} />
      )}

      {/* Loop Health Radar + Health Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              闭环六维健康度
            </CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="健康度" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">暂无闭环健康数据</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              闭环健康度趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={healthTrend.map((h: Record<string,unknown>) => ({
                  date: fmtDateShort(h.metricDate),
                  健康度: Number(h.overallHealthScore),
                  分层覆盖: Number(h.segmentCoverage) * 100,
                  触发精准: Number(h.triggerPrecision) * 100,
                  难度适配: Number(h.difficultyAdaptRate) * 100,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="健康度" stroke="#6366f1" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="分层覆盖" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                  <Line type="monotone" dataKey="触发精准" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                  <Line type="monotone" dataKey="难度适配" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">暂无趋势数据</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Decision Funnel + Label Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              变现决策漏斗
            </CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 && funnelData[0].value > 0 ? (
              <div className="space-y-3 pt-2">
                {funnelData.map((item, i) => {
                  const maxVal = funnelData[0].value;
                  const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">{item.value.toLocaleString()} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-8 rounded-md overflow-hidden bg-muted">
                        <div className="h-full rounded-md transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: item.fill }} />
                      </div>
                    </div>
                  );
                })}
                {funnel && funnel.suppressed > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t">
                    <AlertTriangle className="h-3 w-3" />
                    <span>被抑制: {funnel.suppressed.toLocaleString()} 次（冷却/条件不满足）</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                暂无决策数据，待变现触发产生记录后自动展示
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              预测标签分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {labelDist.length > 0 ? (
              <div className="space-y-3 pt-2">
                {labelDist.map((l: any, i: number) => {
                  const colors: Record<string, string> = {
                    NEW: "#6366f1", GROWING: "#10b981", MATURE: "#f59e0b",
                    DECLINING: "#ef4444", CHURNED: "#94a3b8",
                  };
                  const labels: Record<string, string> = {
                    NEW: "新用户", GROWING: "成长期", MATURE: "成熟期",
                    DECLINING: "衰退期", CHURNED: "流失",
                  };
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[l.engagementPhase] || "#94a3b8" }} />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{labels[l.engagementPhase] || l.engagementPhase}</span>
                          <span className="text-muted-foreground">{l.count} 人</span>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                          <span>付费概率: {(Number(l.avgPayProb) * 100).toFixed(1)}%</span>
                          <span>流失风险: {(Number(l.avgChurnRisk) * 100).toFixed(1)}%</span>
                          <span>活跃度: {(Number(l.avgActivity) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                暂无预测标签数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend + Segment Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              收入趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#colorRevenue)" strokeWidth={2} name="收入" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                暂无收入数据，待游戏用户产生行为后自动展示
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              用户分层分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {segmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={segmentData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {segmentData.map((entry: any, index: number) => (
                      <Cell key={index} fill={SEGMENT_COLORS[entry.level] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                暂无分层数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loop Health Detail Cards */}
      {loopHealth && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <HealthMetricCard label="分层覆盖率" value={Number(loopHealth?.segmentCoverage) * 100} icon={Layers} />
          <HealthMetricCard label="标签精度" value={Number(loopHealth?.labelAccuracy) * 100} icon={Brain} />
          <HealthMetricCard label="难度适配率" value={Number(loopHealth?.difficultyAdaptRate) * 100} icon={Gauge} />
          <HealthMetricCard label="通关率" value={Number(loopHealth?.avgPassRate) * 100} icon={CheckCircle2} />
          <HealthMetricCard label="触发精准率" value={Number(loopHealth?.triggerPrecision) * 100} icon={Target} />
          <HealthMetricCard label="触发召回率" value={Number(loopHealth?.triggerRecall) * 100} icon={Zap} />
        </div>
      )}

      {/* Approval Dashboard Stats */}
      {approvalStats && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            审批中心概览
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/auto-response-approval")}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">待审批</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">{approvalStats?.pendingCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">总审批数</span>
                </div>
                <p className="text-2xl font-bold">{approvalStats?.totalApprovals}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <ThumbsUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">通过率</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{approvalStats?.approvalRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs text-muted-foreground">平均审批时长</span>
                </div>
                <p className="text-2xl font-bold text-indigo-600">{approvalStats?.avgApprovalHours}<span className="text-sm font-normal text-muted-foreground">h</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-teal-500" />
                  <span className="text-xs text-muted-foreground">效果改善率</span>
                </div>
                <p className="text-2xl font-bold text-teal-600">{approvalStats?.improvementRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-violet-500" />
                  <span className="text-xs text-muted-foreground">操作类型</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(approvalStats?.typeDistribution || {}).map(([type, cnt]) => (
                    <span key={type} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {type === "create_experiment" ? "实验" : type === "adjust_difficulty" ? "难度" : type}: {cnt as number}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Approval Trend Chart */}
          {approvalStats?.trend && approvalStats?.trend.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  审批趋势（近14天）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={approvalStats?.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="total" name="总数" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                    <Area type="monotone" dataKey="approved" name="通过" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                    <Area type="monotone" dataKey="rejected" name="拒绝" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Status Distribution Bar */}
          <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-muted">
            {approvalStats?.totalApprovals > 0 && (
              <>
                {approvalStats?.statusDistribution.approved > 0 && (
                  <div className="bg-emerald-500 transition-all" style={{ width: `${(approvalStats?.statusDistribution.approved / approvalStats?.totalApprovals) * 100}%` }} title={`已通过: ${approvalStats?.statusDistribution.approved}`} />
                )}
                {approvalStats?.statusDistribution.auto_approved > 0 && (
                  <div className="bg-teal-400 transition-all" style={{ width: `${(approvalStats?.statusDistribution.auto_approved / approvalStats?.totalApprovals) * 100}%` }} title={`自动通过: ${approvalStats?.statusDistribution.auto_approved}`} />
                )}
                {approvalStats?.statusDistribution.pending > 0 && (
                  <div className="bg-amber-500 transition-all" style={{ width: `${(approvalStats?.statusDistribution.pending / approvalStats?.totalApprovals) * 100}%` }} title={`待审批: ${approvalStats?.statusDistribution.pending}`} />
                )}
                {approvalStats?.statusDistribution.rejected > 0 && (
                  <div className="bg-red-500 transition-all" style={{ width: `${(approvalStats?.statusDistribution.rejected / approvalStats?.totalApprovals) * 100}%` }} title={`已拒绝: ${approvalStats?.statusDistribution.rejected}`} />
                )}
                {approvalStats?.statusDistribution.expired > 0 && (
                  <div className="bg-gray-400 transition-all" style={{ width: `${(approvalStats?.statusDistribution.expired / approvalStats?.totalApprovals) * 100}%` }} title={`已过期: ${approvalStats?.statusDistribution.expired}`} />
                )}
              </>
            )}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />已通过</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />自动通过</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />待审批</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />已拒绝</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />已过期</span>
          </div>
        </div>
      )}
    </div>
  );
}
