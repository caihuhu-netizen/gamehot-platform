import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Clock, Play, Pause, Plus, Trash2, Settings, RefreshCw, Search,
  CheckCircle2, XCircle, AlertTriangle, Timer, BarChart3, Zap,
  CalendarClock, Activity, Loader2, ChevronDown, ChevronUp, } from "lucide-react";

// ── Cron Presets ──
const CRON_PRESETS = [
  { label: "每分钟", labelEn: "Every minute", cron: "* * * * *" },
  { label: "每30分钟", labelEn: "Every 30 min", cron: "*/30 * * * *" },
  { label: "每小时", labelEn: "Every hour", cron: "0 * * * *" },
  { label: "每6小时", labelEn: "Every 6 hours", cron: "0 */6 * * *" },
  { label: "每天9:00", labelEn: "Daily 9:00", cron: "0 9 * * *" },
  { label: "每天2:00", labelEn: "Daily 2:00", cron: "0 2 * * *" },
  { label: "每周一10:00", labelEn: "Mon 10:00", cron: "0 10 * * 1" },
  { label: "每月1日3:00", labelEn: "1st 3:00", cron: "0 3 1 * *" },
];

function parseCronDescription(cron: string): string {
  const parts = cron.split(" ");
  if (parts.length < 5) return cron;
  const [min, hour, dom, mon, dow] = parts;
  if (cron === "* * * * *") return "每分钟";
  if (min.startsWith("*/")) return `每${min.slice(2)}分钟`;
  if (hour.startsWith("*/") && min === "0") return `每${hour.slice(2)}小时`;
  const dowNames = ["日", "一", "二", "三", "四", "五", "六"];
  let desc = "";
  if (dom !== "*" && mon === "*") desc += `每月${dom}日 `;
  if (dow !== "*") desc += `每周${dowNames[parseInt(dow)] ?? dow} `;
  if (dom === "*" && dow === "*") desc += "每天 ";
  if (hour !== "*") desc += `${hour.padStart(2, "0")}:`;
  if (min !== "*") desc += min.padStart(2, "0");
  else desc += "00";
  return desc.trim() || cron;
}

