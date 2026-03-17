import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Archive, Database, Clock, Trash2, Play, Plus, Settings2,
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, HardDrive,
  Calendar, BarChart3, Loader2, Info, Pause, History,
  Bell, BellRing, Shield, RotateCcw, Eye, Eraser, } from "lucide-react";

// ==================== 工具函数 ====================
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

function formatDate(d: string | Date | null): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "running":
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" />执行中</Badge>;
    case "success":
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />成功</Badge>;
    case "failed":
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />失败</Badge>;
    case "partial":
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><AlertTriangle className="w-3 h-3 mr-1" />部分完成</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getStrategyLabel(strategy: string) {
  switch (strategy) {
    case "delete": return "直接删除";
    case "archive_table": return "归档到表";
    case "export_oss": return "导出到OSS";
    default: return strategy;
  }
}

function getGrowthBadge(growth: string) {
  if (growth.startsWith("极高")) return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">极高</Badge>;
  if (growth.startsWith("高")) return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">高</Badge>;
  if (growth.startsWith("中")) return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">中</Badge>;
  return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">低</Badge>;
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">严重</Badge>;
    case "warning":
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">警告</Badge>;
    case "info":
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">提示</Badge>;
    default:
      return <Badge variant="outline">{severity}</Badge>;
  }
}

