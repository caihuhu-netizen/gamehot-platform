import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { History, Plus, Upload, RotateCcw, GitCompare, Eye, CheckCircle, Clock, Archive,
  ShieldAlert, Zap, Trash2, Settings2, FileText, AlertTriangle, } from "lucide-react";

const CONFIG_TYPES = [
  { value: 'FULL', label: '全量配置' },
  { value: 'SEGMENT_LOGIC', label: '分层逻辑' },
  { value: 'SEGMENT_BEHAVIOR', label: '行为策略' },
  { value: 'SEGMENT_CALC', label: '计算规则' },
  { value: 'DIFFICULTY', label: '难度映射' },
  { value: 'MONETIZE', label: '变现规则' },
];

const TRIGGER_EVENTS = [
  { value: 'on_publish', label: '发布时', desc: '配置发布时自动创建快照' },
  { value: 'on_segment_change', label: '分层变更', desc: '分层配置变更时自动快照' },
  { value: 'on_monetize_change', label: '变现变更', desc: '变现规则变更时自动快照' },
  { value: 'on_difficulty_change', label: '难度变更', desc: '难度映射变更时自动快照' },
  { value: 'scheduled', label: '定时快照', desc: '按计划定时创建快照' },
];

export default function ConfigVersions() {
  const { currentGameId } = useGame();
  const [selectedGameId, setSelectedGameId] = useState<number>(1);
  const [configType, setConfigType] = useState<string>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState<any>(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const [form, setForm] = useState({ snapshotVersion: '', snapshotName: '', description: '' });

  const { data: games } = trpc.gameProjects.list.useQuery({ gameId: currentGameId ?? undefined });
  const { data: snapshots, refetch } = trpc.configVersions.list.useQuery({ gameId: selectedGameId, configType: configType === 'ALL' ? undefined : configType, page: 1, pageSize: 50 });
  const createMut = trpc.configVersions.createSnapshot.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); toast.success("配置快照已创建"); } });
  const publishMut = trpc.configVersions.publish.useMutation({ onSuccess: () => { refetch(); toast.success("配置已发布"); } });
  const rollbackMut = trpc.configRollback.rollbackWithAudit.useMutation({
    onSuccess: (data) => {
      refetch();
      setShowRollbackConfirm(null);
      setRollbackReason("");
      toast.success(`已回滚到版本 ${data.restoredVersion}`);
    },
    onError: (e) => toast.error("回滚失败: " + e.message),
  });

  const detailSnapshot = showDetail ? snapshots?.data?.find((s: any) => s.id === showDetail) : null;

  const statusIcon = (s: string) => {
    if (s === 'PUBLISHED') return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
    if (s === 'DRAFT') return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    if (s === 'ROLLED_BACK') return <RotateCcw className="w-3.5 h-3.5 text-blue-500" />;
    return <Archive className="w-3.5 h-3.5 text-gray-500" />;
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { DRAFT: 'bg-amber-100 text-amber-700', PUBLISHED: 'bg-emerald-100 text-emerald-700', ROLLED_BACK: 'bg-blue-100 text-blue-700', ARCHIVED: 'bg-gray-100 text-gray-600' };
    const labelMap: Record<string, string> = { DRAFT: '草稿', PUBLISHED: '已发布', ROLLED_BACK: '已回滚', ARCHIVED: '已归档' };
    return <Badge className={map[s] || 'bg-gray-100'}>{labelMap[s] || s}</Badge>;
  };

  const nextVersion = useMemo(() => {
    if (!snapshots?.data?.length) return 'v1.0.0';
    const latest = snapshots?.data?.[ 0];
    const match = latest.snapshotVersion.match(/v(\d+)\.(\d+)\.(\d+)/);
    if (match) return `v${match[1]}.${match[2]}.${parseInt(match[3]) + 1}`;
    return `v1.0.${snapshots?.data?.length}`;
  }, [snapshots]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><History className="w-6 h-6" />配置版本管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">管理所有运营配置的版本快照，支持发布、回滚、版本对比和变更审计</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowCompare(true)} disabled={!snapshots?.data?.length || snapshots?.data?.length < 2}>
            <GitCompare className="w-4 h-4 mr-1.5" />版本对比
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />创建快照</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建配置快照</DialogTitle>
                <DialogDescription>从当前线上配置创建一个版本快照，可用于后续回滚</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>版本号</Label>
                    <Input placeholder={nextVersion} value={form.snapshotVersion} onChange={e => setForm({...form, snapshotVersion: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>配置类型</Label>
                    <Select value={configType === 'ALL' ? 'FULL' : configType} onValueChange={v => setConfigType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONFIG_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>快照名称</Label>
                  <Input placeholder="如：上线前最终配置" value={form.snapshotName} onChange={e => setForm({...form, snapshotName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Input placeholder="本次变更说明..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
                <Button onClick={() => createMut.mutate({ gameId: selectedGameId, snapshotVersion: form.snapshotVersion || nextVersion, snapshotName: form.snapshotName, description: form.description, configType: configType === 'ALL' ? 'FULL' : configType })} disabled={!form.snapshotName}>
                  <Upload className="w-4 h-4 mr-2" />创建快照
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="versions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="versions" className="text-xs sm:text-sm">
            <History className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />版本列表
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />变更审计
          </TabsTrigger>
          <TabsTrigger value="triggers" className="text-xs sm:text-sm">
            <Zap className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />自动快照
          </TabsTrigger>
        </TabsList>

        {/* 版本列表 Tab */}
        <TabsContent value="versions" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">游戏项目</Label>
              <Select value={String(selectedGameId)} onValueChange={v => setSelectedGameId(Number(v))}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {games?.map((g: any) => <SelectItem key={g.id} value={String(g.id)}>{g.gameName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">配置类型</Label>
              <Select value={configType} onValueChange={setConfigType}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部类型</SelectItem>
                  {CONFIG_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Version Timeline */}
          <div className="space-y-3">
            {snapshots?.data?.map((snap: any, idx: number) => (
              <Card key={snap.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 px-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center mt-1">
                        {statusIcon(snap.status)}
                        {idx < (snapshots?.data?.length - 1) && <div className="w-px h-8 bg-border mt-1" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-sm">{snap.snapshotVersion}</span>
                          {statusBadge(snap.status)}
                          <Badge variant="outline" className="text-xs">{CONFIG_TYPES.find(t => t.value === snap.configType)?.label || snap.configType}</Badge>
                        </div>
                        <div className="text-sm font-medium mt-0.5">{snap.snapshotName}</div>
                        {snap.description && <div className="text-xs text-muted-foreground mt-0.5">{snap.description}</div>}
                        <div className="text-xs text-muted-foreground mt-1">
                          创建于 {new Date(snap.createdAt).toLocaleString("zh-CN")}
                          {snap.publishedAt && <span className="ml-3">发布于 {new Date(snap.publishedAt).toLocaleString("zh-CN")}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-8 sm:ml-0">
                      <Button variant="ghost" size="sm" onClick={() => setShowDetail(snap.id)}>
                        <Eye className="w-4 h-4 mr-1" />查看
                      </Button>
                      {snap.status === 'DRAFT' && (
                        <Button size="sm" onClick={() => { if (confirm('确定发布此版本？发布后将成为线上活跃配置。')) publishMut.mutate({ id: snap.id }); }}>
                          <CheckCircle className="w-4 h-4 mr-1" />发布
                        </Button>
                      )}
                      {snap.status !== 'DRAFT' && (
                        <Button variant="outline" size="sm" onClick={() => setShowRollbackConfirm(snap)}>
                          <RotateCcw className="w-4 h-4 mr-1" />回滚
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!snapshots?.data?.length) && (
              <Card className="p-8 text-center text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无配置快照</p>
                <p className="text-sm mt-1">点击"创建快照"保存当前配置的版本</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 变更审计 Tab */}
        <TabsContent value="audit" className="space-y-4">
          <AuditLogTab gameId={selectedGameId} configType={configType === 'ALL' ? undefined : configType} />
        </TabsContent>

        {/* 自动快照 Tab */}
        <TabsContent value="triggers" className="space-y-4">
          <AutoSnapshotTriggersTab />
        </TabsContent>
      </Tabs>

      {/* 回滚确认对话框 */}
      <Dialog open={!!showRollbackConfirm} onOpenChange={() => { setShowRollbackConfirm(null); setRollbackReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />确认回滚操作
            </DialogTitle>
            <DialogDescription>
              此操作将把配置恢复到版本 <strong>{showRollbackConfirm?.snapshotVersion}</strong>，请确认并填写回滚原因。
            </DialogDescription>
          </DialogHeader>
          {showRollbackConfirm && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400 mb-2">
                  <ShieldAlert className="w-4 h-4" />回滚影响
                </div>
                <ul className="text-xs text-amber-600 dark:text-amber-300 space-y-1 list-disc list-inside">
                  <li>目标版本：{showRollbackConfirm.snapshotVersion} - {showRollbackConfirm.snapshotName}</li>
                  <li>配置类型：{CONFIG_TYPES.find(t => t.value === showRollbackConfirm.configType)?.label}</li>
                  <li>创建时间：{new Date(showRollbackConfirm.createdAt).toLocaleString("zh-CN")}</li>
                  <li>此操作将记录在变更审计日志中</li>
                </ul>
              </div>
              <div className="space-y-2">
                <Label>回滚原因 <span className="text-muted-foreground text-xs">（建议填写）</span></Label>
                <Textarea placeholder="如：线上数据异常，需要回滚到稳定版本..." value={rollbackReason} onChange={e => setRollbackReason(e.target.value)} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRollbackConfirm(null); setRollbackReason(""); }}>取消</Button>
            <Button variant="destructive" onClick={() => rollbackMut.mutate({
              snapshotId: showRollbackConfirm.id,
              gameId: selectedGameId,
              reason: rollbackReason || undefined,
            })} disabled={rollbackMut.isPending}>
              <RotateCcw className="w-4 h-4 mr-2" />{rollbackMut.isPending ? '回滚中...' : '确认回滚'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>配置快照详情 - {detailSnapshot?.snapshotVersion}</DialogTitle>
            <DialogDescription>{detailSnapshot?.snapshotName}</DialogDescription>
          </DialogHeader>
          {detailSnapshot && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><Label className="text-xs text-muted-foreground">版本号</Label><div className="font-mono">{detailSnapshot.snapshotVersion}</div></div>
                <div><Label className="text-xs text-muted-foreground">配置类型</Label><div>{CONFIG_TYPES.find(t => t.value === detailSnapshot.configType)?.label}</div></div>
                <div><Label className="text-xs text-muted-foreground">状态</Label><div>{statusBadge(detailSnapshot.status)}</div></div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">配置数据</Label>
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-auto max-h-96 mt-2">
                  {JSON.stringify(typeof detailSnapshot.configData === 'string' ? JSON.parse(detailSnapshot.configData) : detailSnapshot.configData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <CompareDialog open={showCompare} onOpenChange={setShowCompare} snapshots={snapshots?.data || []} />
    </div>
  );
}

// ==================== 变更审计日志 ====================
function AuditLogTab({ gameId, configType }: { gameId: number; configType?: string }) {
  const [showDetail, setShowDetail] = useState<any>(null);
  const { data: auditLogs, isLoading } = trpc.configRollback.listAuditLogs.useQuery({
    gameId, configType, page: 1, pageSize: 50,
  });

  const changeTypeLabel: Record<string, { label: string; color: string }> = {
    manual: { label: '手动变更', color: 'bg-blue-100 text-blue-700' },
    auto_snapshot: { label: '自动快照', color: 'bg-green-100 text-green-700' },
    rollback: { label: '回滚操作', color: 'bg-amber-100 text-amber-700' },
    publish: { label: '发布配置', color: 'bg-purple-100 text-purple-700' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />变更审计日志</CardTitle>
        <CardDescription>记录所有配置变更操作，包括手动修改、自动快照和回滚</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>操作类型</TableHead>
                <TableHead>配置类型</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>操作人</TableHead>
                <TableHead className="text-right">详情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(auditLogs?.data as Record<string, unknown>[])?.map((log: any) => {
                const ct = changeTypeLabel[log.change_type] || { label: log.change_type, color: 'bg-gray-100 text-gray-700' };
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(log.changed_at).toLocaleString("zh-CN")}</TableCell>
                    <TableCell><Badge className={ct.color}>{ct.label}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{CONFIG_TYPES.find(t => t.value === log.config_type)?.label || log.config_type}</Badge></TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{log.change_description || '-'}</TableCell>
                    <TableCell className="text-sm">{log.changed_by}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setShowDetail(log)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!auditLogs?.data?.length && !isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  暂无审计日志。配置发布、回滚等操作将自动记录。
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>审计详情</DialogTitle>
            </DialogHeader>
            {showDetail && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><Label className="text-xs text-muted-foreground">操作时间</Label><div>{new Date(showDetail.changed_at).toLocaleString("zh-CN")}</div></div>
                  <div><Label className="text-xs text-muted-foreground">操作人</Label><div>{showDetail.changed_by}</div></div>
                </div>
                {showDetail.before_data && (
                  <div>
                    <Label className="text-xs text-red-500">变更前数据</Label>
                    <pre className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 text-xs font-mono overflow-auto max-h-48 mt-1">
                      {JSON.stringify(typeof showDetail.before_data === 'string' ? JSON.parse(showDetail.before_data) : showDetail.before_data, null, 2)}
                    </pre>
                  </div>
                )}
                {showDetail.after_data && (
                  <div>
                    <Label className="text-xs text-green-500">变更后数据</Label>
                    <pre className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 text-xs font-mono overflow-auto max-h-48 mt-1">
                      {JSON.stringify(typeof showDetail.after_data === 'string' ? JSON.parse(showDetail.after_data) : showDetail.after_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ==================== 自动快照触发器 ====================
function AutoSnapshotTriggersTab() {
  const { currentGameId } = useGame();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ configType: 'FULL', triggerEvent: 'on_publish', retentionDays: 30, maxSnapshots: 50 });
  const utils = trpc.useUtils();
  const { data: triggers, isLoading } = trpc.configRollback.listTriggers.useQuery({ gameId: currentGameId ?? undefined });
  const createMut = trpc.configRollback.createTrigger.useMutation({
    onSuccess: () => { toast.success("触发器已创建"); setShowCreate(false); utils.configRollback.listTriggers.invalidate(); },
    onError: (e: any) => toast.error("创建失败: " + e.message),
  });
  const updateMut = trpc.configRollback.updateTrigger.useMutation({
    onSuccess: () => { utils.configRollback.listTriggers.invalidate(); toast.success("已更新"); },
  });
  const deleteMut = trpc.configRollback.deleteTrigger.useMutation({
    onSuccess: () => { utils.configRollback.listTriggers.invalidate(); toast.success("已删除"); },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4" />自动快照触发器</CardTitle>
            <CardDescription>配置自动创建快照的触发条件，确保关键配置变更前自动备份</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />新建触发器</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>配置类型</TableHead>
                  <TableHead>触发事件</TableHead>
                  <TableHead>保留天数</TableHead>
                  <TableHead>最大快照数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(triggers as Record<string, unknown>[])?.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell><Badge variant="outline">{CONFIG_TYPES.find(c => c.value === t.config_type)?.label || t.config_type}</Badge></TableCell>
                    <TableCell>
                      <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {TRIGGER_EVENTS.find(e => e.value === t.trigger_event)?.label || t.trigger_event}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.retention_days} 天</TableCell>
                    <TableCell>{t.max_snapshots} 个</TableCell>
                    <TableCell>
                      <Switch checked={t.is_active === 1} onCheckedChange={(v) => updateMut.mutate({ id: t.id, isActive: v ? 1 : 0 })} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label="删除" className="h-8 w-8 text-red-500" onClick={() => { if (confirm("确定删除？")) deleteMut.mutate({ id: t.id }); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!triggers?.length && !isLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    暂无自动快照触发器。创建后，系统将在指定事件发生时自动创建配置快照。
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建自动快照触发器</DialogTitle>
            <DialogDescription>配置自动创建快照的触发条件和保留策略</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>配置类型</Label>
                <Select value={form.configType} onValueChange={v => setForm({...form, configType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONFIG_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>触发事件</Label>
                <Select value={form.triggerEvent} onValueChange={v => setForm({...form, triggerEvent: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGER_EVENTS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {TRIGGER_EVENTS.find(e => e.value === form.triggerEvent)?.desc}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>保留天数</Label>
                <Input type="number" min={1} max={365} value={form.retentionDays} onChange={e => setForm({...form, retentionDays: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>最大快照数</Label>
                <Input type="number" min={5} max={200} value={form.maxSnapshots} onChange={e => setForm({...form, maxSnapshots: Number(e.target.value)})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={() => createMut.mutate({
              configType: form.configType,
              triggerEvent: form.triggerEvent as "scheduled" | "on_publish" | "on_segment_change" | "on_monetize_change" | "on_difficulty_change",
              retentionDays: form.retentionDays,
              maxSnapshots: form.maxSnapshots,
            })}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 版本对比 ====================
function CompareDialog({ open, onOpenChange, snapshots }: { open: boolean; onOpenChange: (v: boolean) => void; snapshots: any[] }) {
  const [idA, setIdA] = useState<number | null>(null);
  const [idB, setIdB] = useState<number | null>(null);

  const { data: comparison } = trpc.configVersions.compare.useQuery(
    { snapshotIdA: idA!, snapshotIdB: idB! },
    { enabled: !!idA && !!idB }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><GitCompare className="w-5 h-5" />版本对比</DialogTitle>
          <DialogDescription>选择两个版本进行配置差异对比</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label>版本 A（旧）</Label>
            <Select value={idA ? String(idA) : ''} onValueChange={v => setIdA(Number(v))}>
              <SelectTrigger><SelectValue placeholder="选择版本" /></SelectTrigger>
              <SelectContent>
                {snapshots.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.snapshotVersion} - {s.snapshotName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>版本 B（新）</Label>
            <Select value={idB ? String(idB) : ''} onValueChange={v => setIdB(Number(v))}>
              <SelectTrigger><SelectValue placeholder="选择版本" /></SelectTrigger>
              <SelectContent>
                {snapshots.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.snapshotVersion} - {s.snapshotName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {comparison && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline">{comparison.versionA.version}</Badge>
              <span className="text-muted-foreground">vs</span>
              <Badge variant="outline">{comparison.versionB.version}</Badge>
              <span className="text-muted-foreground ml-auto">{comparison.changes.length} 处变更</span>
            </div>
            {comparison.changes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">两个版本配置完全相同</div>
            ) : (
              <div className="space-y-2">
                {comparison.changes.map((change: any, idx: number) => (
                  <Card key={idx} className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={change.type === 'added' ? 'bg-emerald-100 text-emerald-700' : change.type === 'removed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                        {change.type === 'added' ? '新增' : change.type === 'removed' ? '删除' : '修改'}
                      </Badge>
                      <span className="text-sm font-mono">#{change.index ?? change.section ?? change.id}</span>
                    </div>
                    {change.fields && (
                      <div className="space-y-1">
                        {change.fields.map((f: any, fi: number) => (
                          <div key={fi} className="text-xs flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-muted-foreground w-32">{f.field}:</span>
                            <span className="bg-red-50 text-red-700 px-1 rounded line-through">{JSON.stringify(f.from)}</span>
                            <span className="text-muted-foreground">&rarr;</span>
                            <span className="bg-emerald-50 text-emerald-700 px-1 rounded">{JSON.stringify(f.to)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
