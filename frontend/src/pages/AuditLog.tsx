import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow, } from "@/components/ui/table";
import { Tooltip,
  TooltipContent,
  TooltipTrigger, } from "@/components/ui/tooltip";
import { Shield,
  Activity,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Filter,
  RotateCcw,
  FileText, } from "lucide-react";

const PAGE_SIZE = 30;

/** 资源名称中文映射 */
const RESOURCE_LABELS: Record<string, string> = {
  auth: "认证",
  dashboard: "仪表盘",
  config: "系统配置",
  levels: "关卡管理",
  monetize: "变现管理",
  experiments: "A/B实验",
  userProfiles: "用户画像",
  segments: "用户分层",
  segmentConfig: "分层配置",
  segmentTools: "分层工具",
  loopEngine: "闭环引擎",
  gameProjects: "游戏项目",
  configVersions: "配置版本",
  analytics: "数据分析",
  teIntegration: "数数集成",
  acquisition: "获客渠道",
  adRevenue: "广告收入",
  costProfit: "成本利润",
  dailyReport: "日报",
  feishu: "飞书",
  reports: "报表",
  alerts: "告警",
  comparison: "对比分析",
  opsTools: "运营工具",
  productOptimization: "产品优化",
  decisionLogs: "决策日志",
  aiAssistant: "AI产品顾问",
  pricingEngine: "定价引擎",
  exportCenter: "数据导出",
  audience: "用户分群",
  iapProducts: "内购商品",
  pushCenter: "推送中心",
  recallPlans: "用户召回",
  customReports: "自定义报表",
  eventAnalysis: "事件分析",
  auditLog: "审计日志",
  system: "系统",
};

function getResourceLabel(resource: string) {
  return RESOURCE_LABELS[resource] || resource;
}

function formatAction(action: string) {
  // "mutation:createRegionGroup" → "创建区域组"
  const parts = action.split(":");
  return parts.length > 1 ? parts[1] : action;
}

function formatDuration(ms: number | null) {
  if (ms === null || ms === undefined) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AuditLog() {
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");

  const filters = useMemo(() => ({
    keyword: keyword || undefined,
    status: statusFilter !== "all" ? (statusFilter as "success" | "failure") : undefined,
    resource: resourceFilter !== "all" ? resourceFilter : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }), [keyword, statusFilter, resourceFilter, page]);

  const { data: logsData, isLoading } = trpc.auditLog.list.useQuery(filters);
  const { data: statsData } = trpc.auditLog.stats.useQuery({ days: 7 });

  const totalPages = Math.ceil((logsData?.total || 0) / PAGE_SIZE);

  const handleSearch = () => {
    setKeyword(searchInput);
    setPage(0);
  };

  const handleReset = () => {
    setSearchInput("");
    setKeyword("");
    setStatusFilter("all");
    setResourceFilter("all");
    setPage(0);
  };

  // 从日志数据中提取唯一资源列表
  const uniqueResources = useMemo(() => {
    if (!logsData?.logs) return [];
    const resources = new Set(logsData.logs.map((l: any) => l.resource));
    return Array.from(resources).sort();
  }, [logsData?.logs]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          审计日志
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          记录所有系统操作，满足 IT 审计合规要求。仅管理员可查看。
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">近7天操作</p>
                <p className="text-2xl font-bold">{statsData?.totalActions ?? "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">失败操作</p>
                <p className="text-2xl font-bold">{statsData?.failureCount ?? "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">总记录数</p>
                <p className="text-2xl font-bold">{logsData?.total ?? "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">成功率</p>
                <p className="text-2xl font-bold">
                  {statsData && statsData.totalActions > 0
                    ? `${(((statsData.totalActions - statsData.failureCount) / statsData.totalActions) * 100).toFixed(1)}%`
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">关键词搜索</label>
              <div className="flex gap-2">
                <Input
                  placeholder="搜索操作名称..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-9"
                />
                <Button size="sm" onClick={handleSearch} className="h-9">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="min-w-[140px]">
              <label className="text-xs text-muted-foreground mb-1 block">状态</label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="success">成功</SelectItem>
                  <SelectItem value="failure">失败</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[160px]">
              <label className="text-xs text-muted-foreground mb-1 block">模块</label>
              <Select value={resourceFilter} onValueChange={(v) => { setResourceFilter(v); setPage(0); }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部模块</SelectItem>
                  {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset} className="h-9">
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 数据表格 */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !logsData?.logs?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mb-3 opacity-30" />
              <p>暂无审计日志记录</p>
              <p className="text-xs mt-1">系统操作将自动记录在此</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">时间</TableHead>
                      <TableHead className="w-[100px]">操作人</TableHead>
                      <TableHead className="w-[100px]">模块</TableHead>
                      <TableHead>操作</TableHead>
                      <TableHead className="w-[70px]">状态</TableHead>
                      <TableHead className="w-[80px]">耗时</TableHead>
                      <TableHead className="w-[120px]">IP</TableHead>
                      <TableHead>详情</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData.logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[80px]">
                              {log.userName || log.userId || "系统"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {getResourceLabel(log.resource)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {formatAction(log.action)}
                        </TableCell>
                        <TableCell>
                          {log.status === "success" ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                              成功
                            </Badge>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="destructive" className="text-xs">
                                  失败
                                </Badge>
                              </TooltipTrigger>
                              {log.errorMessage && (
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">{log.errorMessage}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDuration(log.durationMs)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {log.ipAddress || "-"}
                        </TableCell>
                        <TableCell>
                          {log.details ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs text-muted-foreground cursor-help underline decoration-dotted">
                                  查看
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <pre className="text-xs whitespace-pre-wrap break-words max-h-48 overflow-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  共 {logsData.total} 条记录，第 {page + 1}/{totalPages || 1} 页
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
