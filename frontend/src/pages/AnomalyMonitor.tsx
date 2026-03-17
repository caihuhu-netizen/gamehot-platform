import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Clock, Bell, TrendingDown, TrendingUp,
  DollarSign, Users, BarChart3, Shield, RefreshCw, Eye, } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useState, useMemo } from "react";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";
const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  critical: { color: "#ef4444", bg: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800", icon: AlertTriangle },
  warning: { color: "#f59e0b", bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800", icon: Bell },
  info: { color: "#3b82f6", bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800", icon: Eye },
};

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  revenue_drop: { label: "收入下降", icon: TrendingDown, color: "#ef4444" },
  revenue_spike: { label: "收入异常上升", icon: TrendingUp, color: "#f59e0b" },
  retention_drop: { label: "留存下降", icon: Users, color: "#8b5cf6" },
  cpi_spike: { label: "CPI异常", icon: DollarSign, color: "#ec4899" },
  fill_rate_drop: { label: "填充率下降", icon: BarChart3, color: "#6366f1" },
};

const PIE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"];

export default function AnomalyMonitor() {
  const { currentGameId } = useGame();
  const [filter, setFilter] = useState<string>("all");
  const { data: alerts = [], isLoading, refetch } = trpc.alerts.list.useQuery({ limit: 50,
  gameId: currentGameId ?? undefined,
});
  const { data: stats } = trpc.alerts.stats.useQuery({ gameId: currentGameId ?? undefined });
  const runDetection = trpc.alerts.runDetection.useMutation({
    onSuccess: (result) => {
      toast.success(`检测完成，发现 ${result.alertsCreated} 个异常`);
      refetch();
    },
    onError: () => toast.error("检测失败"),
  });
  const acknowledgeMut = trpc.alerts.acknowledge.useMutation({
    onSuccess: () => { toast.success("已确认"); refetch(); },
  });
  const resolveMut = trpc.alerts.resolve.useMutation({
    onSuccess: () => { toast.success("已解决"); refetch(); },
  });

  const filteredAlerts = useMemo(() => {
    const list = alerts as unknown as unknown as Record<string, unknown>[];
    if (filter === "all") return list;
    return list.filter((a: any) => (a.alert_type || a.alertType) === filter);
  }, [alerts, filter]);

  const severityPie = useMemo(() => {
    if (!stats?.bySeverity) return [];
    return (stats.bySeverity as unknown as unknown as Record<string, unknown>[]).map((s: any) => ({
      name: s.severity === "critical" ? "严重" : s.severity === "warning" ? "警告" : "信息",
      value: Number(s.count),
    }));
  }, [stats]);

  const typePie = useMemo(() => {
    if (!stats?.byType) return [];
    return (stats.byType as unknown as unknown as Record<string, unknown>[]).map((t: any) => ({
      name: TYPE_CONFIG[t.alert_type]?.label || t.alert_type,
      value: Number(t.count),
    }));
  }, [stats]);

  return (
    <div className="space-y-4">
      <CrossModuleLinks links={MODULE_LINKS.anomalyMonitor} />
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-xs text-muted-foreground">活跃告警</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats?.active || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">已确认</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats?.acknowledged || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground">已解决</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats?.resolved || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-500" />
              <p className="text-xs text-muted-foreground">总告警</p>
            </div>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => runDetection.mutate({ gameId: 1 })} disabled={runDetection.isPending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${runDetection.isPending ? 'animate-spin' : ''}`} />
          运行异常检测
        </Button>
        <div className="flex gap-1 ml-auto">
          <Badge variant={filter === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilter("all")}>全部</Badge>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <Badge key={key} variant={filter === key ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilter(key)}>
              {cfg.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Charts */}
      {(severityPie.length > 0 || typePie.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {severityPie.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">按严重程度</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={severityPie} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {severityPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {typePie.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">按异常类型</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={typePie} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Alert List */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">告警列表</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>暂无告警</p><p className="text-xs mt-1">系统运行正常，或运行异常检测以扫描最新数据</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAlerts.map((alert: any) => {
                const type = alert.alert_type || alert.alertType;
                const severity = alert.severity;
                const status = alert.status;
                const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
                const typeCfg = TYPE_CONFIG[type] || { label: type, icon: AlertTriangle, color: "#666" };
                const Icon = cfg.icon;
                const TypeIcon = typeCfg.icon;
                return (
                  <div key={alert.id} className={`p-3 rounded-lg border ${cfg.bg} flex items-start gap-3`}>
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${typeCfg.color}20` }}>
                      <TypeIcon className="h-4 w-4" style={{ color: typeCfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5" style={{ borderColor: typeCfg.color, color: typeCfg.color }}>
                          {typeCfg.label}
                        </Badge>
                        <Badge variant={severity === "critical" ? "destructive" : "secondary"} className="text-[10px] px-1.5">
                          {severity === "critical" ? "严重" : severity === "warning" ? "警告" : "信息"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{alert.alert_date || alert.alertDate}</span>
                      </div>
                      <p className="text-sm font-medium mt-1">{alert.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>当前值: <strong>{alert.current_value || alert.currentValue}</strong></span>
                        <span>预期值: {alert.expected_value || alert.expectedValue}</span>
                        <span>偏差: <strong className={Number(alert.deviation_percent || alert.deviationPercent) < 0 ? 'text-red-600' : 'text-amber-600'}>
                          {alert.deviation_percent || alert.deviationPercent}%
                        </strong></span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {status === "active" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => acknowledgeMut.mutate({ id: alert.id })}>
                          确认
                        </Button>
                      )}
                      {(status === "active" || status === "acknowledged") && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resolveMut.mutate({ id: alert.id, resolvedBy: "admin" })}>
                          解决
                        </Button>
                      )}
                      {status === "resolved" && (
                        <Badge variant="outline" className="text-green-600 border-green-300">已解决</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detection Rules Info */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">检测规则说明</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { icon: DollarSign, title: "收入异常检测", desc: "日收入偏离7日均值±30%自动告警", threshold: "±30%" },
              { icon: Users, title: "留存异常检测", desc: "D1留存低于14日均值2个标准差告警", threshold: "2σ" },
              { icon: TrendingUp, title: "投放成本异常", desc: "单日CPI超过目标值150%告警", threshold: "150%" },
              { icon: BarChart3, title: "广告填充率监控", desc: "填充率低于90%告警", threshold: "<90%" },
            ].map((rule) => (
              <div key={rule.title} className="flex items-start gap-3 p-3 rounded-lg border">
                <rule.icon className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{rule.title}</p>
                  <p className="text-xs text-muted-foreground">{rule.desc}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">阈值: {rule.threshold}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
