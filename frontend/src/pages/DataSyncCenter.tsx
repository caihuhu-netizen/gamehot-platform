import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  RefreshCw, Loader2, CheckCircle2, XCircle, Clock, Zap,
  ArrowDownToLine, Database, BarChart3, Activity,
  Settings2, Calendar, AlertTriangle, TrendingUp
} from "lucide-react";

// ==================== Types ====================
type SyncService = {
  id: string;
  name: string;
  icon: typeof Database;
  description: string;
  color: string;
  bgColor: string;
  reportTypes: { value: string; label: string; description: string }[];
};

const SYNC_SERVICES: SyncService[] = [
  {
    id: "appsflyer",
    name: "AppsFlyer",
    icon: TrendingUp,
    description: "归因分析 · 投放成本 · 应用内事件 · 广告收入",
    color: "text-green-600",
    bgColor: "bg-green-50",
    reportTypes: [
      { value: "aggregate_cost", label: "聚合成本报表", description: "按渠道+日期汇总投放花费/展示/点击/安装" },
      { value: "installs", label: "安装归因", description: "非自然安装原始数据（含归因详情）" },
      { value: "in_app_events", label: "应用内事件", description: "付费事件同步，自动更新 LTV" },
      { value: "ad_revenue", label: "广告收入归因", description: "按广告网络归因的变现收入" },
    ],
  },
  {
    id: "applovin",
    name: "AppLovin",
    icon: BarChart3,
    description: "投放报表 · MAX 变现 · 用户级广告收入",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    reportTypes: [
      { value: "campaign_report", label: "投放报表", description: "Campaign 维度的花费/展示/安装" },
      { value: "max_revenue", label: "MAX 变现报表", description: "广告网络级别的收入/eCPM/填充率" },
    ],
  },
  {
    id: "thinkingdata",
    name: "数数科技",
    icon: Database,
    description: "用户行为 · 留存分析 · 付费明细 · 漏斗转化",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    reportTypes: [
      { value: "event_analysis", label: "事件分析", description: "自定义事件的聚合分析" },
      { value: "retention", label: "留存分析", description: "按日/周/月的用户留存数据" },
      { value: "funnel", label: "漏斗分析", description: "关键路径的转化漏斗" },
    ],
  },
];

