import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, } from "recharts";
import { BarChart3, TrendingUp, Users, DollarSign, AlertTriangle, ArrowDown, ShieldAlert, Filter, Bell } from "lucide-react";
import { useMemo, useState } from "react";
import { fmtDate } from "@/lib/dateFormat";
const SEGMENT_COLORS: Record<string, string> = {
  L1: "#6366f1", L2: "#8b5cf6", L3: "#a78bfa", L4: "#f59e0b", L5: "#94a3b8", L6: "#ef4444",
};
const SEGMENT_LABELS: Record<string, string> = {
  L1: "鲸鱼", L2: "海豚", L3: "小鱼", L4: "观望", L5: "新用户", L6: "流失风险",
};

const FUNNEL_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#10b981"];

/* ======================== Paying vs Non-Paying Comparison ======================== */
function PayingComparisonTab() {
  const { currentGameId } = useGame();
  const { data: comparison, isLoading } = trpc.analytics.payingComparison.useQuery({ gameId: currentGameId ?? undefined });
  const { data: retention } = trpc.analytics.retentionComparison.useQuery({ days: 7,
  gameId: currentGameId ?? undefined,
});

  if (isLoading) return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">加载中...</div>;
  if (!comparison) return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>;

  const { paying, nonPaying } = comparison;

  // Summary cards data
  const totalUsers = (paying.userCount as number) + (nonPaying.userCount as number);
  const payingRate = totalUsers > 0 ? ((paying.userCount as number) / totalUsers * 100).toFixed(1) : '0';

  // Behavior comparison radar data
  const radarData = [
    {
      dim: "日均关卡",
      paying: Number(paying.behavior?.avgLevelAttempts || 0),
      nonPaying: Number(nonPaying.behavior?.avgLevelAttempts || 0),
    },
    {
      dim: "日均通关",
      paying: Number(paying.behavior?.avgLevelPasses || 0),
      nonPaying: Number(nonPaying.behavior?.avgLevelPasses || 0),
    },
    {
      dim: "日均广告",
      paying: Number(paying.behavior?.avgAdWatchCount || 0),
      nonPaying: Number(nonPaying.behavior?.avgAdWatchCount || 0),
    },
    {
      dim: "日均会话",
      paying: Number(paying.behavior?.avgSessionCount || 0),
      nonPaying: Number(nonPaying.behavior?.avgSessionCount || 0),
    },
    {
      dim: "日均时长(分)",
      paying: Number(paying.behavior?.avgPlayTime || 0) / 60,
      nonPaying: Number(nonPaying.behavior?.avgPlayTime || 0) / 60,
    },
  ];

  // Bar chart: segment distribution comparison
  const allLevels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
  const segmentCompare = allLevels.map(level => {
    const pSeg = paying.segments.find((s: any) => s.segmentLevel === level);
    const npSeg = nonPaying.segments.find((s: any) => s.segmentLevel === level);
    return {
      name: SEGMENT_LABELS[level] || level,
      付费用户: pSeg?.count ?? 0,
      非付费用户: npSeg?.count ?? 0,
    };
  });

  // Progress comparison
  const progressCompare = [
    {
      metric: "平均关卡数",
      paying: Number(paying.progress?.avgTotalLevels || 0).toFixed(0),
      nonPaying: Number(nonPaying.progress?.avgTotalLevels || 0).toFixed(0),
    },
    {
      metric: "平均难度",
      paying: Number(paying.progress?.avgDifficulty || 0).toFixed(2),
      nonPaying: Number(nonPaying.progress?.avgDifficulty || 0).toFixed(2),
    },
    {
      metric: "平均连败次数",
      paying: Number(paying.progress?.avgConsecutiveFails || 0).toFixed(1),
      nonPaying: Number(nonPaying.progress?.avgConsecutiveFails || 0).toFixed(1),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">付费用户数</p>
            <p className="text-2xl font-bold text-indigo-600">{(paying.userCount as number).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">占比 {payingRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">非付费用户数</p>
            <p className="text-2xl font-bold text-slate-600">{(nonPaying.userCount as number).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">占比 {(100 - Number(payingRate)).toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">付费用户ARPU</p>
            <p className="text-2xl font-bold text-green-600">${Number(paying.avgPayAmount || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">平均{Number(paying.avgPayCount || 0).toFixed(1)}次</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">7日留存率对比</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-indigo-600">{retention?.paying.rate.toFixed(1) ?? '-'}%</span>
              <span className="text-xs text-muted-foreground">vs</span>
              <span className="text-lg font-bold text-slate-500">{retention?.nonPaying.rate.toFixed(1) ?? '-'}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">付费 vs 非付费</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar: Behavior Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">行为对比雷达图</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                <Radar name="付费用户" dataKey="paying" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                <Radar name="非付费用户" dataKey="nonPaying" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar: Segment Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">分层分布对比</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={segmentCompare}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="付费用户" fill="#6366f1" radius={[2, 2, 0, 0]} />
                <Bar dataKey="非付费用户" fill="#94a3b8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Progress Comparison Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">关卡进度对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">指标</th>
                  <th className="text-center py-2 px-3 text-indigo-600 font-medium">付费用户</th>
                  <th className="text-center py-2 px-3 text-slate-500 font-medium">非付费用户</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">差异</th>
                </tr>
              </thead>
              <tbody>
                {progressCompare.map((row, i) => {
                  const diff = Number(row.paying) - Number(row.nonPaying);
                  const diffPct = Number(row.nonPaying) > 0 ? (diff / Number(row.nonPaying) * 100).toFixed(0) : '-';
                  return (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-3 font-medium">{row.metric}</td>
                      <td className="py-2 px-3 text-center text-indigo-600 font-semibold">{row.paying}</td>
                      <td className="py-2 px-3 text-center text-slate-500">{row.nonPaying}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-muted-foreground"}>
                          {diff > 0 ? '+' : ''}{diffPct}%
                        </span>
                      </td>
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

/* ======================== Payment Alerts Tab ======================== */
function PaymentAlertsTab() {
  const { currentGameId } = useGame();
  const { data: alerts, isLoading } = trpc.analytics.paymentAlerts.useQuery({ gameId: currentGameId ?? undefined });
  const sendAlert = trpc.analytics.sendPaymentAlert.useMutation({
    onSuccess: () => toast.success("告警通知已发送"),
    onError: () => toast.error("发送失败，请稍后重试"),
  });

  if (isLoading) return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">加载中...</div>;

  const refundAlerts = (alerts && 'refundAlerts' in alerts) ? alerts.refundAlerts : [];
  const freqAlerts = (alerts && 'frequencyDeclineAlerts' in alerts) ? alerts.frequencyDeclineAlerts : [];
  const totalAlerts = refundAlerts.length + freqAlerts.length;

  return (
    <div className="space-y-4">
      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className={totalAlerts > 0 ? "border-amber-300 bg-amber-50/50" : ""}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${totalAlerts > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-xs text-muted-foreground">活跃告警</p>
                <p className="text-2xl font-bold">{totalAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={refundAlerts.length > 0 ? "border-red-300 bg-red-50/50" : ""}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className={`h-5 w-5 ${refundAlerts.length > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-xs text-muted-foreground">退款告警</p>
                <p className="text-2xl font-bold">{refundAlerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={freqAlerts.length > 0 ? "border-orange-300 bg-orange-50/50" : ""}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <ArrowDown className={`h-5 w-5 ${freqAlerts.length > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-xs text-muted-foreground">频率骤降</p>
                <p className="text-2xl font-bold">{freqAlerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refund Alerts */}
      {refundAlerts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              高价值用户退款告警
              <Badge variant="destructive" className="ml-2">{refundAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {refundAlerts.map((alert: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{alert.userId}</p>
                      <p className="text-xs text-muted-foreground">
                        分层: <Badge variant="outline" className="text-[10px] px-1 py-0">{SEGMENT_LABELS[alert.segmentLevel] || alert.segmentLevel}</Badge>
                        {' '}· 退款 {alert.refundCount} 次 · 退款金额 ${Number(alert.totalRefunded).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => sendAlert.mutate({
                      alertType: 'REFUND',
                      userId: alert.userId,
                      details: `用户 ${alert.userId}（${SEGMENT_LABELS[alert.segmentLevel]}）在近7天内退款 ${alert.refundCount} 次，退款金额 $${Number(alert.totalRefunded).toFixed(2)}，请及时跟进。`,
                    })}
                    disabled={sendAlert.isPending}
                  >
                    <Bell className="h-3 w-3 mr-1" />推送通知
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frequency Decline Alerts */}
      {freqAlerts.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-orange-500" />
              付费频率骤降告警
              <Badge className="ml-2 bg-orange-100 text-orange-700 border-orange-200">{freqAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {freqAlerts.map((alert: any, i: number) => {
                const declineRate = alert.previousCount > 0
                  ? ((1 - alert.recentCount / alert.previousCount) * 100).toFixed(0)
                  : '100';
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-orange-100 bg-orange-50/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <ArrowDown className="h-4 w-4 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{alert.userId}</p>
                        <p className="text-xs text-muted-foreground">
                          前7天: {alert.previousCount}次 → 近7天: {alert.recentCount}次
                          <span className="text-red-500 font-medium ml-1">↓{declineRate}%</span>
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                      onClick={() => sendAlert.mutate({
                        alertType: 'FREQUENCY_DECLINE',
                        userId: alert.userId,
                        details: `用户 ${alert.userId} 付费频率骤降：前7天 ${alert.previousCount} 次 → 近7天 ${alert.recentCount} 次（下降 ${declineRate}%），请关注用户留存风险。`,
                      })}
                      disabled={sendAlert.isPending}
                    >
                      <Bell className="h-3 w-3 mr-1" />推送通知
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {totalAlerts === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-green-400" />
              <p className="text-sm font-medium">暂无活跃告警</p>
              <p className="text-xs mt-1">系统持续监控高价值用户（鲸鱼/海豚）的退款和付费频率变化</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ======================== Payment Funnel Tab ======================== */
function PaymentFunnelTab() {
  const { currentGameId } = useGame();
  const { data: funnel, isLoading } = trpc.analytics.paymentFunnel.useQuery({ gameId: currentGameId ?? undefined });

  if (isLoading) return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">加载中...</div>;
  if (!funnel) return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>;

  const steps = funnel.steps;
  const maxVal = steps[0]?.count || 1;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            付费路径漏斗：首次登录 → 首次付费 → 复购 → 大额付费 → 鲸鱼
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-2xl mx-auto">
            {steps.map((step, i) => {
              const width = Math.max(15, (step.count / maxVal) * 100);
              const convRate = i > 0 && steps[i - 1].count > 0
                ? ((step.count / steps[i - 1].count) * 100).toFixed(1)
                : null;
              const totalRate = i > 0
                ? ((step.count / maxVal) * 100).toFixed(1)
                : '100.0';
              return (
                <div key={i}>
                  {i > 0 && (
                    <div className="flex items-center justify-center py-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-px h-4 bg-border" />
                        <span>转化率 {convRate}%</span>
                        <div className="w-px h-4 bg-border" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 shrink-0 text-right">{step.name}</span>
                    <div className="flex-1 relative">
                      <div
                        className="h-10 rounded-lg transition-all flex items-center justify-end px-3"
                        style={{
                          width: `${width}%`,
                          backgroundColor: FUNNEL_COLORS[i] || '#6366f1',
                          marginLeft: `${(100 - width) / 2}%`,
                        }}
                      >
                        <span className="text-white text-xs font-semibold">{step.count.toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-14 shrink-0">{totalRate}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conversion Summary */}
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              {steps.length >= 2 && (
                <div>
                  <p className="text-xs text-muted-foreground">首付转化率</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {steps[0].count > 0 ? ((steps[1].count / steps[0].count) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              )}
              {steps.length >= 3 && (
                <div>
                  <p className="text-xs text-muted-foreground">复购率</p>
                  <p className="text-lg font-bold text-purple-600">
                    {steps[1].count > 0 ? ((steps[2].count / steps[1].count) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              )}
              {steps.length >= 4 && (
                <div>
                  <p className="text-xs text-muted-foreground">大额转化率</p>
                  <p className="text-lg font-bold text-violet-600">
                    {steps[2].count > 0 ? ((steps[3].count / steps[2].count) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              )}
              {steps.length >= 5 && (
                <div>
                  <p className="text-xs text-muted-foreground">鲸鱼转化率</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {steps[0].count > 0 ? ((steps[4].count / steps[0].count) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ======================== Original Tabs (preserved) ======================== */
function SegmentsTab({ stats }: { stats: any }) {
  const segmentDist = stats?.segmentDistribution || [];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />用户分层分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          {segmentDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={segmentDist.map((s: Record<string,unknown>) => ({ name: SEGMENT_LABELS[s.segmentLevel] || s.segmentLevel, value: Number(s.count), level: s.segmentLevel }))} cx="50%" cy="50%" innerRadius={60} outerRadius={110} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {segmentDist.map((s: any, i: number) => (
                    <Cell key={i} fill={SEGMENT_COLORS[s.segmentLevel] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">分层四维评分对比</CardTitle>
        </CardHeader>
        <CardContent>
          {segmentDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={segmentDist.map((s: Record<string,unknown>) => ({
                name: SEGMENT_LABELS[s.segmentLevel] || s.segmentLevel,
                付费: Number(s.avgPayScore || 0),
                广告: Number(s.avgAdScore || 0),
                技能: Number(s.avgSkillScore || 0),
                流失: Number(s.avgChurnRisk || 0),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="付费" fill="#6366f1" radius={[2, 2, 0, 0]} />
                <Bar dataKey="广告" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="技能" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                <Bar dataKey="流失" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MonetizeTab({ timelineData }: { timelineData: any[] }) {
  const funnelData = [
    { name: "触发展示", value: 10000, fill: "#6366f1" },
    { name: "用户点击", value: 4500, fill: "#8b5cf6" },
    { name: "开始观看", value: 3200, fill: "#a78bfa" },
    { name: "完成观看", value: 2800, fill: "#c4b5fd" },
    { name: "成功转化", value: 1200, fill: "#10b981" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />变现转化漏斗
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelData.map((item, i) => {
              const maxVal = funnelData[0].value;
              const width = (item.value / maxVal) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">{item.name}</span>
                  <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
                    <div className="h-full rounded-md transition-all" style={{ width: `${width}%`, backgroundColor: item.fill }} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">{item.value.toLocaleString()}</span>
                  </div>
                  {i > 0 && (
                    <span className="text-xs text-muted-foreground w-12 text-right">{((item.value / funnelData[i - 1].value) * 100).toFixed(0)}%</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">总转化率: {((funnelData[funnelData.length - 1].value / funnelData[0].value) * 100).toFixed(1)}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">收入趋势</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#colorRev)" strokeWidth={2} name="收入" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DifficultyTab() {
  const [difficultyData] = useState(() =>
    Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${(i + 1) * 10}`,
      count: Math.floor(Math.random() * 50 + 10),
      passRate: Math.max(0.3, 1 - i * 0.07 + Math.random() * 0.1),
    }))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">难度分分布</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={difficultyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="关卡数" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">难度-通过率曲线</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={difficultyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
              <Line type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="通过率" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function TrendsTab({ timelineData }: { timelineData: any[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">活跃用户趋势</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorUsers2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#10b981" fill="url(#colorUsers2)" strokeWidth={2} name="活跃用户" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">会话数趋势</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="sessions" stroke="#f59e0b" fill="url(#colorSessions)" strokeWidth={2} name="会话数" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ======================== Main Analytics Page ======================== */
export default function Analytics() {
  const { currentGameId } = useGame();
  const { data: stats } = trpc.dashboard.stats.useQuery({ gameId: currentGameId ?? undefined });
  const { data: timeline } = trpc.dashboard.revenueTimeline.useQuery({ days: 30,
  gameId: currentGameId ?? undefined,
});

  const timelineData = useMemo(() =>
    (timeline || []).map((t: Record<string,unknown>) => ({
      date: fmtDate(t.statDate),
      revenue: Number(t.totalRevenue || 0),
      users: Number(t.uniqueUsers || 0),
      sessions: Number(t.totalSessions || 0),
    })).reverse()
  , [timeline]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">数据分析</h1>
        <p className="text-muted-foreground text-sm mt-1">分层统计、付费分群对比、付费预警、付费漏斗、变现分析</p>
      </div>

      <Tabs defaultValue="paying-compare">
        <TabsList className="flex-wrap">
          <TabsTrigger value="paying-compare">付费分群对比</TabsTrigger>
          <TabsTrigger value="payment-alerts">付费预警</TabsTrigger>
          <TabsTrigger value="payment-funnel">付费漏斗</TabsTrigger>
          <TabsTrigger value="segments">分层统计</TabsTrigger>
          <TabsTrigger value="monetize">变现漏斗</TabsTrigger>
          <TabsTrigger value="difficulty">难度分析</TabsTrigger>
          <TabsTrigger value="trends">行为趋势</TabsTrigger>
        </TabsList>

        <TabsContent value="paying-compare" className="mt-4">
          <PayingComparisonTab />
        </TabsContent>

        <TabsContent value="payment-alerts" className="mt-4">
          <PaymentAlertsTab />
        </TabsContent>

        <TabsContent value="payment-funnel" className="mt-4">
          <PaymentFunnelTab />
        </TabsContent>

        <TabsContent value="segments" className="mt-4">
          <SegmentsTab stats={stats} />
        </TabsContent>

        <TabsContent value="monetize" className="mt-4">
          <MonetizeTab timelineData={timelineData} />
        </TabsContent>

        <TabsContent value="difficulty" className="mt-4">
          <DifficultyTab />
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <TrendsTab timelineData={timelineData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
