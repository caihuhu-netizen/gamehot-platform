import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertTriangle, TrendingDown, TrendingUp, Users, Zap, DollarSign,
  Globe, ShieldAlert, Play, Loader2, ArrowUpRight, Flame, Activity
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from "recharts";

const riskColors = {
  high:   { bg: "bg-red-500/10",    text: "text-red-500",    badge: "bg-red-500 text-white",    bar: "#ef4444" },
  medium: { bg: "bg-amber-500/10",  text: "text-amber-500",  badge: "bg-amber-500 text-white",  bar: "#f59e0b" },
  low:    { bg: "bg-green-500/10",  text: "text-green-500",  badge: "bg-green-500 text-white",  bar: "#22c55e" },
};

const phaseLabels: Record<string, { label: string; color: string }> = {
  POWER_USER:  { label: "活跃大R",    color: "bg-blue-500 text-white" },
  ACTIVE:      { label: "活跃用户",   color: "bg-green-500/10 text-green-500" },
  AT_RISK:     { label: "预警用户",   color: "bg-amber-500/10 text-amber-500" },
  CHURN_RISK:  { label: "高危流失",   color: "bg-red-500/10 text-red-500" },
  CHURNED:     { label: "已流失",     color: "bg-gray-500/10 text-gray-400" },
  NEW:         { label: "新用户",     color: "bg-purple-500/10 text-purple-500" },
};

const regionNames: Record<string, string> = {
  CN: "中国", NA: "北美", EU: "欧洲", SEA: "东南亚", JP: "日本", KR: "韩国", OTHER: "其他",
};

function RiskScore({ score }: { score: number }) {
  const level = score >= 0.8 ? "high" : score >= 0.5 ? "medium" : "low";
  const c = riskColors[level];
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Progress value={score * 100} className="h-2" />
      </div>
      <span className={`text-sm font-bold ${c.text}`}>{(score * 100).toFixed(0)}%</span>
    </div>
  );
}