// ==================== DataSyncCenter ====================
export default function DataSyncCenter() {
  const { currentGameId } = useGame();
  const gameId = currentGameId ?? 0;
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">数据同步中心</h1>
        <p className="text-muted-foreground mt-1">统一管理 AppsFlyer、AppLovin、数数科技的数据同步</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">同步概览</TabsTrigger>
          <TabsTrigger value="appsflyer">AppsFlyer</TabsTrigger>
          <TabsTrigger value="applovin">AppLovin</TabsTrigger>
          <TabsTrigger value="thinkingdata">数数科技</TabsTrigger>
          <TabsTrigger value="logs">同步日志</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SyncOverview gameId={gameId} />
        </TabsContent>

        <TabsContent value="appsflyer" className="space-y-6">
          <SyncPanel service={SYNC_SERVICES[0]} gameId={gameId} />
        </TabsContent>

        <TabsContent value="applovin" className="space-y-6">
          <SyncPanel service={SYNC_SERVICES[1]} gameId={gameId} />
        </TabsContent>

        <TabsContent value="thinkingdata" className="space-y-6">
          <SyncPanel service={SYNC_SERVICES[2]} gameId={gameId} />
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <SyncLogs gameId={gameId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== Sync Overview ====================
function SyncOverview({ gameId }: { gameId: number }) {
  const configList = trpc.gameServiceConfigs.list.useQuery(
    { gameId },
    { enabled: !!gameId }
  );

  const syncLogs = trpc.appsflyer.listSyncLogs.useQuery(
    { gameId, limit: 10 },
    { enabled: !!gameId }
  );

  const recentLogs = syncLogs.data ?? [];
  const successCount = recentLogs.filter((l: Record<string,unknown>) => l.status === "success").length;
  const failCount = recentLogs.filter((l: Record<string,unknown>) => l.status === "failed").length;
  const configs = configList.data ?? [];

  return (
    <>
      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SYNC_SERVICES.map((service) => {
          const SIcon = service.icon;
          const config = configs.find((c: any) => c.serviceType === service.id);
          const isConfigured = config?.status === "active";
          return (
            <Card key={service.id} className={`border-l-4 ${isConfigured ? "border-l-green-500" : "border-l-gray-300"}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${service.bgColor}`}>
                    <SIcon className={`h-5 w-5 ${service.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{service.name}</h3>
                      <Badge variant={isConfigured ? "default" : "secondary"} className="text-xs">
                        {isConfigured ? "已连接" : "未配置"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      支持 {service.reportTypes.length} 种报表类型
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Sync Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50"><ArrowDownToLine className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{recentLogs.length}</p>
              <p className="text-xs text-muted-foreground">近期同步</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{successCount}</p>
              <p className="text-xs text-muted-foreground">成功</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50"><XCircle className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold">{failCount}</p>
              <p className="text-xs text-muted-foreground">失败</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50"><Activity className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{recentLogs.length > 0 ? `${Math.round(successCount / recentLogs.length * 100)}%` : "-"}</p>
              <p className="text-xs text-muted-foreground">成功率</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sync Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近同步记录</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>暂无同步记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.slice(0, 5).map((log: Record<string,unknown>) => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  {log.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : log.status === "failed" ? (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  ) : (
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.reportType}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.dateFrom} ~ {log.dateTo} · {log.recordsCount ?? 0} 条记录
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(log.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ==================== Sync Panel ====================
function SyncPanel({ service, gameId }: { service: SyncService; gameId: number }) {
  const [selectedReport, setSelectedReport] = useState(service.reportTypes[0]?.value || "");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [syncing, setSyncing] = useState(false);

  const configList = trpc.gameServiceConfigs.list.useQuery(
    { gameId },
    { enabled: !!gameId }
  );

  const configs = configList.data ?? [];
  const config = configs.find((c: any) => c.serviceType === service.id);
  const isConfigured = config?.status === "active";

  // AppsFlyer sync mutations
  const syncCosts = trpc.appsflyer.syncCosts.useMutation();
  const syncInstalls = trpc.appsflyer.syncInstalls.useMutation();
  const syncInAppEvents = trpc.appsflyer.syncInAppEvents.useMutation();
  const syncAdRevenue = trpc.appsflyer.syncAdRevenue.useMutation();

  const handleSync = async () => {
    if (!isConfigured) {
      toast.error(`请先在「游戏项目 → 第三方服务」中配置 ${service.name}`);
      return;
    }

    setSyncing(true);
    try {
      if (service.id === "appsflyer") {
        switch (selectedReport) {
          case "aggregate_cost":
              await syncCosts.mutateAsync({ gameId, startDate: dateFrom, endDate: dateTo });
            break;
          case "installs":
            await syncInstalls.mutateAsync({ gameId, startDate: dateFrom, endDate: dateTo });
            break;
          case "in_app_events":
            await syncInAppEvents.mutateAsync({ gameId, startDate: dateFrom, endDate: dateTo });
            break;
          case "ad_revenue":
            await syncAdRevenue.mutateAsync({ gameId, startDate: dateFrom, endDate: dateTo });
            break;
        }
        toast.success("同步完成");
      } else {
        toast.info(`${service.name} 同步功能即将上线`);
      }
    } catch (e) {
      toast.error((e as Error).message || "同步失败");
    } finally {
      setSyncing(false);
    }
  };

  const SIcon = service.icon;

  return (
    <>
      {/* Service Header */}
      <Card className={`border-l-4 ${isConfigured ? "border-l-green-500" : "border-l-amber-500"}`}>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${service.bgColor}`}>
              <SIcon className={`h-6 w-6 ${service.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{service.name}</h2>
                <Badge variant={isConfigured ? "default" : "outline"}>
                  {isConfigured ? "已连接" : "未配置"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{service.description}</p>
            </div>
            {!isConfigured && (
              <Button variant="outline" size="sm" onClick={() => toast.info("请前往「游戏项目 → 第三方服务」配置")}>
                <Settings2 className="h-4 w-4 mr-1" /> 去配置
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" /> 手动同步
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>报表类型</Label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {service.reportTypes.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>开始日期</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>结束日期</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          {/* Report type description */}
          {selectedReport && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              {service.reportTypes.find((rt) => rt.value === selectedReport)?.description}
            </div>
          )}

          <Button onClick={handleSync} disabled={syncing || !isConfigured} className="w-full md:w-auto">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {syncing ? "同步中..." : "开始同步"}
          </Button>
        </CardContent>
      </Card>

      {/* Report Types Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">支持的报表类型</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {service.reportTypes.map((rt) => (
              <div key={rt.value} className="p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors">
                <h4 className="font-medium text-sm">{rt.label}</h4>
                <p className="text-xs text-muted-foreground mt-1">{rt.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ==================== Sync Logs ====================
function SyncLogs({ gameId }: { gameId: number }) {
  const logs = trpc.appsflyer.listSyncLogs.useQuery(
    { gameId, limit: 50 },
    { enabled: !!gameId }
  );

  const logList = logs.data ?? [];

  const statusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      case "running": return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">同步日志</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => logs.refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {logs.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
        ) : logList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>暂无同步日志</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 px-3 font-medium">状态</th>
                  <th className="text-left py-2 px-3 font-medium">报表类型</th>
                  <th className="text-left py-2 px-3 font-medium">日期范围</th>
                  <th className="text-right py-2 px-3 font-medium">记录数</th>
                  <th className="text-right py-2 px-3 font-medium">耗时</th>
                  <th className="text-right py-2 px-3 font-medium">同步时间</th>
                </tr>
              </thead>
              <tbody>
                {logList.map((log: Record<string,unknown>) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 px-3">{statusIcon(log.status)}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs">{log.reportType}</Badge>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{log.dateFrom} ~ {log.dateTo}</td>
                    <td className="py-2 px-3 text-right">{log.recordsCount ?? "-"}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">
                      {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : "-"}
                    </td>
                    <td className="py-2 px-3 text-right text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("zh-CN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
