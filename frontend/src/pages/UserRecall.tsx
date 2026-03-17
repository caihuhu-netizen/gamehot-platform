import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Mail, MessageSquare, Bell, Gift, PlusCircle, Loader2, Trash2, Play, Pause, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";
import { useTableSelection } from "@/hooks/useTableSelection";
import BatchActionBar from "@/components/BatchActionBar";
const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "运行中", variant: "default" },
  paused: { label: "已暂停", variant: "secondary" },
  completed: { label: "已完成", variant: "outline" },
  draft: { label: "草稿", variant: "secondary" },
};
const channelIcons: Record<string, React.ElementType> = {
  push: Bell, email: Mail, sms: MessageSquare, reward: Gift,
};
const channelLabels: Record<string, string> = {
  push: "推送", email: "邮件", sms: "短信", in_app: "应用内",
};

export default function UserRecall() {
  const { currentGameId } = useGame();
  const utils = trpc.useUtils();
  const { data: plans = [], isLoading } = trpc.recallPlans.list.useQuery({ gameId: currentGameId ?? undefined });
  const { data: stats } = trpc.recallPlans.stats.useQuery({ gameId: currentGameId ?? undefined });
  const createMutation = trpc.recallPlans.create.useMutation({
    onSuccess: () => { utils.recallPlans.list.invalidate(); utils.recallPlans.stats.invalidate(); toast.success("召回计划创建成功"); setShowCreate(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.recallPlans.update.useMutation({
    onSuccess: () => { utils.recallPlans.list.invalidate(); utils.recallPlans.stats.invalidate(); toast.success("状态已更新"); },
  });
  const deleteMutation = trpc.recallPlans.delete.useMutation({
    onSuccess: () => { utils.recallPlans.list.invalidate(); utils.recallPlans.stats.invalidate(); toast.success("计划已删除"); },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", description: "",
    targetDays: "7",
    channel: "push" as "push" | "email" | "sms" | "in_app",
    message: "",
  });

  const resetForm = () => setForm({ name: "", description: "", targetDays: "7", channel: "push" as const, message: "" });

  const handleCreate = () => {
    if (!form.name || !form.message) { toast.error("请填写计划名称和消息内容"); return; }
    createMutation.mutate({
      name: form.name,
      triggerCondition: `${form.targetDays}日未登录`,
      triggerDays: parseInt(form.targetDays),
      channel: form.channel,
      message: form.message,
    });
  };

  const detailPlan = plans.find((p: any) => p.id === detailId);

  // Batch selection
  const selection = useTableSelection(plans as { id: number }[]);

  const handleBatchActivate = async () => {
    const pausedOrDraft = selection.selectedItems.filter((p: Record<string,unknown>) => p.status === "paused" || p.status === "draft");
    if (pausedOrDraft.length === 0) { toast.error("选中的计划中没有可启用的（仅暂停/草稿可启用）"); return; }
    let success = 0, fail = 0;
    for (const item of pausedOrDraft) {
      try { await updateMutation.mutateAsync({ id: item.id, status: "active" }); success++; } catch { fail++; }
    }
    toast.success(`批量启用完成: ${success} 成功${fail > 0 ? `, ${fail} 失败` : ""}`);
    selection.clear();
  };

  const handleBatchPause = async () => {
    const active = selection.selectedItems.filter((p: Record<string,unknown>) => p.status === "active");
    if (active.length === 0) { toast.error("选中的计划中没有运行中的计划"); return; }
    let success = 0, fail = 0;
    for (const item of active) {
      try { await updateMutation.mutateAsync({ id: item.id, status: "paused" }); success++; } catch { fail++; }
    }
    toast.success(`批量暂停完成: ${success} 成功${fail > 0 ? `, ${fail} 失败` : ""}`);
    selection.clear();
  };

  const handleBatchDelete = async () => {
    const deletable = selection.selectedItems.filter((p: Record<string,unknown>) => p.status === "draft" || p.status === "paused");
    if (deletable.length === 0) { toast.error("选中的计划中没有可删除的（仅草稿/暂停可删除）"); return; }
    let success = 0, fail = 0;
    for (const item of deletable) {
      try { await deleteMutation.mutateAsync({ id: item.id }); success++; } catch { fail++; }
    }
    toast.success(`批量删除完成: ${success} 成功${fail > 0 ? `, ${fail} 失败` : ""}`);
    selection.clear();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <CrossModuleLinks links={MODULE_LINKS.userRecall} />
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="pt-4 sm:pt-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">总计划数</p><p className="text-xl sm:text-2xl font-bold">{stats?.total || 0}</p></div><Bell className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">运行中</p><p className="text-xl sm:text-2xl font-bold">{stats?.active || 0}</p></div><Play className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">总触达</p><p className="text-xl sm:text-2xl font-bold">{(stats?.totalTargeted || 0).toLocaleString()}</p></div><Mail className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">总召回</p><p className="text-xl sm:text-2xl font-bold">{(stats?.totalRecalled || 0).toLocaleString()}</p></div><Gift className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" /></div></CardContent></Card>
      </div>

      <Tabs defaultValue="list">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="list">召回计划</TabsTrigger>
            <TabsTrigger value="analysis">效果分析</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }}><PlusCircle className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">创建计划</span><span className="sm:hidden">创建</span></Button>
        </div>

        <TabsContent value="list" className="mt-4 space-y-3">
          {/* Batch Action Bar */}
          {selection.hasSelection && (
            <BatchActionBar
              selectedCount={selection.selectedCount}
              totalCount={plans.length}
              onClear={selection.clear}
              actions={[
                {
                  label: "批量启用",
                  icon: <Play className="h-3 w-3" />,
                  needsConfirm: true,
                  confirmTitle: "批量启用召回计划",
                  confirmDescription: `将启用选中的 ${selection.selectedItems.filter((p: Record<string,unknown>) => p.status === "paused" || p.status === "draft").length} 条可启用计划。`,
                  onClick: handleBatchActivate,
                },
                {
                  label: "批量暂停",
                  icon: <Pause className="h-3 w-3" />,
                  variant: "secondary",
                  needsConfirm: true,
                  confirmTitle: "批量暂停召回计划",
                  confirmDescription: `将暂停选中的 ${selection.selectedItems.filter((p: Record<string,unknown>) => p.status === "active").length} 条运行中计划。`,
                  onClick: handleBatchPause,
                },
                {
                  label: "批量删除",
                  icon: <Trash2 className="h-3 w-3" />,
                  variant: "destructive",
                  needsConfirm: true,
                  confirmTitle: "批量删除召回计划",
                  confirmDescription: `将删除选中的 ${selection.selectedItems.filter((p: Record<string,unknown>) => p.status === "draft" || p.status === "paused").length} 条可删除计划。`,
                  onClick: handleBatchDelete,
                },
              ]}
            />
          )}

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : plans.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <Mail className="mx-auto h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">暂无召回计划</p>
              <p className="mt-1">创建召回计划来挽回流失用户</p>
            </CardContent></Card>
          ) : (
            <Card>
              <div className="table-responsive">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={selection.isAllSelected} onCheckedChange={() => selection.toggleAll()} aria-label="全选" />
                      </TableHead>
                      <TableHead>计划名称</TableHead>
                      <TableHead className="hidden sm:table-cell">目标天数</TableHead>
                      <TableHead className="hidden md:table-cell">渠道</TableHead>
                      <TableHead className="hidden md:table-cell">触达数</TableHead>
                      <TableHead className="hidden lg:table-cell">召回率</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(plans ?? []).map((plan: Record<string,unknown>) => {
                      const st = statusMap[plan.status] || statusMap.draft;
                      const ChannelIcon = channelIcons[plan.channel] || Bell;
                      return (
                        <TableRow key={plan.id} className={selection.isSelected(plan.id) ? "bg-primary/5" : ""}>
                          <TableCell>
                            <Checkbox checked={selection.isSelected(plan.id)} onCheckedChange={() => selection.toggle(plan.id)} aria-label={`选择 ${plan.name}`} />
                          </TableCell>
                          <TableCell className="font-medium">{plan.name}</TableCell>
                          <TableCell className="hidden sm:table-cell">{plan.triggerDays ?? '?'}天</TableCell>
                          <TableCell className="hidden md:table-cell"><div className="flex items-center gap-1"><ChannelIcon className="h-4 w-4" />{channelLabels[plan.channel] || plan.channel}</div></TableCell>
                          <TableCell className="hidden md:table-cell">{(plan.totalTargeted || 0).toLocaleString()}</TableCell>
                          <TableCell className="hidden lg:table-cell">{plan.recallRate ? `${(Number(plan.recallRate) * 100).toFixed(1)}%` : "-"}</TableCell>
                          <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" aria-label="查看" className="h-8 w-8" onClick={() => setDetailId(plan.id)}><Eye className="h-4 w-4" /></Button>
                              {plan.status === "active" && (
                                <Button variant="ghost" size="icon" aria-label="暂停" className="h-8 w-8" onClick={() => updateMutation.mutate({ id: plan.id, status: "paused" })}><Pause className="h-4 w-4 text-yellow-600" /></Button>
                              )}
                              {plan.status === "paused" && (
                                <Button variant="ghost" size="icon" aria-label="播放" className="h-8 w-8" onClick={() => updateMutation.mutate({ id: plan.id, status: "active" })}><Play className="h-4 w-4 text-green-600" /></Button>
                              )}
                              {(plan.status === "draft" || plan.status === "paused") && (
                                <Button variant="ghost" size="icon" aria-label="删除" className="h-8 w-8" onClick={() => { if (confirm("确认删除?")) deleteMutation.mutate({ id: plan.id }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <Card><CardHeader><CardTitle>召回效果分析</CardTitle><CardDescription>各召回计划的效果对比和趋势分析。</CardDescription></CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无数据</p>
              ) : (
                <div className="space-y-4">
                  {(plans ?? []).filter((p: Record<string,unknown>) => p.totalTargeted > 0).map((plan: Record<string,unknown>) => (
                    <div key={plan.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{plan.name}</span>
                        <Badge variant={statusMap[plan.status]?.variant}>{statusMap[plan.status]?.label}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>触达: <strong className="text-foreground">{(plan.totalTargeted || 0).toLocaleString()}</strong></div>
                        <div>召回: <strong className="text-foreground">{(plan.totalRecalled || 0).toLocaleString()}</strong></div>
                        <div>召回率: <strong className="text-foreground">{plan.recallRate ? `${(Number(plan.recallRate) * 100).toFixed(1)}%` : "N/A"}</strong></div>
                      </div>
                      <div className="mt-2 w-full bg-muted rounded-full h-2">
                        <div className="bg-green-500 rounded-full h-2" style={{ width: `${Math.min(Number(plan.recallRate || 0) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>创建召回计划</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">计划名称 *</label><Input placeholder="例如：7日流失用户召回" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-medium">目标天数</label>
                <Select value={form.targetDays} onValueChange={v => setForm({ ...form, targetDays: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3天未登录</SelectItem>
                    <SelectItem value="7">7天未登录</SelectItem>
                    <SelectItem value="14">14天未登录</SelectItem>
                    <SelectItem value="30">30天未登录</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">召回渠道</label>
                <Select value={form.channel} onValueChange={(v: "push" | "email" | "sms" | "in_app") => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">推送通知</SelectItem>
                    <SelectItem value="email">邮件</SelectItem>
                    <SelectItem value="sms">短信</SelectItem>
                    <SelectItem value="in_app">应用内消息</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">消息内容 *</label><Textarea placeholder="输入召回消息内容" rows={3} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? "创建中..." : "创建计划"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailId !== null} onOpenChange={() => setDetailId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>计划详情</DialogTitle></DialogHeader>
          {detailPlan && (
            <div className="space-y-4">
              <div><strong>{detailPlan.name}</strong></div>
              {detailPlan.targetSegment && <p className="text-sm text-muted-foreground">目标分群: {detailPlan.targetSegment}</p>}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">目标:</span> {detailPlan.triggerDays}天未登录</div>
                <div><span className="text-muted-foreground">渠道:</span> {channelLabels[detailPlan.channel]}</div>
                <div><span className="text-muted-foreground">触达数:</span> {(detailPlan.totalTargeted || 0).toLocaleString()}</div>
                <div><span className="text-muted-foreground">召回数:</span> {(detailPlan.totalRecalled || 0).toLocaleString()}</div>
                <div><span className="text-muted-foreground">召回率:</span> {detailPlan.recallRate ? `${(Number(detailPlan.recallRate) * 100).toFixed(1)}%` : "N/A"}</div>
                <div><span className="text-muted-foreground">状态:</span> <Badge variant={statusMap[detailPlan.status]?.variant}>{statusMap[detailPlan.status]?.label}</Badge></div>
              </div>
              <div><span className="text-sm text-muted-foreground">消息模板:</span><p className="mt-1 text-sm bg-muted p-3 rounded">{detailPlan.message}</p></div>
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setDetailId(null)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