export default function ChurnPrediction() {
  const { currentGame } = useGame();
  const gameId = currentGame?.id;
  const [minRisk, setMinRisk] = useState("0.7");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [intervening, setIntervening] = useState(false);

  const overview = trpc.churn.overview.useQuery({ gameId }, { enabled: true });
  const highRisk = trpc.churn.highRiskUsers.useQuery(
    { gameId, minScore: parseFloat(minRisk), limit: 50 },
    { enabled: true }
  );
  const trend    = trpc.churn.riskTrend.useQuery({ gameId, days: 30 }, { enabled: true });
  const regions  = trpc.churn.regionRisk.useQuery({ gameId }, { enabled: true });
  const stats    = trpc.churn.interventionStats.useQuery({ gameId }, { enabled: true });

  const triggerIntervention = trpc.churn.triggerIntervention.useMutation({
    onSuccess: (data: any) => {
      toast.success(data?.message ?? "干预任务已创建");
      setSelectedUsers([]);
      setIntervening(false);
    },
    onError: (e: unknown) => { toast.error((e as Error).message); setIntervening(false); },
  });

  const ov = overview.data as any;
  const trendData = (trend.data ?? []) as any[];
  const regionData = (regions.data ?? []) as any[];
  const usersData  = (highRisk.data ?? []) as any[];
  const iStats = stats.data as any;

  const toggleUser = (uid: string) => {
    setSelectedUsers(prev =>
      prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]
    );
  };

  const doIntervention = (type: string) => {
    if (selectedUsers.length === 0) { toast.error("请先选择用户"); return; }
    setIntervening(true);
    triggerIntervention.mutate({ type, userIds: selectedUsers });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500" /> 流失预测与主动干预
          </h1>
          <p className="text-muted-foreground mt-1">基于行为信号预测高危用户，提前触发精准干预</p>
        </div>
        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">已选 {selectedUsers.length} 人</span>
            <Button size="sm" variant="outline" onClick={() => doIntervention("PUSH")} disabled={intervening}>
              {intervening ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
              推送召回
            </Button>
            <Button size="sm" onClick={() => doIntervention("COUPON")} disabled={intervening}>
              <DollarSign className="h-4 w-4 mr-1" />发券干预
            </Button>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">高危用户</p>
              <Flame className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-500">{ov?.highRisk ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">风险分 ≥ 80%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">中危用户</p>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-500">{ov?.mediumRisk ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">风险分 50~80%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">风险上升趋势</p>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-500">{ov?.trendRising ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">本周新增预警</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">预计流失LTV</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">${Number(ov?.atRiskLtv30d ?? 0).toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">高危用户30日LTV</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">干预回收率</p>
              <Activity className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-500">
              {iStats?.recoveryRate != null ? (iStats.recoveryRate * 100).toFixed(1) + '%' : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">已干预用户回流率</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">高危用户列表</TabsTrigger>
          <TabsTrigger value="trend">风险趋势</TabsTrigger>
          <TabsTrigger value="region">地区分布</TabsTrigger>
          <TabsTrigger value="phase">生命周期</TabsTrigger>
        </TabsList>

        {/* 高危用户列表 */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">风险阈值</span>
            <Select value={minRisk} onValueChange={setMinRisk}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">中危 ≥50%</SelectItem>
                <SelectItem value="0.7">高危 ≥70%</SelectItem>
                <SelectItem value="0.8">极高危 ≥80%</SelectItem>
              </SelectContent>
            </Select>
            {selectedUsers.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>
                取消全选
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {overview.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
            ) : usersData.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">暂无高危用户数据</CardContent></Card>
            ) : usersData.map((u: Record<string,unknown>) => {
              const selected = selectedUsers.includes(u.user_id);
              const riskLevel = u.churn_risk_score >= 0.8 ? "high" : u.churn_risk_score >= 0.5 ? "medium" : "low";
              const c = riskColors[riskLevel];
              const phase = phaseLabels[u.engagement_phase] ?? { label: u.engagement_phase, color: "bg-muted" };
              return (
                <Card
                  key={u.user_id}
                  className={`cursor-pointer transition-all ${selected ? "border-primary ring-1 ring-primary/20" : "hover:border-primary/30"}`}
                  onClick={() => toggleUser(u.user_id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${selected ? "bg-primary border-primary" : "border-muted-foreground/30"}`} />
                      {/* User ID + region */}
                      <div className="w-28 flex-shrink-0">
                        <p className="font-mono text-sm font-semibold">{u.user_id}</p>
                        <p className="text-xs text-muted-foreground">{u.country_code} · {regionNames[u.region_group_code] ?? u.region_group_code}</p>
                      </div>
                      {/* Risk Score */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">流失风险</span>
                          {u.churn_risk_trend === 'RISING' && <TrendingUp className="h-3 w-3 text-red-500" />}
                          {u.churn_risk_trend === 'DECLINING' && <TrendingDown className="h-3 w-3 text-green-500" />}
                        </div>
                        <RiskScore score={Number(u.churn_risk_score)} />
                      </div>
                      {/* Phase */}
                      <Badge className={phase.color} variant="secondary">{phase.label}</Badge>
                      {/* LTV */}
                      <div className="text-right w-24 flex-shrink-0">
                        <p className="text-sm font-semibold">${Number(u.total_pay_amount ?? 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">累计付费</p>
                      </div>
                      {/* Last active */}
                      <div className="text-right w-24 flex-shrink-0 hidden md:block">
                        <p className="text-xs text-muted-foreground">
                          {u.last_active_time ? new Date(u.last_active_time).toLocaleDateString("zh-CN") : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">最后活跃</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* 风险趋势 */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">过去30天风险用户趋势</CardTitle>
              <CardDescription>高危/中危用户数量变化与干预次数</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="highRisk" name="高危用户" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="mediumRisk" name="中危用户" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="interventions" name="干预次数" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 地区分布 */}
        <TabsContent value="region">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">各地区平均流失风险</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={regionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${(v*100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="region" tick={{ fontSize: 11 }}
                      tickFormatter={(v) => regionNames[v] ?? v} width={50} />
                    <Tooltip formatter={(v: any) => `${(v*100).toFixed(1)}%`} />
                    <Bar dataKey="avgRisk" name="平均风险分" radius={[0,4,4,0]}>
                      {regionData.map((_: any, i: number) => (
                        <Cell key={i} fill={["#ef4444","#f59e0b","#f97316","#8b5cf6","#06b6d4","#22c55e"][i % 6]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">各地区高危用户占比</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 pt-2">
                  {regionData.map((r: any, i: number) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{regionNames[r.region] ?? r.region}</span>
                        <span className="font-medium text-red-500">{r.highRiskPct}%</span>
                      </div>
                      <Progress value={Number(r.highRiskPct)} className="h-2" />
                      <p className="text-xs text-muted-foreground">{r.highRisk} / {r.total} 人</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 生命周期分布 */}
        <TabsContent value="phase">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {((ov?.phaseDistribution ?? []) as any[]).map((p: Record<string,unknown>) => {
              const label = phaseLabels[p.engagement_phase] ?? { label: p.engagement_phase, color: "bg-muted" };
              return (
                <Card key={p.engagement_phase}>
                  <CardContent className="p-5">
                    <Badge className={label.color} variant="secondary">{label.label}</Badge>
                    <p className="text-3xl font-bold mt-3">{p.cnt}</p>
                    <p className="text-xs text-muted-foreground mt-1">用户数</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