// ==================== 统计卡片 ====================
function StatCard({ icon: Icon, title, value, subtitle, color }: {
  icon: React.ElementType; title: string; value: string | number; subtitle?: string; color: string;
}) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 创建策略对话框 ====================
function CreatePolicyDialog({
  open, onOpenChange, archivableTables, gameId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  archivableTables: Array<{ tableName: string; tableLabel: string; dateColumn: string; recommendedRetention: number }>;
  gameId: number;
}) {
  const [selectedTable, setSelectedTable] = useState("");
  const [retentionDays, setRetentionDays] = useState("90");
  const [batchSize, setBatchSize] = useState("5000");
  const [strategy, setStrategy] = useState("delete");

  const utils = trpc.useUtils();
  const createMutation = trpc.archiving.createPolicy.useMutation({
    onSuccess: () => {
      toast.success("归档策略创建成功");
      utils.archiving.getPolicies.invalidate();
      onOpenChange(false);
      setSelectedTable("");
      setRetentionDays("90");
      setBatchSize("5000");
      setStrategy("delete");
    },
    onError: (err) => toast.error(`创建失败: ${err.message}`),
  });

  const selectedTableInfo = archivableTables.find(t => t.tableName === selectedTable);

  const handleCreate = () => {
    if (!selectedTable || !selectedTableInfo) {
      toast.error("请选择要归档的表");
      return;
    }
    createMutation.mutate({
      gameId,
      tableName: selectedTableInfo.tableName,
      tableLabel: selectedTableInfo.tableLabel,
      dateColumn: selectedTableInfo.dateColumn,
      retentionDays: parseInt(retentionDays) || 90,
      batchSize: parseInt(batchSize) || 5000,
      strategy: strategy as "delete" | "archive_table" | "export_oss",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />新建归档策略
          </DialogTitle>
          <DialogDescription>
            选择需要归档的数据表并配置保留策略
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">目标表</label>
            <Select value={selectedTable} onValueChange={(v) => {
              setSelectedTable(v);
              const info = archivableTables.find(t => t.tableName === v);
              if (info) setRetentionDays(String(info.recommendedRetention));
            }}>
              <SelectTrigger>
                <SelectValue placeholder="选择要归档的表..." />
              </SelectTrigger>
              <SelectContent>
                {archivableTables.map(t => (
                  <SelectItem key={t.tableName} value={t.tableName}>
                    {t.tableLabel} ({t.tableName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTableInfo && (
              <p className="text-xs text-muted-foreground">
                日期列: <code className="bg-muted px-1 rounded">{selectedTableInfo.dateColumn}</code>
                {" | "}推荐保留: {selectedTableInfo.recommendedRetention}天
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">保留天数</label>
              <Input
                type="number" min={7} max={3650}
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">超过此天数的数据将被归档</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">批次大小</label>
              <Input
                type="number" min={100} max={50000}
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">每批处理的行数</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">归档策略</label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delete">直接删除（释放空间最快）</SelectItem>
                <SelectItem value="archive_table">归档到备份表（可恢复）</SelectItem>
                <SelectItem value="export_oss">导出到OSS（长期存储）</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending || !selectedTable}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            创建策略
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 创建容量告警规则对话框 ====================
function CreateCapacityRuleDialog({
  open, onOpenChange, archivableTables, gameId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  archivableTables: Array<{ tableName: string; tableLabel: string }>;
  gameId: number;
}) {
  const [selectedTable, setSelectedTable] = useState("");
  const [rowThreshold, setRowThreshold] = useState("100000");
  const [severity, setSeverity] = useState("warning");

  const utils = trpc.useUtils();
  const createMutation = trpc.archiving.createCapacityRule.useMutation({
    onSuccess: () => {
      toast.success("容量告警规则创建成功");
      utils.archiving.getCapacityRules.invalidate();
      onOpenChange(false);
      setSelectedTable("");
      setRowThreshold("100000");
      setSeverity("warning");
    },
    onError: (err) => toast.error(`创建失败: ${err.message}`),
  });

  const selectedTableInfo = archivableTables.find(t => t.tableName === selectedTable);

  const handleCreate = () => {
    if (!selectedTable || !selectedTableInfo) {
      toast.error("请选择目标表");
      return;
    }
    createMutation.mutate({
      gameId,
      tableName: selectedTableInfo.tableName,
      tableLabel: selectedTableInfo.tableLabel,
      rowThreshold: parseInt(rowThreshold) || 100000,
      severity: severity as "critical" | "warning" | "info",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="w-5 h-5" />新建容量告警规则
          </DialogTitle>
          <DialogDescription>
            当表数据量超过阈值时自动告警通知
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">目标表</label>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger>
                <SelectValue placeholder="选择要监控的表..." />
              </SelectTrigger>
              <SelectContent>
                {archivableTables.map(t => (
                  <SelectItem key={t.tableName} value={t.tableName}>
                    {t.tableLabel} ({t.tableName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">行数阈值</label>
              <Input
                type="number" min={1000} max={100000000}
                value={rowThreshold}
                onChange={(e) => setRowThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">超过此行数触发告警</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">告警级别</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">严重</SelectItem>
                  <SelectItem value="warning">警告</SelectItem>
                  <SelectItem value="info">提示</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending || !selectedTable}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            创建规则
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 恢复确认对话框 ====================
function RestoreConfirmDialog({
  open, onOpenChange, archiveTableName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  archiveTableName: string;
}) {
  const utils = trpc.useUtils();
  const restoreMutation = trpc.archiving.restoreData.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`恢复完成，共恢复 ${result.rowsRestored.toLocaleString()} 行，耗时 ${formatDuration(result.durationMs)}`);
      } else {
        toast.error(`恢复失败: ${result.error}`);
      }
      utils.archiving.getBackupTables.invalidate();
      utils.archiving.getAllTableStats.invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error(`恢复失败: ${err.message}`),
  });

  const originalTable = archiveTableName.replace(/_archive$/, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <RotateCcw className="w-5 h-5" />确认恢复归档数据
          </DialogTitle>
          <DialogDescription>
            此操作将把归档备份表中的数据恢复到原表
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">请确认以下操作：</p>
            <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1">
              <li>从 <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{archiveTableName}</code> 恢复数据</li>
              <li>写入到 <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{originalTable}</code></li>
              <li>恢复后备份表中的对应数据将被移除</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            恢复操作将分批执行（每批5000行），避免影响数据库性能。
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            variant="default"
            className="bg-amber-600 hover:bg-amber-700"
            onClick={() => restoreMutation.mutate({ archiveTableName })}
            disabled={restoreMutation.isPending}
          >
            {restoreMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            确认恢复
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 主页面 ====================
export default function DataArchive() {
  const { currentGameId } = useGame();
  const gameId = currentGameId ?? 1;
  const [activeTab, setActiveTab] = useState("overview");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [capacityDialogOpen, setCapacityDialogOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);

  // 数据查询
  const archivableTablesQuery = trpc.archiving.getArchivableTables.useQuery();
  const policiesQuery = trpc.archiving.getPolicies.useQuery({ gameId });
  const logsQuery = trpc.archiving.getLogs.useQuery({ limit: 100 });
  const allStatsQuery = trpc.archiving.getAllTableStats.useQuery();
  const capacityRulesQuery = trpc.archiving.getCapacityRules.useQuery({ gameId });
  const backupTablesQuery = trpc.archiving.getBackupTables.useQuery();

  const utils = trpc.useUtils();

  // 切换启用/禁用
  const toggleMutation = trpc.archiving.togglePolicy.useMutation({
    onSuccess: () => {
      toast.success("策略状态已更新");
      utils.archiving.getPolicies.invalidate();
    },
    onError: (err) => toast.error(`操作失败: ${err.message}`),
  });

  // 手动执行单个策略
  const executeMutation = trpc.archiving.executePolicy.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`归档完成，处理 ${result.rowsArchived} 行，耗时 ${formatDuration(result.durationMs)}`);
      } else {
        toast.error(`归档失败: ${result.error}`);
      }
      utils.archiving.getLogs.invalidate();
      utils.archiving.getPolicies.invalidate();
      utils.archiving.getAllTableStats.invalidate();
    },
    onError: (err) => toast.error(`执行失败: ${err.message}`),
  });

  // 执行所有策略
  const executeAllMutation = trpc.archiving.executeAll.useMutation({
    onSuccess: (result) => {
      toast.success(`批量归档完成: ${result.success}/${result.total} 成功，共处理 ${result.totalRowsArchived} 行`);
      utils.archiving.getLogs.invalidate();
      utils.archiving.getPolicies.invalidate();
      utils.archiving.getAllTableStats.invalidate();
    },
    onError: (err) => toast.error(`批量执行失败: ${err.message}`),
  });

  // 删除策略
  const deleteMutation = trpc.archiving.deletePolicy.useMutation({
    onSuccess: () => {
      toast.success("策略已删除");
      utils.archiving.getPolicies.invalidate();
    },
    onError: (err) => toast.error(`删除失败: ${err.message}`),
  });

  // 容量告警相关
  const toggleCapacityMutation = trpc.archiving.toggleCapacityRule.useMutation({
    onSuccess: () => {
      toast.success("告警规则状态已更新");
      utils.archiving.getCapacityRules.invalidate();
    },
    onError: (err) => toast.error(`操作失败: ${err.message}`),
  });

  const deleteCapacityMutation = trpc.archiving.deleteCapacityRule.useMutation({
    onSuccess: () => {
      toast.success("告警规则已删除");
      utils.archiving.getCapacityRules.invalidate();
    },
    onError: (err) => toast.error(`删除失败: ${err.message}`),
  });

  const runCheckMutation = trpc.archiving.runCapacityCheck.useMutation({
    onSuccess: (result) => {
      if (result.triggered > 0) {
        toast.warning(`检测完成: 检查 ${result.checked} 个规则，触发 ${result.triggered} 个告警`);
      } else {
        toast.success(`检测完成: 检查 ${result.checked} 个规则，所有表数据量正常`);
      }
      utils.archiving.getCapacityRules.invalidate();
    },
    onError: (err) => toast.error(`检测失败: ${err.message}`),
  });

  // 清理归档备份表
  const purgeMutation = trpc.archiving.purgeBackupData.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`清理完成，删除 ${result.rowsDeleted.toLocaleString()} 行`);
      } else {
        toast.error(`清理失败: ${result.error}`);
      }
      utils.archiving.getBackupTables.invalidate();
    },
    onError: (err) => toast.error(`清理失败: ${err.message}`),
  });

  // 统计数据
  const policies = policiesQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  const allStats = allStatsQuery.data ?? [];
  const archivableTables = archivableTablesQuery.data ?? [];
  const capacityRules = capacityRulesQuery.data ?? [];
  const backupTables = backupTablesQuery.data ?? [];

  const totalRows = useMemo(() => allStats.reduce((sum, s) => sum + s.totalRows, 0), [allStats]);
  const totalOver90 = useMemo(() => allStats.reduce((sum, s) => sum + s.rowsOver90Days, 0), [allStats]);
  const enabledPolicies = policies.filter(p => p.enabled === 1).length;
  const enabledCapacityRules = capacityRules.filter(r => r.enabled === 1).length;
  const recentSuccessRate = useMemo(() => {
    const recent = logs.slice(0, 20);
    if (recent.length === 0) return 100;
    const successCount = recent.filter(l => l.status === "success").length;
    return Math.round((successCount / recent.length) * 100);
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Archive className="w-6 h-6 text-primary" />
            数据归档管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理历史数据归档策略，自动清理过期数据，保持数据库性能
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              utils.archiving.getPolicies.invalidate();
              utils.archiving.getLogs.invalidate();
              utils.archiving.getAllTableStats.invalidate();
              utils.archiving.getCapacityRules.invalidate();
              utils.archiving.getBackupTables.invalidate();
              toast.info("数据已刷新");
            }}
          >
            <RefreshCw className="w-4 h-4 mr-1" />刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => executeAllMutation.mutate()}
            disabled={executeAllMutation.isPending || enabledPolicies === 0}
          >
            {executeAllMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
            执行全部
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />新建策略
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Database} title="可归档表" value={archivableTables.length} subtitle={`已配置 ${policies.length} 个策略`} color="#3b82f6" />
        <StatCard icon={HardDrive} title="总数据行数" value={formatNumber(totalRows)} subtitle={`${formatNumber(totalOver90)} 行超过90天`} color="#10b981" />
        <StatCard icon={Settings2} title="活跃策略" value={`${enabledPolicies}/${policies.length}`} subtitle="启用/总数" color="#f59e0b" />
        <StatCard icon={Bell} title="容量告警" value={`${enabledCapacityRules}/${capacityRules.length}`} subtitle="启用/总规则" color="#ef4444" />
        <StatCard icon={CheckCircle2} title="近期成功率" value={`${recentSuccessRate}%`} subtitle={`最近 ${Math.min(logs.length, 20)} 次执行`} color="#8b5cf6" />
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1"><BarChart3 className="w-4 h-4" />数据概览</TabsTrigger>
          <TabsTrigger value="policies" className="gap-1"><Settings2 className="w-4 h-4" />归档策略</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1"><History className="w-4 h-4" />执行日志</TabsTrigger>
          <TabsTrigger value="capacity" className="gap-1"><BellRing className="w-4 h-4" />容量告警</TabsTrigger>
          <TabsTrigger value="restore" className="gap-1"><RotateCcw className="w-4 h-4" />数据恢复</TabsTrigger>
        </TabsList>

        {/* ==================== 数据概览 Tab ==================== */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">可归档数据表统计</CardTitle>
              <CardDescription>展示各表的数据量和过期数据占比</CardDescription>
            </CardHeader>
            <CardContent>
              {allStatsQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">加载中...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>表名</TableHead>
                      <TableHead>增长速率</TableHead>
                      <TableHead className="text-right">总行数</TableHead>
                      <TableHead className="text-right">&gt;90天</TableHead>
                      <TableHead className="text-right">&gt;180天</TableHead>
                      <TableHead className="text-right">&gt;365天</TableHead>
                      <TableHead>数据范围</TableHead>
                      <TableHead>过期占比</TableHead>
                      <TableHead>推荐保留</TableHead>
                      <TableHead>策略状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    ) : allStats.map((stat) => {
                      const over90Pct = stat.totalRows > 0 ? (stat.rowsOver90Days / stat.totalRows * 100) : 0;
                      const matchedPolicy = policies.find(p => p.tableName === stat.tableName);
                      return (
                        <TableRow key={stat.tableName}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{stat.tableLabel}</span>
                              <p className="text-xs text-muted-foreground">{stat.tableName}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getGrowthBadge(stat.estimatedGrowthPerDay)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(stat.totalRows)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(stat.rowsOver90Days)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(stat.rowsOver180Days)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(stat.rowsOver365Days)}</TableCell>
                          <TableCell>
                            <div className="text-xs">
                              {stat.oldestDate ? (
                                <>
                                  <span>{String(stat.oldestDate).slice(0, 10)}</span>
                                  <span className="text-muted-foreground"> ~ </span>
                                  <span>{String(stat.newestDate).slice(0, 10)}</span>
                                </>
                              ) : "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <Progress value={over90Pct} className="h-2 flex-1" />
                              <span className="text-xs font-mono w-10 text-right">{over90Pct.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{stat.recommendedRetention}天</TableCell>
                          <TableCell>
                            {matchedPolicy ? (
                              matchedPolicy.enabled === 1 ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">已启用</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">已暂停</Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">未配置</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== 归档策略 Tab ==================== */}
        <TabsContent value="policies" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">归档策略列表</CardTitle>
                  <CardDescription>管理各表的归档规则，支持启用/禁用和手动触发</CardDescription>
                </div>
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />新建策略
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {policiesQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : policies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">暂无归档策略</p>
                  <p className="text-sm mt-1">点击"新建策略"开始配置数据归档规则</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>目标表</TableHead>
                      <TableHead>日期列</TableHead>
                      <TableHead className="text-center">保留天数</TableHead>
                      <TableHead className="text-center">批次大小</TableHead>
                      <TableHead>归档方式</TableHead>
                      <TableHead>上次执行</TableHead>
                      <TableHead>下次执行</TableHead>
                      <TableHead className="text-center">状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{policy.tableLabel}</span>
                            <p className="text-xs text-muted-foreground">{policy.tableName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{policy.dateColumn}</code>
                        </TableCell>
                        <TableCell className="text-center font-mono">{policy.retentionDays}</TableCell>
                        <TableCell className="text-center font-mono">{formatNumber(policy.batchSize)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getStrategyLabel(policy.strategy)}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(policy.lastRunAt)}</TableCell>
                        <TableCell className="text-xs">{formatDate(policy.nextRunAt)}</TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex justify-center">
                                <Switch
                                  checked={policy.enabled === 1}
                                  onCheckedChange={(checked) => {
                                    toggleMutation.mutate({ id: policy.id, enabled: checked ? 1 : 0 });
                                  }}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{policy.enabled === 1 ? "点击禁用" : "点击启用"}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon" aria-label="执行归档"
                                  className="h-8 w-8"
                                  onClick={() => executeMutation.mutate({ policyId: policy.id })}
                                  disabled={executeMutation.isPending}
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>手动执行</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon" aria-label="删除策略"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (confirm("确定删除此归档策略？")) {
                                      deleteMutation.mutate({ id: policy.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>删除策略</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 归档说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4" />归档策略说明
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>自动执行：</strong>启用的策略每天凌晨3:00自动执行，按配置的保留天数清理过期数据。</p>
              <p><strong>分批处理：</strong>为避免锁表影响业务，归档操作按批次大小分批执行，每批间隔100ms。</p>
              <p><strong>归档方式：</strong>"直接删除"释放空间最快；"归档到表"将数据移至备份表可恢复；"导出到OSS"适合长期存储。</p>
              <p><strong>安全机制：</strong>最短保留7天，最长3650天。执行日志完整记录每次归档的扫描行数、处理行数和耗时。</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== 执行日志 Tab ==================== */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">归档执行日志</CardTitle>
                  <CardDescription>记录每次归档操作的详细执行结果</CardDescription>
                </div>
                <Button
                  variant="outline" size="sm"
                  onClick={() => utils.archiving.getLogs.invalidate()}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />刷新
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logsQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">暂无执行记录</p>
                  <p className="text-sm mt-1">创建归档策略并执行后，日志将显示在这里</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>执行时间</TableHead>
                      <TableHead>目标表</TableHead>
                      <TableHead>截止日期</TableHead>
                      <TableHead className="text-center">状态</TableHead>
                      <TableHead className="text-right">扫描行数</TableHead>
                      <TableHead className="text-right">处理行数</TableHead>
                      <TableHead className="text-right">失败行数</TableHead>
                      <TableHead className="text-right">耗时</TableHead>
                      <TableHead>错误信息</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(log.startedAt)}</TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">{log.tableName}</span>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {log.cutoffDate ? String(log.cutoffDate).slice(0, 10) : "-"}
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(log.rowsScanned)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(log.rowsArchived)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {log.rowsFailed > 0 ? (
                            <span className="text-red-500">{formatNumber(log.rowsFailed)}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatDuration(log.durationMs)}</TableCell>
                        <TableCell>
                          {log.errorMessage ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-red-500 cursor-help truncate max-w-[200px] block">
                                  {log.errorMessage.slice(0, 50)}...
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[400px]">
                                <p className="text-xs whitespace-pre-wrap">{log.errorMessage}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== 容量告警 Tab ==================== */}
        <TabsContent value="capacity" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">容量告警规则</CardTitle>
                  <CardDescription>当表数据量超过阈值时自动触发告警通知</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => runCheckMutation.mutate()}
                    disabled={runCheckMutation.isPending}
                  >
                    {runCheckMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Shield className="w-4 h-4 mr-1" />}
                    立即检测
                  </Button>
                  <Button size="sm" onClick={() => setCapacityDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />新建规则
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {capacityRulesQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : capacityRules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">暂无容量告警规则</p>
                  <p className="text-sm mt-1">点击"新建规则"开始配置数据表容量告警</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>目标表</TableHead>
                      <TableHead className="text-right">行数阈值</TableHead>
                      <TableHead className="text-right">当前行数</TableHead>
                      <TableHead>使用率</TableHead>
                      <TableHead className="text-center">告警级别</TableHead>
                      <TableHead>上次检测</TableHead>
                      <TableHead>上次告警</TableHead>
                      <TableHead className="text-center">状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capacityRules.map((rule) => {
                      const usagePct = rule.rowThreshold > 0 ? (rule.currentRows / rule.rowThreshold * 100) : 0;
                      const isOverThreshold = usagePct >= 100;
                      return (
                        <TableRow key={rule.id} className={isOverThreshold ? "bg-red-50/50 dark:bg-red-950/10" : ""}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{rule.tableLabel}</span>
                              <p className="text-xs text-muted-foreground">{rule.tableName}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(rule.rowThreshold)}</TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={isOverThreshold ? "text-red-600 font-bold" : ""}>
                              {formatNumber(rule.currentRows)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Progress
                                value={Math.min(usagePct, 100)}
                                className={`h-2 flex-1 ${isOverThreshold ? "[&>div]:bg-red-500" : usagePct > 80 ? "[&>div]:bg-yellow-500" : ""}`}
                              />
                              <span className={`text-xs font-mono w-12 text-right ${isOverThreshold ? "text-red-600 font-bold" : ""}`}>
                                {usagePct.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{getSeverityBadge(rule.severity)}</TableCell>
                          <TableCell className="text-xs">{formatDate(rule.lastCheckedAt)}</TableCell>
                          <TableCell className="text-xs">{formatDate(rule.lastAlertedAt)}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={rule.enabled === 1}
                              onCheckedChange={(checked) => {
                                toggleCapacityMutation.mutate({ id: rule.id, enabled: checked ? 1 : 0 });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost" size="icon" aria-label="删除规则"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => {
                                      if (confirm("确定删除此告警规则？")) {
                                        deleteCapacityMutation.mutate({ id: rule.id });
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>删除规则</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 容量告警说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4" />容量告警说明
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>自动检测：</strong>系统每小时自动检测一次所有启用的告警规则，首次检测在服务启动5分钟后执行。</p>
              <p><strong>告警通知：</strong>当表数据量超过阈值时，系统会自动发送通知给项目管理员，并记录到异常告警历史。</p>
              <p><strong>防重复告警：</strong>同一规则24小时内只告警一次，避免频繁打扰。</p>
              <p><strong>告警级别：</strong>"严重"适用于核心业务表；"警告"适用于重要日志表；"提示"适用于辅助数据表。</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== 数据恢复 Tab ==================== */}
        <TabsContent value="restore" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">归档备份表</CardTitle>
                  <CardDescription>管理通过"归档到表"策略创建的备份数据，支持一键恢复到原表</CardDescription>
                </div>
                <Button
                  variant="outline" size="sm"
                  onClick={() => utils.archiving.getBackupTables.invalidate()}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />刷新
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {backupTablesQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : backupTables.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">暂无归档备份表</p>
                  <p className="text-sm mt-1">使用"归档到表"策略归档数据后，备份表将显示在这里</p>
                  <p className="text-xs mt-2">提示：在归档策略中选择"归档到备份表"方式，归档的数据将保存到 [表名]_archive 表中</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>备份表名</TableHead>
                      <TableHead>原始表</TableHead>
                      <TableHead className="text-right">备份行数</TableHead>
                      <TableHead>数据范围</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backupTables.map((bt) => (
                      <TableRow key={bt.archiveTableName}>
                        <TableCell>
                          <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{bt.archiveTableName}</code>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{bt.originalTableName}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(bt.rowCount)}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {bt.oldestDate ? (
                              <>
                                <span>{String(bt.oldestDate).slice(0, 10)}</span>
                                <span className="text-muted-foreground"> ~ </span>
                                <span>{String(bt.newestDate).slice(0, 10)}</span>
                              </>
                            ) : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => setRestoreTarget(bt.archiveTableName)}
                                  disabled={bt.rowCount === 0}
                                >
                                  <RotateCcw className="w-4 h-4 mr-1" />恢复
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>将备份数据恢复到原表</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon" aria-label="清空备份表"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (confirm(`确定清空备份表 ${bt.archiveTableName}？此操作不可恢复！`)) {
                                      purgeMutation.mutate({ archiveTableName: bt.archiveTableName });
                                    }
                                  }}
                                  disabled={purgeMutation.isPending || bt.rowCount === 0}
                                >
                                  <Eraser className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>清空备份表</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 恢复说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4" />数据恢复说明
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>恢复操作：</strong>将备份表中的数据写回原表，恢复后备份表中对应的数据将被移除。</p>
              <p><strong>分批执行：</strong>恢复操作按每批5000行分批执行，避免影响数据库性能。</p>
              <p><strong>清空操作：</strong>清空备份表将永久删除备份数据，请谨慎操作。</p>
              <p><strong>适用场景：</strong>误删数据恢复、回滚归档操作、数据迁移验证等。</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 对话框 */}
      <CreatePolicyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        archivableTables={archivableTables}
        gameId={gameId}
      />
      <CreateCapacityRuleDialog
        open={capacityDialogOpen}
        onOpenChange={setCapacityDialogOpen}
        archivableTables={archivableTables}
        gameId={gameId}
      />
      {restoreTarget && (
        <RestoreConfirmDialog
          open={!!restoreTarget}
          onOpenChange={(open) => { if (!open) setRestoreTarget(null); }}
          archiveTableName={restoreTarget}
        />
      )}
    </div>
  );
}
