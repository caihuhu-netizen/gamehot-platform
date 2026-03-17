import { useState, useEffect, useRef } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Activity, Database, HardDrive, Clock, Zap, RefreshCw,
  Trash2, BarChart3, Server, Cpu, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Timer, FileText, Search, Shield,
  Filter, Download, } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, } from "recharts";

// ==================== 工具函数 ====================
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusColor(value: number, thresholds: [number, number]): string {
  if (value <= thresholds[0]) return "text-green-500";
  if (value <= thresholds[1]) return "text-yellow-500";
  return "text-red-500";
}

function getStatusBadge(value: number, thresholds: [number, number]) {
  if (value <= thresholds[0]) return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">正常</Badge>;
  if (value <= thresholds[1]) return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">注意</Badge>;
  return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">警告</Badge>;
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

// ==================== 指标卡片 ====================
function MetricCard({ icon: Icon, title, value, subtitle, status, trend }: {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle?: string;
  status?: "good" | "warn" | "bad";
  trend?: "up" | "down" | "flat";
}) {
  const statusColors = {
    good: "border-l-green-500",
    warn: "border-l-yellow-500",
    bad: "border-l-red-500",
  };
  const trendIcons = {
    up: <TrendingUp className="h-3 w-3 text-green-500" />,
    down: <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />,
    flat: <Activity className="h-3 w-3 text-muted-foreground" />,
  };

  return (
    <Card className={`border-l-4 ${status ? statusColors[status] : "border-l-primary"}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium">{title}</span>
          </div>
          {trend && trendIcons[trend]}
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ==================== 主页面 ====================
export default function PerfMonitor() {
  // toast from sonner is used directly
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // 实时数据查询
  const realtimeStats = trpc.perfMonitor.realtimeStats.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 2000,
  });

  // 慢查询数据
  const slowQueries = trpc.perfMonitor.slowQueries.useQuery(undefined, {
    refetchInterval: autoRefresh ? 10000 : false,
    staleTime: 5000,
  });

  // 缓存详情
  const cacheDetails = trpc.perfMonitor.cacheDetails.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 2000,
  });

  // 操作 mutations
  const clearCache = trpc.perfMonitor.clearCache.useMutation({
    onSuccess: () => {
      toast.success("缓存已清除：所有缓存条目已清除");
      realtimeStats.refetch();
      cacheDetails.refetch();
    },
  });

  const resetMetrics = trpc.perfMonitor.resetMetrics.useMutation({
    onSuccess: () => {
      toast.success("指标已重置：性能计数器已归零");
      realtimeStats.refetch();
      slowQueries.refetch();
    },
  });

  const saveSnapshot = trpc.perfMonitor.saveSnapshot.useMutation({
    onSuccess: () => {
      toast.success("快照已保存：当前性能状态已记录到数据库");
    },
  });

  // 历史趋势数据（用于图表）
  const [historyData, setHistoryData] = useState<Array<{
    time: string;
    hitRate: number;
    heapMb: number;
    qps: number;
    avgMs: number;
    poolUsed: number;
  }>>([]);

  // 收集历史数据点
  useEffect(() => {
    if (!realtimeStats.data) return;
    const d = realtimeStats.data;
    const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setHistoryData(prev => {
      const next = [...prev, {
        time: now,
        hitRate: d.cache.hitRate,
        heapMb: d.memory.heapUsedMb,
        qps: d.queries.queriesPerMinute,
        avgMs: d.queries.avgDurationMs,
        poolUsed: d.pool.activeConnections,
      }];
      return next.slice(-60); // 保留最近60个数据点
    });
  }, [realtimeStats.data]);

  const stats = realtimeStats.data;
  const queries = slowQueries.data;
  const cacheInfo = cacheDetails.data;

  if (!stats) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary animate-pulse" />
          <h1 className="text-2xl font-bold">性能监控</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-24 bg-muted/30" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const cacheHitRate = stats.cache.hitRate;
  const memUtil = stats.memory.utilizationPercent;
  const poolUtil = stats.pool.maxConnections > 0
    ? Math.round((stats.pool.activeConnections / stats.pool.maxConnections) * 100)
    : 0;

  // 缓存分布饼图数据
  const cachePieData = [
    { name: "命中", value: stats.cache.hits, color: "#10b981" },
    { name: "未命中", value: stats.cache.misses, color: "#ef4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">性能监控</h1>
            <p className="text-sm text-muted-foreground">
              运行时间: {stats.uptime.formatted} · 刷新间隔: {refreshInterval / 1000}s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "border-green-500/50 text-green-600" : ""}
          >
            {autoRefresh ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
            {autoRefresh ? "自动刷新中" : "已暂停"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => saveSnapshot.mutate()}>
            <HardDrive className="h-4 w-4 mr-1" />
            保存快照
          </Button>
          <Button variant="outline" size="sm" onClick={() => resetMetrics.mutate()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            重置计数
          </Button>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Zap}
          title="缓存命中率"
          value={`${cacheHitRate.toFixed(1)}%`}
          subtitle={`${stats.cache.hits} 命中 / ${stats.cache.misses} 未命中`}
          status={cacheHitRate >= 80 ? "good" : cacheHitRate >= 50 ? "warn" : "bad"}
        />
        <MetricCard
          icon={Timer}
          title="平均查询耗时"
          value={`${stats.queries.avgDurationMs.toFixed(1)} ms`}
          subtitle={`${stats.queries.totalQueries} 总查询 · ${stats.queries.queriesPerMinute.toFixed(1)} QPM`}
          status={stats.queries.avgDurationMs <= 50 ? "good" : stats.queries.avgDurationMs <= 200 ? "warn" : "bad"}
        />
        <MetricCard
          icon={Cpu}
          title="内存使用"
          value={`${stats.memory.heapUsedMb} MB`}
          subtitle={`堆总量 ${stats.memory.heapTotalMb} MB · 利用率 ${memUtil}%`}
          status={memUtil <= 70 ? "good" : memUtil <= 85 ? "warn" : "bad"}
        />
        <MetricCard
          icon={Database}
          title="连接池"
          value={`${stats.pool.activeConnections} / ${stats.pool.maxConnections}`}
          subtitle={`空闲 ${stats.pool.idleConnections} · 等待 ${stats.pool.waitingThreads}`}
          status={poolUtil <= 60 ? "good" : poolUtil <= 80 ? "warn" : "bad"}
        />
      </div>

      {/* 标签页 */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">实时趋势</TabsTrigger>
          <TabsTrigger value="cache">缓存详情</TabsTrigger>
          <TabsTrigger value="queries">查询分析</TabsTrigger>
          <TabsTrigger value="memory">内存 & 连接池</TabsTrigger>
          <TabsTrigger value="indexes">索引验证</TabsTrigger>
          <TabsTrigger value="logs">日志看板</TabsTrigger>
          <TabsTrigger value="migration">迁移检测</TabsTrigger>
          <TabsTrigger value="sla">审批SLA</TabsTrigger>
        </TabsList>

        {/* 实时趋势 */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">缓存命中率趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Area type="monotone" dataKey="hitRate" stroke="#10b981" fill="#10b981" fillOpacity={0.15} name="命中率%" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">查询耗时趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="ms" />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      />
                      <Line type="monotone" dataKey="avgMs" stroke="#f59e0b" strokeWidth={2} dot={false} name="平均耗时" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">内存使用趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="MB" />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      />
                      <Area type="monotone" dataKey="heapMb" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name="堆内存" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">连接池使用趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      />
                      <Bar dataKey="poolUsed" fill="#8b5cf6" name="活跃连接" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 缓存详情 */}
        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">缓存统计</CardTitle>
                    <CardDescription>服务端 TTL 内存缓存运行状态</CardDescription>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => clearCache.mutate()}
                    disabled={clearCache.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    清除全部缓存
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">缓存条目</p>
                    <p className="text-xl font-bold">{cacheInfo?.entryCount ?? 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">内存占用</p>
                    <p className="text-xl font-bold">{cacheInfo ? `${cacheInfo.estimatedMemoryKb} KB` : "0 KB"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">命中次数</p>
                    <p className="text-xl font-bold text-green-600">{stats.cache.hits}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">未命中次数</p>
                    <p className="text-xl font-bold text-red-500">{stats.cache.misses}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>命中率</span>
                    <span className="font-medium">{cacheHitRate.toFixed(1)}%</span>
                  </div>
                  <Progress
                    value={cacheHitRate}
                    className="h-2"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>过期淘汰</span>
                    <span className="font-medium">{stats.cache.totalInvalidations} 次</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>主动失效</span>
                    <span className="font-medium">{stats.cache.totalSets} 次</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">命中分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {cachePieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={cachePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {cachePieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      暂无缓存数据
                    </div>
                  )}
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {cachePieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                      <span>{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 查询分析 */}
        <TabsContent value="queries" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">慢查询排行</CardTitle>
                <CardDescription>耗时最长的查询（Top 10）</CardDescription>
              </CardHeader>
              <CardContent>
                {queries?.slowest && queries.slowest.length > 0 ? (
                  <div className="space-y-2">
                    {queries.slowest.map((q: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          i < 3 ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground"
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono truncate">{q.key}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(q.timestamp).toLocaleTimeString("zh-CN")}
                          </p>
                        </div>
                        <Badge variant={q.durationMs > 500 ? "destructive" : q.durationMs > 100 ? "secondary" : "outline"}>
                          {q.durationMs.toFixed(0)} ms
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
                    <p className="text-sm">暂无慢查询记录</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">查询概览</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">总查询数</span>
                    <span className="font-bold">{queries?.totalQueries ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">缓存查询</span>
                    <span className="font-bold text-green-600">{queries?.cachedQueries ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">数据库查询</span>
                    <span className="font-bold text-blue-600">{queries?.dbQueries ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">平均耗时</span>
                    <span className="font-bold">{queries?.avgDurationMs?.toFixed(1) ?? 0} ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">每分钟查询</span>
                    <span className="font-bold">{queries?.queriesPerMinute?.toFixed(1) ?? 0} QPM</span>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">查询来源分布</p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>缓存</span>
                        <span>{queries?.totalQueries ? Math.round(((queries?.cachedQueries ?? 0) / queries.totalQueries) * 100) : 0}%</span>
                      </div>
                      <Progress value={queries?.totalQueries ? ((queries?.cachedQueries ?? 0) / queries.totalQueries) * 100 : 0} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>数据库</span>
                        <span>{queries?.totalQueries ? Math.round(((queries?.dbQueries ?? 0) / queries.totalQueries) * 100) : 0}%</span>
                      </div>
                      <Progress value={queries?.totalQueries ? ((queries?.dbQueries ?? 0) / queries.totalQueries) * 100 : 0} className="h-1.5" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 内存 & 连接池 */}
        <TabsContent value="memory" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  内存使用
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>堆内存使用</span>
                      <span className="font-medium">{stats.memory.heapUsedMb} / {stats.memory.heapTotalMb} MB</span>
                    </div>
                    <Progress value={memUtil} className="h-2" />
                    <div className="flex justify-end mt-1">
                      {getStatusBadge(memUtil, [70, 85])}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground">RSS 内存</p>
                      <p className="text-lg font-bold">{stats.memory.rssMb} MB</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground">外部内存</p>
                      <p className="text-lg font-bold">{stats.memory.externalMb} MB</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  连接池状态
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>连接使用率</span>
                    <span className="font-medium">{stats.pool.activeConnections} / {stats.pool.maxConnections}</span>
                  </div>
                  <Progress value={poolUtil} className="h-2" />
                  <div className="flex justify-end mt-1">
                    {getStatusBadge(poolUtil, [60, 80])}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <p className="text-xs text-muted-foreground">空闲</p>
                    <p className="text-lg font-bold text-green-600">{stats.pool.idleConnections}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <p className="text-xs text-muted-foreground">活跃</p>
                    <p className="text-lg font-bold text-blue-600">{stats.pool.activeConnections}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                    <p className="text-xs text-muted-foreground">等待队列</p>
                    <p className="text-lg font-bold text-yellow-600">{stats.pool.waitingThreads}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 系统信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                系统信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Node.js 版本</p>
                  <p className="text-sm font-mono font-medium">{typeof process !== 'undefined' ? 'v22.x' : 'N/A'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">运行时间</p>
                  <p className="text-sm font-medium">{stats.uptime.formatted}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">刷新间隔</p>
                  <p className="text-sm font-medium">{refreshInterval / 1000} 秒</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">数据点</p>
                  <p className="text-sm font-medium">{historyData.length} / 60</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 索引验证 */}
        <TabsContent value="indexes" className="space-y-4">
          <IndexValidationPanel />
        </TabsContent>

        {/* 日志看板 */}
        <TabsContent value="logs" className="space-y-4">
          <LogDashboardPanel />
        </TabsContent>

        {/* 迁移检测 */}
        <TabsContent value="migration" className="space-y-4">
          <MigrationCheckPanel />
        </TabsContent>

        {/* 审批SLA监控 */}
        <TabsContent value="sla" className="space-y-4">
          <ApprovalSLAPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== 索引验证面板 ====================
function IndexValidationPanel() {
  const { data: indexData, isLoading, refetch } = trpc.perfMonitor.indexValidation.useQuery(undefined, {
    staleTime: 60000,
  });
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Database className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p>正在加载索引信息...</p>
        </CardContent>
      </Card>
    );
  }

  const tables = (indexData?.tables || []).filter((t: any) =>
    !filter || t.name.toLowerCase().includes(filter.toLowerCase())
  );
  const missingIndexes = indexData?.missingIndexes || [];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">总表数</p>
            <p className="text-2xl font-bold">{indexData?.totalTables ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">总索引数</p>
            <p className="text-2xl font-bold text-blue-600">{indexData?.totalIndexes ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">需关注</p>
            <p className="text-2xl font-bold text-amber-600">{missingIndexes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">操作</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />刷新
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Missing index warnings */}
      {missingIndexes.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              索引建议
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {missingIndexes.map((m: any, i: number) => (
              <div key={i} className="text-xs p-2 rounded bg-amber-100/50">
                <span className="font-mono font-medium">{m.table}</span>: {m.suggestion}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Table list with indexes */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">表索引详情</CardTitle>
            <input
              type="text"
              placeholder="搜索表名..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-md bg-background w-48"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>表名</TableHead>
                <TableHead className="text-right">行数</TableHead>
                <TableHead className="text-right">数据大小</TableHead>
                <TableHead className="text-right">索引大小</TableHead>
                <TableHead className="text-right">索引数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((t: any) => (
                <>
                  <TableRow
                    key={t.name}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedTable(expandedTable === t.name ? null : t.name)}
                  >
                    <TableCell className="font-mono text-xs">{t.name}</TableCell>
                    <TableCell className="text-right">{t.rows.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{t.dataSizeMb} MB</TableCell>
                    <TableCell className="text-right">{t.indexSizeMb} MB</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={t.indexCount > 1 ? "default" : "secondary"}>{t.indexCount}</Badge>
                    </TableCell>
                  </TableRow>
                  {expandedTable === t.name && t.indexes.length > 0 && (
                    <TableRow key={`${t.name}-detail`}>
                      <TableCell colSpan={5} className="bg-muted/20 p-3">
                        <div className="space-y-1.5">
                          {t.indexes.map((idx: any) => (
                            <div key={idx.name} className="flex items-center gap-2 text-xs">
                              <Badge variant={idx.unique ? "default" : "outline"} className="text-[10px] px-1.5">
                                {idx.unique ? "UNIQUE" : "INDEX"}
                              </Badge>
                              <span className="font-mono font-medium text-primary">{idx.name}</span>
                              <span className="text-muted-foreground">({idx.columns.join(", ")})</span>
                              <span className="text-muted-foreground ml-auto">基数: {idx.cardinality.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 日志聚合看板 ====================
function LogDashboardPanel() {
  const [level, setLevel] = useState<string>("all");
  const [module, setModule] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");

  // Debounce keyword search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const logsQuery = trpc.perfMonitor.queryLogs.useQuery({
    level: level === "all" ? undefined : level,
    module: module === "all" ? undefined : module,
    keyword: debouncedKeyword || undefined,
    limit: 200,
  }, {
    refetchInterval: 5000,
    staleTime: 2000,
  });

  const statsQuery = trpc.perfMonitor.logStats.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const modulesQuery = trpc.perfMonitor.logModules.useQuery();
  const clearMutation = trpc.perfMonitor.clearLogs.useMutation({
    onSuccess: () => {
      toast.success("日志缓冲区已清空");
      logsQuery.refetch();
      statsQuery.refetch();
    },
  });

  const stats = statsQuery.data;
  const logs = logsQuery.data?.logs || [];

  const levelColors: Record<string, string> = {
    debug: "bg-gray-500/10 text-gray-600 border-gray-500/30",
    info: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    warn: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    error: "bg-red-500/10 text-red-600 border-red-500/30",
    fatal: "bg-red-700/10 text-red-700 border-red-700/30",
  };

  return (
    <div className="space-y-4">
      {/* 统计概览 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(stats.byLevel).map(([lvl, count]) => (
            <Card key={lvl}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground capitalize">{lvl}</span>
                  <Badge variant="outline" className={levelColors[lvl] || ""}>
                    {count as number}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 筛选栏 */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="日志级别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部级别</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="fatal">Fatal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={module} onValueChange={setModule}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="模块" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模块</SelectItem>
                {(modulesQuery.data || []).map((m: string) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="搜索日志内容..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => logsQuery.refetch()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                刷新
              </Button>
              <Button variant="outline" size="sm" onClick={() => clearMutation.mutate()}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                清空
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              应用日志
            </CardTitle>
            <Badge variant="outline">{logs.length} 条</Badge>
          </div>
          <CardDescription>内存环形缓冲区最近 2000 条日志（5秒自动刷新）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-y-auto space-y-1 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">暂无日志记录</div>
            ) : (
              logs.map((log: any, i: number) => (
                <div
                  key={`${log.timestamp}-${i}`}
                  className={`flex items-start gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors ${
                    log.level === "error" || log.level === "fatal" ? "bg-red-500/5" : ""
                  }`}
                >
                  <span className="text-muted-foreground whitespace-nowrap shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <Badge variant="outline" className={`text-[10px] px-1 shrink-0 ${levelColors[log.level] || ""}`}>
                    {log.level.toUpperCase().padEnd(5)}
                  </Badge>
                  <span className="text-primary/70 shrink-0">[{log.module}]</span>
                  <span className="break-all">
                    {log.message}
                    {log.path && <span className="text-muted-foreground ml-1">{log.method} {log.path}</span>}
                    {log.statusCode && <span className={`ml-1 ${log.statusCode >= 400 ? "text-red-500" : "text-green-500"}`}>{log.statusCode}</span>}
                    {log.duration && <span className="text-muted-foreground ml-1">{log.duration}ms</span>}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 模块分布 */}
      {stats && Object.keys(stats.byModule).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">模块日志分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(stats.byModule).map(([mod, count]) => (
                <div key={mod} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span className="text-xs font-medium">{mod}</span>
                  <Badge variant="secondary" className="text-xs">{count as number}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== 数据库迁移检测 ====================
function MigrationCheckPanel() {
  const { data: report, isLoading, refetch } = trpc.perfMonitor.migrationCheck.useQuery(undefined, {
    staleTime: 60000,
  });

  const severityColors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-600 border-red-500/30",
    warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    info: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  };

  const severityIcons: Record<string, React.ReactNode> = {
    critical: <XCircle className="h-4 w-4 text-red-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
    info: <FileText className="h-4 w-4 text-blue-500" />,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse"><CardContent className="p-6 h-32 bg-muted/30" /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 状态概览 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className={`h-6 w-6 ${report?.healthy ? "text-green-500" : "text-red-500"}`} />
              <div>
                <CardTitle className="text-base">
                  Schema 同步状态
                </CardTitle>
                <CardDescription>
                  {report?.summary}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={report?.healthy ? "outline" : "destructive"} className={report?.healthy ? "bg-green-500/10 text-green-600 border-green-500/30" : ""}>
                {report?.healthy ? "✓ 健康" : `✗ ${report?.totalIssues} 个问题`}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                重新检测
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className="text-2xl font-bold text-primary">{report?.totalTables}</div>
              <div className="text-xs text-muted-foreground">预期表数</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className="text-2xl font-bold text-green-500">
                {(report?.totalTables || 0) - (report?.issues?.filter((i: any) => i.type === "missing_table").length || 0)}
              </div>
              <div className="text-xs text-muted-foreground">已同步表</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className={`text-2xl font-bold ${report?.totalIssues ? "text-red-500" : "text-green-500"}`}>
                {report?.totalIssues}
              </div>
              <div className="text-xs text-muted-foreground">问题数</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 问题列表 */}
      {report?.issues && report.issues.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">检测到的问题</CardTitle>
            <CardDescription>按严重程度排序，建议优先处理 critical 级别问题</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">严重度</TableHead>
                  <TableHead className="w-[120px]">类型</TableHead>
                  <TableHead className="w-[150px]">表名</TableHead>
                  <TableHead className="w-[120px]">列/索引</TableHead>
                  <TableHead>建议</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...report.issues]
                  .sort((a: any, b: any) => {
                    const order = { critical: 0, warning: 1, info: 2 };
                    return (order[a.severity as keyof typeof order] || 2) - (order[b.severity as keyof typeof order] || 2);
                  })
                  .map((issue: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {severityIcons[issue.severity]}
                          <Badge variant="outline" className={`text-[10px] ${severityColors[issue.severity] || ""}`}>
                            {issue.severity}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {issue.type === "missing_table" ? "缺失表" :
                           issue.type === "missing_column" ? "缺失列" :
                           issue.type === "missing_index" ? "缺失索引" : "类型不匹配"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{issue.table}</TableCell>
                      <TableCell className="font-mono text-xs">{issue.column || issue.index || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">{issue.suggestion}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 检测时间 */}
      {report && (
        <div className="text-xs text-muted-foreground text-right">
          上次检测: {new Date(report.checkedAt).toLocaleString("zh-CN")}
        </div>
      )}
    </div>
  );
}

// ==================== 审批SLA监控面板 ====================
function ApprovalSLAPanel() {
  const { data: sla, isLoading, refetch } = trpc.perfMonitor.approvalSLA.useQuery(undefined, {
    staleTime: 30000,
  });

  const COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6"];
  const RESPONSE_TYPE_LABELS: Record<string, string> = {
    create_experiment: "创建实验",
    adjust_difficulty: "调整难度",
    send_notification: "发送通知",
    modify_config: "修改配置",
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Shield className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p>正在加载审批SLA数据...</p>
        </CardContent>
      </Card>
    );
  }

  if (!sla) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <p>暂无审批数据</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare pie data for status distribution
  const statusPieData = [
    { name: "待审批", value: sla.pendingCount, color: "#f59e0b" },
    { name: "已通过", value: sla.approvedCount, color: "#22c55e" },
    { name: "已拒绝", value: sla.rejectedCount, color: "#ef4444" },
    { name: "已过期", value: sla.expiredCount, color: "#6b7280" },
    { name: "自动通过", value: sla.autoApprovedCount, color: "#3b82f6" },
  ].filter(d => d.value > 0);

  // Prepare daily trend chart data
  const trendData = (sla.dailyTrend || []).map((d: any) => ({
    date: typeof d.date === "string" ? d.date.slice(5) : d.date,
    total: Number(d.total),
    withinSla: Number(d.within_sla),
    expired: Number(d.expired),
    avgHours: Number(Number(d.avg_hours || 0).toFixed(1)),
  }));

  return (
    <div className="space-y-4">
      {/* SLA 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">24h SLA达标率</p>
            <p className={`text-2xl font-bold ${sla.slaRate24h >= 80 ? "text-green-600" : sla.slaRate24h >= 60 ? "text-amber-600" : "text-red-600"}`}>
              {sla.slaRate24h}%
            </p>
            <Progress value={sla.slaRate24h} className="mt-1 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">平均审批时长</p>
            <p className="text-2xl font-bold">{sla.avgReviewHours}h</p>
            <p className="text-xs text-muted-foreground mt-1">
              {sla.avgReviewHours <= 4 ? "⚡ 高效" : sla.avgReviewHours <= 12 ? "⏱ 正常" : "⚠ 偏慢"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">审批通过率</p>
            <p className="text-2xl font-bold text-green-600">{sla.approvalRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{sla.approvedCount}/{sla.approvedCount + sla.rejectedCount} 通过</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">超时率</p>
            <p className={`text-2xl font-bold ${sla.timeoutRate <= 10 ? "text-green-600" : sla.timeoutRate <= 25 ? "text-amber-600" : "text-red-600"}`}>
              {sla.timeoutRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">{sla.expiredCount} 已过期</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">效果改善率</p>
            <p className="text-2xl font-bold text-blue-600">{sla.improvementRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">审批后指标改善</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">待处理</p>
            <p className={`text-2xl font-bold ${sla.pendingCount > 5 ? "text-red-600" : sla.pendingCount > 0 ? "text-amber-600" : "text-green-600"}`}>
              {sla.pendingCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">共 {sla.totalApprovals} 条记录</p>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图 + 状态分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 14天趋势 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                14天审批趋势
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />刷新
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = { total: "总审批", withinSla: "SLA内", expired: "超时", avgHours: "平均时长(h)" };
                      return [value, labels[name] || name];
                    }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} formatter={(v) => {
                    const labels: Record<string, string> = { total: "总审批", withinSla: "SLA达标", expired: "超时", avgHours: "平均时长" };
                    return labels[v] || v;
                  }} />
                  <Area type="monotone" dataKey="total" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="withinSla" stackId="2" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="expired" stackId="3" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
                  <Line type="monotone" dataKey="avgHours" stroke="#f59e0b" strokeDasharray="5 5" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">暂无趋势数据</div>
            )}
          </CardContent>
        </Card>

        {/* 状态分布饼图 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 按响应类型分析 */}
      {sla.byType && sla.byType.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              按响应类型分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>响应类型</TableHead>
                  <TableHead className="text-right">总数</TableHead>
                  <TableHead className="text-right">通过</TableHead>
                  <TableHead className="text-right">拒绝</TableHead>
                  <TableHead className="text-right">过期</TableHead>
                  <TableHead className="text-right">平均时长</TableHead>
                  <TableHead className="text-right">通过率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sla.byType.map((row: any, i: number) => {
                  const total = Number(row.approved) + Number(row.rejected);
                  const rate = total > 0 ? (Number(row.approved) / total * 100).toFixed(1) : "-";
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        <Badge variant="outline" className="text-xs">
                          {RESPONSE_TYPE_LABELS[row.response_type] || row.response_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{row.total}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">{row.approved}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">{row.rejected}</TableCell>
                      <TableCell className="text-right font-mono text-gray-500">{row.expired}</TableCell>
                      <TableCell className="text-right font-mono">
                        {row.avg_hours ? `${Number(row.avg_hours).toFixed(1)}h` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {rate !== "-" ? (
                          <Badge variant={Number(rate) >= 70 ? "default" : "secondary"} className="text-xs">
                            {rate}%
                          </Badge>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
