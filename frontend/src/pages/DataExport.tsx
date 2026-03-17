import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Download, FileSpreadsheet, FileText, Clock,
  CheckCircle2, XCircle, Loader2,
  Database, RefreshCw, CalendarClock, Plus, Trash2, Table2,
  ShieldCheck, Eye, EyeOff, } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
export default function DataExport() {
  const { currentGameId } = useGame();
  const [selectedSource, setSelectedSource] = useState("game_users");
  const [format, setFormat] = useState<"csv" | "json" | "xlsx">("csv");
  const [enableMasking, setEnableMasking] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [exportLimit, setExportLimit] = useState(10000);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    dataSource: "game_users",
    format: "csv" as "csv" | "json" | "xlsx",
    frequency: "daily" as "daily" | "weekly" | "monthly",
    dayOfWeek: 1,
    dayOfMonth: 1,
    hour: 8,
  });

  // 获取可导出的数据源列表
  const { data: dataSources } = trpc.exportCenter.listDataSources.useQuery({ gameId: currentGameId ?? undefined });
  // 获取导出历史
  const { data: exportHistory, refetch: refetchHistory } = trpc.exportCenter.listTasks.useQuery({ gameId: currentGameId ?? undefined });
  // 获取定时导出配置
  const { data: schedules, refetch: refetchSchedules } = trpc.exportCenter.listSchedules.useQuery({ gameId: currentGameId ?? undefined });

  // 创建导出
  const exportMutation = trpc.exportCenter.createExport.useMutation({
    onSuccess: (data: { taskId: number; totalRows: number; fileUrl: string | null }) => {
      toast.success(`导出完成，共 ${data.totalRows} 行数据`);
      refetchHistory();
      if (data.fileUrl) {
        downloadFile(data.fileUrl, `${selectedSource}-export.${format}`);
      }
    },
    onError: (err: { message: string }) => toast.error("导出失败: " + err.message),
  });

  // 创建定时导出
  const createScheduleMutation = trpc.exportCenter.createSchedule.useMutation({
    onSuccess: () => {
      toast.success("定时导出配置已创建");
      refetchSchedules();
      setShowScheduleDialog(false);
    },
    onError: (err: { message: string }) => toast.error("创建失败: " + err.message),
  });

  // 更新定时导出
  const updateScheduleMutation = trpc.exportCenter.updateSchedule.useMutation({
    onSuccess: () => {
      refetchSchedules();
      toast.success("配置已更新");
    },
  });

  // 删除定时导出
  const deleteScheduleMutation = trpc.exportCenter.deleteSchedule.useMutation({
    onSuccess: () => {
      refetchSchedules();
      toast.success("配置已删除");
    },
  });

  const downloadFile = (url: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExport = () => {
    const source = dataSources?.find((s: any) => s.id === selectedSource);
    const filters: any = {};
    if (filterStartDate) filters.startDate = filterStartDate;
    if (filterEndDate) filters.endDate = filterEndDate;
    if (exportLimit !== 10000) filters.limit = exportLimit;
    exportMutation.mutate({
      dataSource: selectedSource,
      dataSourceLabel: source?.label,
      format,
      enableMasking,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });
  };

  const handleCreateSchedule = () => {
    const source = dataSources?.find((s: any) => s.id === scheduleForm.dataSource);
    createScheduleMutation.mutate({
      name: scheduleForm.name || `${source?.label || scheduleForm.dataSource} 定时导出`,
      dataSource: scheduleForm.dataSource,
      dataSourceLabel: source?.label,
      format: scheduleForm.format,
      frequency: scheduleForm.frequency,
      dayOfWeek: scheduleForm.dayOfWeek,
      dayOfMonth: scheduleForm.dayOfMonth,
      hour: scheduleForm.hour,
    });
  };

  const selectedSourceInfo = useMemo(
    () => dataSources?.find((s: any) => s.id === selectedSource),
    [dataSources, selectedSource]
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />已完成</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Loader2 className="h-3 w-3 mr-1 animate-spin" />处理中</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />失败</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />等待中</Badge>;
    }
  };

  const formatIcon = (fmt: string) => {
    if (fmt === "xlsx") return <Table2 className="h-5 w-5 text-emerald-600" />;
    if (fmt === "csv") return <FileText className="h-5 w-5 text-green-600" />;
    return <FileSpreadsheet className="h-5 w-5 text-blue-600" />;
  };

  const frequencyLabel: Record<string, string> = {
    daily: "每天",
    weekly: "每周",
    monthly: "每月",
  };

  const dayOfWeekLabel: Record<number, string> = {
    0: "周日", 1: "周一", 2: "周二", 3: "周三", 4: "周四", 5: "周五", 6: "周六",
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Download className="h-6 w-6 text-primary" />
          数据导出中心
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          支持 CSV / JSON / XLSX 格式导出，可配置定时自动导出
        </p>
      </div>

      <Tabs defaultValue="export" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="export" className="text-xs sm:text-sm">
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            创建导出
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            <Clock className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            导出历史
          </TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs sm:text-sm">
            <CalendarClock className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            定时导出
          </TabsTrigger>
          <TabsTrigger value="masking" className="text-xs sm:text-sm">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            脱敏规则
          </TabsTrigger>
        </TabsList>

        {/* 创建导出 Tab */}
        <TabsContent value="export" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* 左侧：数据源选择 */}
            <div className="col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">选择数据源</CardTitle>
                  <CardDescription>选择要导出的数据表</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {dataSources?.map((ds: Record<string,unknown>) => {
                      const isSelected = selectedSource === ds.id;
                      return (
                        <div
                          key={ds.id}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-transparent bg-muted/50 hover:bg-muted"
                          }`}
                          onClick={() => setSelectedSource(ds.id)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Database className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="text-sm font-medium">{ds.label}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{ds.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右侧：导出配置 */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">导出格式</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(["csv", "json", "xlsx"] as const).map((fmt) => (
                    <div
                      key={fmt}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 ${
                        format === fmt ? "border-primary bg-primary/5" : "border-transparent bg-muted/50 hover:bg-muted"
                      }`}
                      onClick={() => setFormat(fmt)}
                    >
                      {formatIcon(fmt)}
                      <div>
                        <div className="text-sm font-medium uppercase">{fmt}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {fmt === "csv" ? "通用格式，兼容 Excel" :
                           fmt === "json" ? "结构化格式，适合开发" :
                           "Excel 原生格式，带样式"}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">导出预览</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">数据源</span>
                      <span className="font-medium">{selectedSourceInfo?.label || selectedSource}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">格式</span>
                      <span className="font-medium uppercase">{format}</span>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">开始日期</Label>
                      <Input type="date" className="h-7 text-xs" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">结束日期</Label>
                      <Input type="date" className="h-7 text-xs" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">最大行数</span>
                      <Select value={String(exportLimit)} onValueChange={v => setExportLimit(Number(v))}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1000">1,000</SelectItem>
                          <SelectItem value="5000">5,000</SelectItem>
                          <SelectItem value="10000">10,000</SelectItem>
                          <SelectItem value="50000">50,000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />数据脱敏
                      </span>
                      <Switch checked={enableMasking} onCheckedChange={setEnableMasking} />
                    </div>
                    {enableMasking && (
                      <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded">
                        已启用脱敏：手机号、邮箱、设备ID、IP等敏感字段将自动脱敏处理
                      </p>
                    )}
                  </div>
                  <Button className="w-full" onClick={handleExport} disabled={exportMutation.isPending}>
                    {exportMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />导出中...</>
                    ) : (
                      <><Download className="h-4 w-4 mr-2" />开始导出</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 导出历史 Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">导出历史</CardTitle>
                  <CardDescription>查看和下载历史导出文件（文件保留 7 天）</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => refetchHistory()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  刷新
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!exportHistory?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">暂无导出记录</p>
                  <p className="text-xs mt-1">创建第一个导出任务开始使用</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {exportHistory.map((item: Record<string,unknown>) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {formatIcon(item.format)}
                        <div>
                          <div className="text-sm font-medium">{item.dataSourceLabel || item.dataSource}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(item.createdAt).toLocaleString("zh-CN")}
                            {item.totalRows !== null && item.totalRows !== undefined && (
                              <><span>·</span><span>{item.totalRows} 行</span></>
                            )}
                            <span>·</span>
                            <span className="uppercase">{item.format}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(item.status)}
                        {item.status === "completed" && item.fileUrl && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => downloadFile(item.fileUrl, `${item.dataSource}.${item.format}`)}>
                            <Download className="h-3 w-3 mr-1" />
                            下载
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 定时导出 Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">定时导出配置</CardTitle>
                  <CardDescription>设置自动定时导出任务，系统将按计划自动生成导出文件</CardDescription>
                </div>
                <Button size="sm" onClick={() => {
                  setScheduleForm({
                    name: "",
                    dataSource: "game_users",
                    format: "csv",
                    frequency: "daily",
                    dayOfWeek: 1,
                    dayOfMonth: 1,
                    hour: 8,
                  });
                  setShowScheduleDialog(true);
                }}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  新建定时导出
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!schedules?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">暂无定时导出配置</p>
                  <p className="text-xs mt-1">创建定时导出任务，系统将按计划自动生成报表</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(schedules ?? []).map((sch: Record<string,unknown>) => (
                    <div key={sch.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {formatIcon(sch.format)}
                        <div>
                          <div className="text-sm font-medium">{sch.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <CalendarClock className="h-3 w-3" />
                            <span>{frequencyLabel[sch.frequency] || sch.frequency}</span>
                            {sch.frequency === "weekly" && (
                              <span>{dayOfWeekLabel[sch.dayOfWeek] || ""}</span>
                            )}
                            {sch.frequency === "monthly" && (
                              <span>{sch.dayOfMonth}号</span>
                            )}
                            <span>{sch.hour}:00</span>
                            <span>·</span>
                            <span className="uppercase">{sch.format}</span>
                            <span>·</span>
                            <span>{sch.dataSourceLabel || sch.dataSource}</span>
                            {sch.totalRuns > 0 && (
                              <><span>·</span><span>已执行 {sch.totalRuns} 次</span></>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{sch.enabled ? "已启用" : "已暂停"}</span>
                          <Switch
                            checked={!!sch.enabled}
                            onCheckedChange={(checked) =>
                              updateScheduleMutation.mutate({ id: sch.id, enabled: checked ? 1 : 0 })
                            }
                          />
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                          onClick={() => deleteScheduleMutation.mutate({ id: sch.id })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* 脱敏规则 Tab */}
        <TabsContent value="masking" className="space-y-4">
          <MaskingRulesTab />
        </TabsContent>
      </Tabs>

      {/* 新建定时导出对话框 */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建定时导出</DialogTitle>
            <DialogDescription>配置自动导出任务，系统将按计划生成并存储导出文件</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">任务名称</label>
              <Input
                placeholder="例如：每日用户数据导出"
                value={scheduleForm.name}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">数据源</label>
              <Select value={scheduleForm.dataSource} onValueChange={(v) => setScheduleForm(prev => ({ ...prev, dataSource: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dataSources?.map((ds: Record<string,unknown>) => (
                    <SelectItem key={ds.id} value={ds.id}>{ds.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">导出格式</label>
                <Select value={scheduleForm.format} onValueChange={(v: any) => setScheduleForm(prev => ({ ...prev, format: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">频率</label>
                <Select value={scheduleForm.frequency} onValueChange={(v: any) => setScheduleForm(prev => ({ ...prev, frequency: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">每天</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                    <SelectItem value="monthly">每月</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {scheduleForm.frequency === "weekly" && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">星期几</label>
                <Select value={String(scheduleForm.dayOfWeek)} onValueChange={(v) => setScheduleForm(prev => ({ ...prev, dayOfWeek: Number(v) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 0].map(d => (
                      <SelectItem key={d} value={String(d)}>{dayOfWeekLabel[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {scheduleForm.frequency === "monthly" && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">每月几号</label>
                <Select value={String(scheduleForm.dayOfMonth)} onValueChange={(v) => setScheduleForm(prev => ({ ...prev, dayOfMonth: Number(v) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                      <SelectItem key={d} value={String(d)}>{d}号</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">执行时间（小时）</label>
              <Select value={String(scheduleForm.hour)} onValueChange={(v) => setScheduleForm(prev => ({ ...prev, hour: Number(v) }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i).map(h => (
                    <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>取消</Button>
            <Button onClick={handleCreateSchedule} disabled={createScheduleMutation.isPending}>
              {createScheduleMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />创建中...</>
              ) : (
                "创建"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 脱敏规则管理 Tab ====================
const MASKING_TYPES = [
  { value: "phone", label: "手机号", example: "138****5678" },
  { value: "email", label: "邮箱", example: "ab***@example.com" },
  { value: "device_id", label: "设备ID", example: "ABCD1234****5678" },
  { value: "ip", label: "IP地址", example: "192.168.*.*" },
  { value: "name", label: "姓名", example: "张*三" },
  { value: "id_card", label: "身份证", example: "110101********1234" },
  { value: "custom", label: "自定义正则", example: "自定义替换" },
];

function MaskingRulesTab() {
  const { currentGameId } = useGame();
  const [showCreate, setShowCreate] = useState(false);
  const [previewSource, setPreviewSource] = useState("");
  const [form, setForm] = useState({
    ruleName: "", dataSource: "game_users", fieldName: "", maskingType: "phone" as "phone" | "email" | "device_id" | "ip" | "name" | "id_card" | "custom",
    maskingPattern: "", replacement: "", priority: 0,
  });
  const utils = trpc.useUtils();
  const { data: rules, isLoading } = trpc.alertEnhancement.listMaskingRules.useQuery({ gameId: currentGameId ?? undefined });
  const { data: dataSources } = trpc.exportCenter.listDataSources.useQuery({ gameId: currentGameId ?? undefined });
  const { data: preview } = trpc.alertEnhancement.previewMasking.useQuery(
    { dataSource: previewSource, limit: 3 },
    { enabled: !!previewSource }
  );
  const createMut = trpc.alertEnhancement.createMaskingRule.useMutation({
    onSuccess: () => { toast.success("脱敏规则已创建"); setShowCreate(false); utils.alertEnhancement.listMaskingRules.invalidate(); },
    onError: (e: any) => toast.error("创建失败: " + e.message),
  });
  const updateMut = trpc.alertEnhancement.updateMaskingRule.useMutation({
    onSuccess: () => { toast.success("已更新"); utils.alertEnhancement.listMaskingRules.invalidate(); },
  });
  const deleteMut = trpc.alertEnhancement.deleteMaskingRule.useMutation({
    onSuccess: () => { toast.success("已删除"); utils.alertEnhancement.listMaskingRules.invalidate(); },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />数据脱敏规则
            </CardTitle>
            <CardDescription>配置导出时自动脱敏的字段和策略，保护敏感数据</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />新建规则</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规则名称</TableHead>
                  <TableHead>数据源</TableHead>
                  <TableHead>字段</TableHead>
                  <TableHead>脱敏类型</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules as Record<string, unknown>[])?.map((r: Record<string,unknown>) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.rule_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.data_source}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.field_name}</TableCell>
                    <TableCell>
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        {MASKING_TYPES.find(t => t.value === r.masking_type)?.label || r.masking_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.priority}</TableCell>
                    <TableCell>
                      <Switch checked={r.is_active === 1} onCheckedChange={(v) => updateMut.mutate({ id: r.id, isActive: v ? 1 : 0 })} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label="删除" className="h-8 w-8 text-red-500" onClick={() => { if (confirm("确定删除？")) deleteMut.mutate({ id: r.id }); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!rules?.length && !isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    暂无脱敏规则。创建后，导出时启用脱敏开关即可自动脱敏。
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 脱敏预览 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />脱敏效果预览
          </CardTitle>
          <CardDescription>选择数据源查看脱敏前后对比</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={previewSource || "none"} onValueChange={v => setPreviewSource(v === "none" ? "" : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="选择数据源" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">选择数据源</SelectItem>
              {dataSources?.map((ds: Record<string,unknown>) => <SelectItem key={ds.id} value={ds.id}>{ds.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {preview && preview.rulesApplied > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><EyeOff className="h-3 w-3" />原始数据</p>
                <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-auto max-h-[200px]">
                  <pre>{JSON.stringify(preview.original, null, 2)}</pre>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1"><ShieldCheck className="h-3 w-3" />脱敏后数据</p>
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 text-xs font-mono overflow-auto max-h-[200px]">
                  <pre>{JSON.stringify(preview.masked, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
          {preview && preview.rulesApplied === 0 && previewSource && (
            <p className="text-sm text-muted-foreground">该数据源暂无脱敏规则，请先创建脱敏规则。</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建脱敏规则</DialogTitle>
            <DialogDescription>配置导出时自动脱敏的字段和策略</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>规则名称</Label><Input placeholder="如：用户手机号脱敏" value={form.ruleName} onChange={e => setForm({...form, ruleName: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>数据源</Label>
                <Select value={form.dataSource} onValueChange={v => setForm({...form, dataSource: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{dataSources?.map((ds: Record<string,unknown>) => <SelectItem key={ds.id} value={ds.id}>{ds.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>字段名</Label><Input placeholder="如：phone, email" value={form.fieldName} onChange={e => setForm({...form, fieldName: e.target.value})} /></div>
            </div>
            <div className="space-y-2">
              <Label>脱敏类型</Label>
              <div className="grid grid-cols-2 gap-2">
                {MASKING_TYPES.map(t => (
                  <div key={t.value} className={`p-2 rounded border cursor-pointer transition-all text-xs ${form.maskingType === t.value ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/50 hover:bg-muted'}`}
                    onClick={() => setForm({...form, maskingType: t.value as "name" | "email" | "phone" | "device_id" | "ip" | "id_card" | "custom"})}>
                    <div className="font-medium">{t.label}</div>
                    <div className="text-muted-foreground text-[10px]">{t.example}</div>
                  </div>
                ))}
              </div>
            </div>
            {form.maskingType === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>正则表达式</Label><Input placeholder="如：(\d{3})\d{4}(\d{4})" value={form.maskingPattern} onChange={e => setForm({...form, maskingPattern: e.target.value})} /></div>
                <div className="space-y-2"><Label>替换模式</Label><Input placeholder="如：$1****$2" value={form.replacement} onChange={e => setForm({...form, replacement: e.target.value})} /></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={!form.ruleName || !form.fieldName}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