function StatusBadge({ status }: { status: string }) {
  const { currentGameId } = useGame();
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any; label: string }> = {
    idle: { variant: "secondary", icon: Clock, label: "空闲" },
    running: { variant: "default", icon: Loader2, label: "运行中" },
    success: { variant: "outline", icon: CheckCircle2, label: "成功" },
    failed: { variant: "destructive", icon: XCircle, label: "失败" },
    timeout: { variant: "destructive", icon: AlertTriangle, label: "超时" },
    cancelled: { variant: "secondary", icon: Pause, label: "已取消" },
  };
  const s = map[status] ?? map.idle;
  const Icon = s.icon;
  return (
    <Badge variant={s.variant} className="gap-1">
      <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
      {s.label}
    </Badge>
  );
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTime(ts: number | null | undefined): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Task Form Dialog ──
function TaskFormDialog({ open, onClose, taskTypes, editTask }: {
  open: boolean; onClose: () => void;
  taskTypes: Array<{ type: string; label: string; labelEn: string; defaultCron: string; defaultTimeout: number; description: string }>;
  editTask?: any;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    name: editTask?.name ?? "",
    description: editTask?.description ?? "",
    taskType: editTask?.taskType ?? "",
    handler: editTask?.handler ?? "",
    cronExpression: editTask?.cronExpression ?? "0 9 * * *",
    timezone: editTask?.timezone ?? "Asia/Shanghai",
    timeoutSeconds: editTask?.timeoutSeconds ?? 300,
    maxRetries: editTask?.maxRetries ?? 3,
  });

  const createMut = trpc.scheduler.create.useMutation({
    onSuccess: () => { utils.scheduler.list.invalidate(); onClose(); toast.success("任务创建成功"); },
    onError: (e) => toast.error("创建失败: " + e.message),
  });
  const updateMut = trpc.scheduler.update.useMutation({
    onSuccess: () => { utils.scheduler.list.invalidate(); onClose(); toast.success("任务更新成功"); },
    onError: (e) => toast.error("更新失败: " + e.message),
  });

  const handleTypeChange = (type: string) => {
    const info = taskTypes.find(t => t.type === type);
    if (info) {
      setForm(f => ({
        ...f,
        taskType: type,
        handler: `builtin:${type}`,
        name: f.name || info.label,
        description: f.description || info.description,
        cronExpression: info.defaultCron,
        timeoutSeconds: info.defaultTimeout,
      }));
    }
  };

  const handleSubmit = () => {
    if (!form.name || !form.taskType || !form.cronExpression) {
      toast.error("请填写必填字段");
      return;
    }
    if (editTask) {
      updateMut.mutate({ id: editTask.id, ...form });
    } else {
      createMut.mutate(form);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            {editTask ? "编辑任务" : "创建定时任务"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!editTask && (
            <div>
              <Label>任务类型 *</Label>
              <Select value={form.taskType} onValueChange={handleTypeChange}>
                <SelectTrigger><SelectValue placeholder="选择任务类型" /></SelectTrigger>
                <SelectContent>
                  {taskTypes.map(t => (
                    <SelectItem key={t.type} value={t.type}>
                      <span className="font-medium">{t.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{t.description}</span>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">自定义任务</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>任务名称 *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="输入任务名称" />
          </div>
          <div>
            <Label>描述</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="任务描述" rows={2} />
          </div>
          <div>
            <Label>Cron 表达式 *</Label>
            <Input value={form.cronExpression} onChange={e => setForm(f => ({ ...f, cronExpression: e.target.value }))} placeholder="0 9 * * *" className="font-mono" />
            <div className="flex flex-wrap gap-1 mt-2">
              {CRON_PRESETS.map(p => (
                <Button key={p.cron} variant="outline" size="sm" className="text-xs h-6"
                  onClick={() => setForm(f => ({ ...f, cronExpression: p.cron }))}>
                  {p.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              当前: {parseCronDescription(form.cronExpression)}
            </p>
          </div>
          {form.taskType === "custom" && (
            <div>
              <Label>Handler</Label>
              <Input value={form.handler} onChange={e => setForm(f => ({ ...f, handler: e.target.value }))} placeholder="custom:my_handler" className="font-mono" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>超时时间(秒)</Label>
              <Input type="number" value={form.timeoutSeconds} onChange={e => setForm(f => ({ ...f, timeoutSeconds: parseInt(e.target.value) || 300 }))} />
            </div>
            <div>
              <Label>最大重试次数</Label>
              <Input type="number" value={form.maxRetries} onChange={e => setForm(f => ({ ...f, maxRetries: parseInt(e.target.value) || 3 }))} />
            </div>
          </div>
          <div>
            <Label>时区</Label>
            <Select value={form.timezone} onValueChange={v => setForm(f => ({ ...f, timezone: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
            {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {editTask ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──
export default function SchedulerCenter() {
  const { currentGameId } = useGame();
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState("tasks");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [logFilter, setLogFilter] = useState<{ taskId?: number; status?: string }>({});

  const { data: tasks = [], isLoading: tasksLoading } = trpc.scheduler.list.useQuery({ gameId: currentGameId ?? undefined });
  const { data: taskTypes = [] } = trpc.scheduler.getTaskTypes.useQuery({ gameId: currentGameId ?? undefined });
  const { data: stats } = trpc.scheduler.stats.useQuery({});
  const { data: logsData } = trpc.scheduler.logs.useQuery({
    taskId: logFilter.taskId,
    status: logFilter.status,
    limit: 50,
    gameId: currentGameId ?? undefined,
  });

  const toggleMut = trpc.scheduler.toggle.useMutation({
    onSuccess: () => utils.scheduler.list.invalidate(),
  });
  const deleteMut = trpc.scheduler.delete.useMutation({
    onSuccess: () => { utils.scheduler.list.invalidate(); toast.success("任务已删除"); },
  });
  const triggerMut = trpc.scheduler.trigger.useMutation({
    onSuccess: () => {
      utils.scheduler.list.invalidate();
      utils.scheduler.logs.invalidate();
      toast.success("任务已触发执行");
    },
    onError: (e) => toast.error("触发失败: " + e.message),
  });
  const seedMut = trpc.scheduler.seedBuiltInTasks.useMutation({
    onSuccess: (data) => {
      utils.scheduler.list.invalidate();
      toast.success(`已初始化 ${data.created} 个内置任务`);
    },
  });
  const cleanupMut = trpc.scheduler.cleanupLogs.useMutation({
    onSuccess: (data) => {
      utils.scheduler.logs.invalidate();
      toast.success(`已清理 ${data.deleted} 条日志`);
    },
  });

  const filteredTasks = useMemo(() => {
    if (!search) return tasks;
    const q = search.toLowerCase();
    return tasks.filter((t: any) =>
      t.name?.toLowerCase().includes(q) ||
      t.taskType?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const enabledCount = tasks.filter((t: any) => t.enabled).length;
  const runningCount = tasks.filter((t: any) => t.lastStatus === "running").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            定时任务调度中心
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            统一管理AI巡检、数据同步、异常检测等定时任务
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {tasks.length === 0 && (
            <Button variant="outline" onClick={() => seedMut.mutate({})} disabled={seedMut.isPending}>
              <Zap className="h-4 w-4 mr-1" />
              初始化内置任务
            </Button>
          )}
          <Button onClick={() => { setEditTask(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            新建任务
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Activity className="h-4 w-4" /> 总任务数
            </div>
            <div className="text-2xl font-bold mt-1">{tasks.length}</div>
            <div className="text-xs text-muted-foreground">{enabledCount} 已启用 / {runningCount} 运行中</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> 7天成功率
            </div>
            <div className="text-2xl font-bold mt-1 text-green-600">
              {stats && stats.total > 0 ? `${((stats.success / stats.total) * 100).toFixed(1)}%` : "-"}
            </div>
            <div className="text-xs text-muted-foreground">{stats?.success ?? 0} / {stats?.total ?? 0} 次执行</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <XCircle className="h-4 w-4 text-red-500" /> 7天失败数
            </div>
            <div className="text-2xl font-bold mt-1 text-red-600">{(stats?.failed ?? 0) + (stats?.timeout ?? 0)}</div>
            <div className="text-xs text-muted-foreground">{stats?.failed ?? 0} 失败 / {stats?.timeout ?? 0} 超时</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Timer className="h-4 w-4" /> 平均耗时
            </div>
            <div className="text-2xl font-bold mt-1">{formatDuration(stats?.avgDuration)}</div>
            <div className="text-xs text-muted-foreground">最近7天</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="tasks" className="gap-1"><Settings className="h-4 w-4" /> 任务管理</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1"><BarChart3 className="h-4 w-4" /> 执行日志</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索任务名称、类型..." className="pl-9" />
            </div>
            <Button variant="outline" size="icon" aria-label="刷新" onClick={() => utils.scheduler.list.invalidate()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {tasksLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>暂无定时任务</p>
                <p className="text-sm mt-1">点击"初始化内置任务"快速创建常用任务，或手动新建</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task: any) => (
                <Card key={task.id} className={`transition-all ${!task.enabled ? "opacity-60" : ""}`}>
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Left: Status + Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{task.name}</h3>
                          <Badge variant="outline" className="text-xs">{task.taskType}</Badge>
                          <StatusBadge status={task.lastStatus ?? "idle"} />
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <code className="bg-muted px-1 rounded">{task.cronExpression}</code>
                            <span>({parseCronDescription(task.cronExpression)})</span>
                          </span>
                          <span>下次: {formatTime(task.nextRunAt)}</span>
                          <span>上次: {formatTime(task.lastRunAt)}</span>
                          <span>执行: {task.totalRuns}次 (成功{task.totalSuccess})</span>
                          {task.avgDurationMs > 0 && <span>均耗时: {formatDuration(task.avgDurationMs)}</span>}
                        </div>
                      </div>
                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={!!task.enabled}
                          onCheckedChange={(checked) => toggleMut.mutate({ id: task.id, enabled: checked ? 1 : 0 })} />
                        <Button variant="outline" size="sm" onClick={() => triggerMut.mutate({ id: task.id })}
                          disabled={triggerMut.isPending}>
                          <Play className="h-3.5 w-3.5 mr-1" /> 执行
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="设置" className="h-8 w-8"
                          onClick={() => { setEditTask(task); setShowForm(true); }}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="删除" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm(`确定删除任务 "${task.name}"？`)) deleteMut.mutate({ id: task.id }); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={logFilter.taskId?.toString() ?? "all"} onValueChange={v => setLogFilter(f => ({ ...f, taskId: v === "all" ? undefined : parseInt(v) }))}>
              <SelectTrigger className="w-48"><SelectValue placeholder="全部任务" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部任务</SelectItem>
                {tasks.map((t: any) => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={logFilter.status ?? "all"} onValueChange={v => setLogFilter(f => ({ ...f, status: v === "all" ? undefined : v }))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="全部状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
                <SelectItem value="timeout">超时</SelectItem>
                <SelectItem value="running">运行中</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => utils.scheduler.logs.invalidate()}>
              <RefreshCw className="h-4 w-4 mr-1" /> 刷新
            </Button>
            <Button variant="outline" size="sm" onClick={() => cleanupMut.mutate({ beforeDays: 30 })} disabled={cleanupMut.isPending}>
              <Trash2 className="h-4 w-4 mr-1" /> 清理30天前日志
            </Button>
          </div>

          {!logsData?.logs?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>暂无执行日志</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">共 {logsData.total} 条记录</p>
              {logsData.logs.map((log: any) => {
                const taskName = tasks.find((t: any) => t.id === log.taskId)?.name ?? `Task #${log.taskId}`;
                const isExpanded = expandedLog === log.id;
                return (
                  <Card key={log.id} className="cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={log.status} />
                        <span className="font-medium text-sm truncate">{taskName}</span>
                        <Badge variant="outline" className="text-xs">{log.triggerType === "manual" ? "手动" : "定时"}</Badge>
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">
                          {formatTime(log.startedAt)}
                        </span>
                        {log.durationMs != null && (
                          <span className="text-xs text-muted-foreground shrink-0">{formatDuration(log.durationMs)}</span>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-muted-foreground">开始时间:</span> {formatTime(log.startedAt)}</div>
                            <div><span className="text-muted-foreground">结束时间:</span> {formatTime(log.finishedAt)}</div>
                            <div><span className="text-muted-foreground">触发方式:</span> {log.triggerType === "manual" ? "手动触发" : "定时调度"}</div>
                            <div><span className="text-muted-foreground">触发人:</span> {log.triggeredBy ?? "system"}</div>
                            {log.retryAttempt > 0 && <div><span className="text-muted-foreground">重试次数:</span> {log.retryAttempt}</div>}
                          </div>
                          {log.resultSummary && (
                            <div>
                              <span className="text-muted-foreground text-xs">执行摘要:</span>
                              <pre className="mt-1 p-2 bg-muted rounded text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">{log.resultSummary}</pre>
                            </div>
                          )}
                          {log.errorMessage && (
                            <div>
                              <span className="text-destructive text-xs">错误信息:</span>
                              <pre className="mt-1 p-2 bg-destructive/10 rounded text-xs text-destructive whitespace-pre-wrap max-h-40 overflow-y-auto">{log.errorMessage}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Task Form Dialog */}
      {showForm && (
        <TaskFormDialog
          open={showForm}
          onClose={() => { setShowForm(false); setEditTask(null); }}
          taskTypes={taskTypes}
          editTask={editTask}
        />
      )}
    </div>
  );
}
