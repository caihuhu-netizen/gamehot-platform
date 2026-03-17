import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Database, Link2, RefreshCw, Play, Plus, Trash2, Settings, CheckCircle2,
  XCircle, Clock, AlertTriangle, ArrowDownUp, Zap, Shield, Eye,
  ChevronRight, Loader2, Network, Users, BarChart3, Tag, } from "lucide-react";

// ==================== 连接管理 Tab ====================
function ConnectionsTab() {
  const { currentGameId } = useGame();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    gameId: 1, connectionName: "", teProjectId: "", teApiUrl: "",
    teApiToken: "", teDataUrl: "", idMappingField: "#account_id",
  });

  const { data: connections, refetch } = trpc.teIntegration.listConnections.useQuery({});
  const createMut = trpc.teIntegration.createConnection.useMutation({
    onSuccess: () => { toast.success("连接创建成功"); setShowCreate(false); refetch(); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.teIntegration.deleteConnection.useMutation({
    onSuccess: () => { toast.success("已删除"); refetch(); },
  });
  const activateMut = trpc.teIntegration.activateConnection.useMutation({
    onSuccess: (r) => { r.success ? toast.success("连接已激活") : toast.error(r.message); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const testMut = trpc.teIntegration.testConnection.useMutation({
    onSuccess: (r) => { r.success ? toast.success("连接测试成功") : toast.error(`测试失败: ${r.message}`); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => setForm({ gameId: 1, connectionName: "", teProjectId: "", teApiUrl: "", teApiToken: "", teDataUrl: "", idMappingField: "#account_id" });

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any; label: string }> = {
      ACTIVE: { variant: "default", icon: CheckCircle2, label: "已激活" },
      INACTIVE: { variant: "secondary", icon: Clock, label: "未激活" },
      ERROR: { variant: "destructive", icon: XCircle, label: "异常" },
    };
    const s = map[status] || map.INACTIVE;
    return <Badge variant={s.variant} className="gap-1"><s.icon className="h-3 w-3" />{s.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">TE 连接管理</h3>
          <p className="text-sm text-muted-foreground">管理与数数科技 ThinkingEngine 的 API 连接</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" />新建连接</Button>
      </div>

      {(!connections || connections.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Database className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h4 className="font-medium mb-1">暂无 TE 连接</h4>
            <p className="text-sm text-muted-foreground mb-4">创建一个连接以开始同步数数科技数据</p>
            <Button onClick={() => setShowCreate(true)} variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />创建连接</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((conn: any) => (
            <Card key={conn.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${conn.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : conn.status === 'ERROR' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{conn.connectionName}</h4>
                        {statusBadge(conn.status)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <div>项目ID: <span className="font-mono">{conn.teProjectId}</span></div>
                        <div>API 地址: <span className="font-mono">{conn.teApiUrl}</span></div>
                        <div>ID 映射: <span className="font-mono">{conn.idMappingField}</span></div>
                        {conn.lastSyncAt && <div>最后同步: {new Date(conn.lastSyncAt).toLocaleString()}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" aria-label="加载中" className="h-8 w-8"
                      onClick={() => testMut.mutate({ apiUrl: conn.teApiUrl, apiToken: conn.teApiToken, projectId: conn.teProjectId })}
                      disabled={testMut.isPending}>
                      {testMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    </Button>
                    {conn.status !== 'ACTIVE' && (
                      <Button variant="ghost" size="icon" aria-label="播放" className="h-8 w-8 text-green-600"
                        onClick={() => activateMut.mutate({ id: conn.id })} disabled={activateMut.isPending}>
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" aria-label="删除" className="h-8 w-8 text-destructive"
                      onClick={() => { if (confirm('确定删除此连接？')) deleteMut.mutate({ id: conn.id }); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建 TE 连接</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>连接名称</Label>
              <Input placeholder="例: Color Block Jam 生产环境" value={form.connectionName} onChange={e => setForm(f => ({ ...f, connectionName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>TE 项目 APPID</Label>
                <Input placeholder="例: 12345" value={form.teProjectId} onChange={e => setForm(f => ({ ...f, teProjectId: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>游戏项目ID</Label>
                <Input type="number" value={form.gameId} onChange={e => setForm(f => ({ ...f, gameId: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>TE Open API 地址</Label>
              <Input placeholder="http://your-te-server:8992" value={form.teApiUrl} onChange={e => setForm(f => ({ ...f, teApiUrl: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>API Token (Secret)</Label>
              <Input type="password" placeholder="通过 ta-tool 生成的 API Secret" value={form.teApiToken} onChange={e => setForm(f => ({ ...f, teApiToken: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>数据接入地址 (可选，用于回传)</Label>
              <Input placeholder="http://your-te-server:8991" value={form.teDataUrl} onChange={e => setForm(f => ({ ...f, teDataUrl: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>ID 映射字段</Label>
              <Select value={form.idMappingField} onValueChange={v => setForm(f => ({ ...f, idMappingField: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="#account_id">#account_id (账号ID)</SelectItem>
                  <SelectItem value="#distinct_id">#distinct_id (设备ID)</SelectItem>
                  <SelectItem value="user_id">user_id (自定义)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => testMut.mutate({ apiUrl: form.teApiUrl, apiToken: form.teApiToken, projectId: form.teProjectId })}
              disabled={testMut.isPending || !form.teApiUrl || !form.teApiToken}>
              {testMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}测试连接
            </Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.connectionName || !form.teProjectId || !form.teApiUrl || !form.teApiToken}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 同步任务 Tab ====================
function SyncTasksTab() {
  const [selectedConn, setSelectedConn] = useState<number | null>(null);
  const { data: connections } = trpc.teIntegration.listConnections.useQuery({});
  const activeConns = useMemo(() => (connections || []).filter((c: any) => c.status === 'ACTIVE'), [connections]);

  const connId = selectedConn || activeConns?.[0]?.id;
  const { data: tasks, refetch } = trpc.teIntegration.listSyncTasks.useQuery(
    { connectionId: connId! },
    { enabled: !!connId }
  );

  const createTask = trpc.teIntegration.createSyncTask.useMutation({
    onSuccess: () => { toast.success("同步任务已创建并执行"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [showLogs, setShowLogs] = useState<number | null>(null);
  const { data: logs } = trpc.teIntegration.getSyncLogs.useQuery(
    { taskId: showLogs! },
    { enabled: !!showLogs }
  );

  const taskTypeLabels: Record<string, { label: string; icon: any; color: string }> = {
    USER_SYNC: { label: "用户同步", icon: Users, color: "text-blue-600 bg-blue-50" },
    EVENT_SYNC: { label: "事件同步", icon: BarChart3, color: "text-purple-600 bg-purple-50" },
    SEGMENT_WRITEBACK: { label: "分层回写", icon: Tag, color: "text-orange-600 bg-orange-50" },
    LABEL_WRITEBACK: { label: "标签回写", icon: Tag, color: "text-teal-600 bg-teal-50" },
    FULL_SYNC: { label: "全量同步", icon: RefreshCw, color: "text-green-600 bg-green-50" },
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PENDING: { variant: "secondary", label: "等待中" },
      RUNNING: { variant: "outline", label: "执行中" },
      SUCCESS: { variant: "default", label: "成功" },
      FAILED: { variant: "destructive", label: "失败" },
      CANCELLED: { variant: "secondary", label: "已取消" },
    };
    const s = map[status] || map.PENDING;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (!activeConns || activeConns.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-400 mb-4" />
          <h4 className="font-medium mb-1">无可用连接</h4>
          <p className="text-sm text-muted-foreground">请先在"连接管理"中创建并激活一个 TE 连接</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Select value={String(connId)} onValueChange={v => setSelectedConn(Number(v))}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="选择连接" /></SelectTrigger>
            <SelectContent>
              {activeConns.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.connectionName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {(['USER_SYNC', 'EVENT_SYNC', 'SEGMENT_WRITEBACK', 'FULL_SYNC'] as const).map(type => {
            const t = taskTypeLabels[type];
            return (
              <Button key={type} variant="outline" size="sm"
                onClick={() => connId && createTask.mutate({ connectionId: connId, taskType: type, direction: type.includes('WRITEBACK') ? 'PUSH' : 'PULL' })}
                disabled={createTask.isPending || !connId}>
                <t.icon className="h-3.5 w-3.5 mr-1" />{t.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        {(!tasks || tasks.length === 0) ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>暂无同步任务记录</p>
            </CardContent>
          </Card>
        ) : tasks.map((task: any) => {
          const tt = taskTypeLabels[task.taskType] || taskTypeLabels.USER_SYNC;
          return (
            <Card key={task.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${tt.color}`}>
                      <tt.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{tt.label}</span>
                        {statusBadge(task.status)}
                        <Badge variant="outline" className="text-xs">{task.direction === 'PUSH' ? 'CDP→TE' : 'TE→CDP'}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {task.processedRecords}/{task.totalRecords} 条 · {new Date(task.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowLogs(task.id)}>
                    <Eye className="h-3.5 w-3.5 mr-1" />日志
                  </Button>
                </div>
                {task.progress > 0 && task.progress < 100 && (
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${task.progress}%` }} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!showLogs} onOpenChange={() => setShowLogs(null)}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>同步日志</DialogTitle></DialogHeader>
          <div className="space-y-1 font-mono text-xs">
            {logs?.map((log: any, i: number) => (
              <div key={i} className={`flex gap-2 py-1 px-2 rounded ${log.logLevel === 'ERROR' ? 'bg-red-50 text-red-700' : log.logLevel === 'WARN' ? 'bg-amber-50 text-amber-700' : 'text-muted-foreground'}`}>
                <span className="text-[10px] opacity-60 shrink-0">{new Date(log.createdAt).toLocaleTimeString()}</span>
                <span className={`shrink-0 w-10 ${log.logLevel === 'ERROR' ? 'text-red-600 font-bold' : ''}`}>[{log.logLevel}]</span>
                <span className="break-all">{log.message}</span>
              </div>
            ))}
            {(!logs || logs.length === 0) && <p className="text-muted-foreground text-center py-4">暂无日志</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 分层联动 Tab ====================
function LinkageRulesTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [showExecHistory, setShowExecHistory] = useState<number | null>(null);
  const [form, setForm] = useState({
    gameId: 1, ruleName: "", ruleType: "SCHEDULED" as "REALTIME" | "SCHEDULED" | "EVENT_DRIVEN",
    sourceType: "CDP" as "CDP" | "TE" | "HYBRID", priority: 0,
    triggerType: "cron", triggerValue: "0 3 * * *",
    actions: [{ type: "TE_WRITEBACK", config: {} }] as Array<{ type: string; config: Record<string, unknown> }>,
    targetLayers: [] as string[],
  });

  const { data: rules, refetch } = trpc.teIntegration.listLinkageRules.useQuery({});
  const createMut = trpc.teIntegration.createLinkageRule.useMutation({
    onSuccess: () => { toast.success("规则创建成功"); setShowCreate(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.teIntegration.deleteLinkageRule.useMutation({
    onSuccess: () => { toast.success("已删除"); refetch(); },
  });
  const toggleMut = trpc.teIntegration.toggleLinkageRule.useMutation({
    onSuccess: () => { refetch(); },
  });
  const executeMut = trpc.teIntegration.executeLinkageRule.useMutation({
    onSuccess: (r) => { toast.success(`执行完成，影响 ${r.affectedUsers} 名用户`); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const { data: executions } = trpc.teIntegration.listLinkageExecutions.useQuery(
    { ruleId: showExecHistory! },
    { enabled: !!showExecHistory }
  );

  const ruleTypeLabels: Record<string, { label: string; icon: any; color: string }> = {
    REALTIME: { label: "实时", icon: Zap, color: "text-amber-600 bg-amber-50" },
    SCHEDULED: { label: "定时", icon: Clock, color: "text-blue-600 bg-blue-50" },
    EVENT_DRIVEN: { label: "事件驱动", icon: ArrowDownUp, color: "text-purple-600 bg-purple-50" },
  };

  const actionTypeLabels: Record<string, string> = {
    TE_WRITEBACK: "回写TE标签",
    SDK_PUSH: "SDK下发配置",
    WEBHOOK: "Webhook回调",
    NOTIFY: "通知运营",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">分层联动规则</h3>
          <p className="text-sm text-muted-foreground">配置用户分层变更后的自动化联动动作</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" />新建规则</Button>
      </div>

      {(!rules || rules.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Network className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h4 className="font-medium mb-1">暂无联动规则</h4>
            <p className="text-sm text-muted-foreground mb-4">创建规则以实现分层变更后的自动化联动</p>
            <Button onClick={() => setShowCreate(true)} variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />创建规则</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule: any) => {
            const rt = ruleTypeLabels[rule.ruleType] || ruleTypeLabels.SCHEDULED;
            const actions = (rule.actions as Record<string, unknown>[]) || [];
            return (
              <Card key={rule.id} className={`transition-all ${rule.isActive ? 'hover:shadow-md' : 'opacity-60'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${rt.color}`}>
                        <rt.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{rule.ruleName}</h4>
                          <Badge variant="outline">{rt.label}</Badge>
                          <Badge variant={rule.sourceType === 'CDP' ? 'default' : rule.sourceType === 'TE' ? 'secondary' : 'outline'}>
                            {rule.sourceType}
                          </Badge>
                          {!rule.isActive && <Badge variant="secondary">已停用</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {actions.map((a: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs font-normal">
                              {actionTypeLabels[a.type] || a.type}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1.5 flex gap-3">
                          <span>优先级: {rule.priority}</span>
                          <span>执行次数: {rule.executionCount}</span>
                          {rule.lastExecutedAt && <span>最后执行: {new Date(rule.lastExecutedAt).toLocaleString()}</span>}
                          {rule.lastExecuteResult && (
                            <Badge variant={rule.lastExecuteResult === 'SUCCESS' ? 'default' : 'destructive'} className="text-[10px] h-4">
                              {rule.lastExecuteResult}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={!!rule.isActive}
                        onCheckedChange={(checked) => toggleMut.mutate({ id: rule.id, isActive: checked ? 1 : 0 })} />
                      <Button variant="ghost" size="icon" aria-label="播放" className="h-8 w-8"
                        onClick={() => executeMut.mutate({ ruleId: rule.id })}
                        disabled={executeMut.isPending || !rule.isActive}>
                        {executeMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="查看" className="h-8 w-8"
                        onClick={() => setShowExecHistory(rule.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="删除" className="h-8 w-8 text-destructive"
                        onClick={() => { if (confirm('确定删除此规则？')) deleteMut.mutate({ id: rule.id }); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 创建规则 Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新建联动规则</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>规则名称</Label>
              <Input placeholder="例: 鲸鱼用户分层变更回写TE" value={form.ruleName} onChange={e => setForm(f => ({ ...f, ruleName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>触发类型</Label>
                <Select value={form.ruleType} onValueChange={v => setForm(f => ({ ...f, ruleType: v as "REALTIME" | "SCHEDULED" | "EVENT_DRIVEN" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REALTIME">实时触发</SelectItem>
                    <SelectItem value="SCHEDULED">定时执行</SelectItem>
                    <SelectItem value="EVENT_DRIVEN">事件驱动</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>数据来源</Label>
                <Select value={form.sourceType} onValueChange={v => setForm(f => ({ ...f, sourceType: v as "CDP" | "TE" | "HYBRID" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CDP">CDP 分层</SelectItem>
                    <SelectItem value="TE">TE 分群</SelectItem>
                    <SelectItem value="HYBRID">混合</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>触发条件</Label>
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.triggerType} onValueChange={v => setForm(f => ({ ...f, triggerType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cron">Cron 表达式</SelectItem>
                    <SelectItem value="event">事件触发</SelectItem>
                    <SelectItem value="threshold">阈值触发</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder={form.triggerType === 'cron' ? '0 3 * * *' : form.triggerType === 'event' ? 'segment_change' : '0.8'}
                  value={form.triggerValue} onChange={e => setForm(f => ({ ...f, triggerValue: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>联动动作</Label>
              <div className="space-y-2">
                {form.actions.map((action, i) => (
                  <div key={i} className="flex gap-2">
                    <Select value={action.type} onValueChange={v => {
                      const newActions = [...form.actions];
                      newActions[i] = { ...newActions[i], type: v };
                      setForm(f => ({ ...f, actions: newActions }));
                    }}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TE_WRITEBACK">回写 TE 标签</SelectItem>
                        <SelectItem value="SDK_PUSH">SDK 下发配置</SelectItem>
                        <SelectItem value="WEBHOOK">Webhook 回调</SelectItem>
                        <SelectItem value="NOTIFY">通知运营</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.actions.length > 1 && (
                      <Button variant="ghost" size="icon" aria-label="删除" className="h-9 w-9 text-destructive shrink-0"
                        onClick={() => setForm(f => ({ ...f, actions: f.actions.filter((_, j) => j !== i) }))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full"
                  onClick={() => setForm(f => ({ ...f, actions: [...f.actions, { type: 'NOTIFY', config: {} }] }))}>
                  <Plus className="h-3.5 w-3.5 mr-1" />添加动作
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>目标分层 (留空=全部)</Label>
              <div className="flex flex-wrap gap-1.5">
                {['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'].map(layer => (
                  <Badge key={layer} variant={form.targetLayers.includes(layer) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setForm(f => ({
                      ...f,
                      targetLayers: f.targetLayers.includes(layer)
                        ? f.targetLayers.filter(l => l !== layer)
                        : [...f.targetLayers, layer]
                    }))}>
                    {layer}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>优先级</Label>
              <Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => createMut.mutate({
              ...form,
              triggerCondition: { type: form.triggerType, value: form.triggerValue },
              targetLayers: form.targetLayers.length > 0 ? form.targetLayers : undefined,
            })} disabled={createMut.isPending || !form.ruleName}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}创建规则
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 执行历史 Dialog */}
      <Dialog open={!!showExecHistory} onOpenChange={() => setShowExecHistory(null)}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>执行历史</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {executions?.map((exec: any) => (
              <Card key={exec.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={exec.status === 'SUCCESS' ? 'default' : exec.status === 'FAILED' ? 'destructive' : 'secondary'}>
                          {exec.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{exec.executionType}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        影响用户: {exec.affectedUsers} · 耗时: {exec.durationMs}ms · {new Date(exec.createdAt).toLocaleString()}
                      </div>
                      {exec.layerChangeSummary && (
                        <div className="flex gap-1.5 mt-1.5">
                          {Object.entries((exec.layerChangeSummary as Record<string, unknown>)?.byLayer || {}).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="text-[10px]">{k}: {v as number}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {exec.errorMessage && (
                    <div className="mt-2 text-xs text-destructive bg-red-50 rounded px-2 py-1">{exec.errorMessage}</div>
                  )}
                </CardContent>
              </Card>
            ))}
            {(!executions || executions.length === 0) && (
              <p className="text-center text-muted-foreground py-4">暂无执行记录</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 联动架构概览 Tab ====================
function ArchitectureTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">用户分层与业务环境联动架构</h3>
        <p className="text-sm text-muted-foreground">
          CDP 系统的用户分层通过以下四条路径与真实业务环境联动，形成"数据采集 → 分析洞察 → 运营决策 → 效果回传"的完整闭环。
        </p>
      </div>

      {/* 联动路径图 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <ArrowDownUp className="h-4 w-4 text-blue-600" />
              </div>
              路径一：TE 数据拉取 → CDP 分层计算
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>通过 TE Open API 定时拉取用户行为数据（关卡通过、付费、广告观看等），注入 CDP 分层引擎进行实时计算。</p>
            <div className="flex items-center gap-1 text-[11px] font-mono bg-muted/50 rounded px-2 py-1">
              <span className="text-blue-600">TE 事件表</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-purple-600">同步服务</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-green-600">CDP 行为表</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-orange-600">分层引擎</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <Tag className="h-4 w-4 text-orange-600" />
              </div>
              路径二：CDP 分层标签 → TE 用户属性回写
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>CDP 计算出的分层结果（L1-L7、鲸鱼/海豚/小鱼等）通过 TE REST API 回写为用户属性，供 TE 内部分析和分群使用。</p>
            <div className="flex items-center gap-1 text-[11px] font-mono bg-muted/50 rounded px-2 py-1">
              <span className="text-orange-600">CDP 分层</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-purple-600">回写服务</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-blue-600">TE user_set</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-green-600">TE 分群/看板</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Zap className="h-4 w-4 text-green-600" />
              </div>
              路径三：分层变更 → SDK 实时下发
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>当用户分层发生变更时，通过游戏 SDK 实时下发新的难度配置、变现策略和道具价格，客户端立即生效。</p>
            <div className="flex items-center gap-1 text-[11px] font-mono bg-muted/50 rounded px-2 py-1">
              <span className="text-orange-600">分层变更</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-purple-600">联动引擎</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-green-600">SDK Config</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-blue-600">游戏客户端</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Shield className="h-4 w-4 text-purple-600" />
              </div>
              路径四：预警检测 → 运营通知 → 人工干预
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>当检测到高价值用户退款、付费频率骤降或分层异常变动时，自动推送告警通知给运营人员，支持人工决策干预。</p>
            <div className="flex items-center gap-1 text-[11px] font-mono bg-muted/50 rounded px-2 py-1">
              <span className="text-orange-600">预警规则</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-red-600">告警引擎</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-purple-600">通知推送</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-green-600">运营决策</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ID 映射说明 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">用户 ID 映射机制</CardTitle>
          <CardDescription>CDP 与 TE 之间的用户身份打通</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="font-medium text-foreground">CDP 用户ID</div>
              <div className="font-mono bg-muted/50 rounded px-2 py-1">game_users.user_id</div>
              <div>CDP 系统内部唯一标识</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-foreground">TE distinct_id</div>
              <div className="font-mono bg-muted/50 rounded px-2 py-1">#distinct_id</div>
              <div>TE 设备级别唯一标识</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-foreground">TE account_id</div>
              <div className="font-mono bg-muted/50 rounded px-2 py-1">#account_id</div>
              <div>TE 账号级别唯一标识</div>
            </div>
          </div>
          <div className="mt-3 p-2 bg-blue-50 rounded text-blue-700">
            映射策略：游戏客户端在 TE SDK 初始化时设置 account_id = CDP userId，实现自动关联。同步服务通过 user_id_mappings 表维护映射关系，支持自动匹配和手动修正。
          </div>
        </CardContent>
      </Card>

      {/* 回写属性清单 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">CDP → TE 回写属性清单</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {[
              { key: "cdp_segment_level", desc: "分层等级 (L1-L7)" },
              { key: "cdp_segment_name", desc: "分层名称 (鲸鱼/海豚/...)" },
              { key: "cdp_pay_score", desc: "付费评分 (0-100)" },
              { key: "cdp_ad_score", desc: "广告评分 (0-100)" },
              { key: "cdp_skill_score", desc: "技能评分 (0-100)" },
              { key: "cdp_churn_risk", desc: "流失风险 (0-100)" },
              { key: "cdp_ltv_predict", desc: "LTV 预测值" },
              { key: "cdp_is_recovery", desc: "是否在挽回期" },
              { key: "cdp_updated_at", desc: "最后更新时间" },
            ].map(attr => (
              <div key={attr.key} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                <span className="font-mono text-primary">{attr.key}</span>
                <span className="text-muted-foreground">{attr.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 主页面 ====================
export default function TeIntegration() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">数数科技集成</h2>
        <p className="text-muted-foreground">管理 ThinkingData TE 连接、数据同步和分层联动</p>
      </div>

      <Tabs defaultValue="architecture" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="architecture" className="gap-1.5"><Network className="h-3.5 w-3.5" />联动架构</TabsTrigger>
          <TabsTrigger value="connections" className="gap-1.5"><Database className="h-3.5 w-3.5" />连接管理</TabsTrigger>
          <TabsTrigger value="sync" className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />同步任务</TabsTrigger>
          <TabsTrigger value="linkage" className="gap-1.5"><Zap className="h-3.5 w-3.5" />分层联动</TabsTrigger>
        </TabsList>

        <TabsContent value="architecture"><ArchitectureTab /></TabsContent>
        <TabsContent value="connections"><ConnectionsTab /></TabsContent>
        <TabsContent value="sync"><SyncTasksTab /></TabsContent>
        <TabsContent value="linkage"><LinkageRulesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
