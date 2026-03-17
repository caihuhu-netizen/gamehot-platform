import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Plus, DollarSign, Pencil, Trash2, Zap, Clock, Layout } from "lucide-react";
import { toast } from "sonner";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";
const POPUP_TYPES = [
  { value: "INTERSTITIAL_AD", label: "插屏广告" },
  { value: "REWARDED_AD", label: "激励视频" },
  { value: "IAP_OFFER", label: "内购优惠" },
  { value: "SUBSCRIPTION", label: "订阅推荐" },
  { value: "BUNDLE_OFFER", label: "礼包推荐" },
];

const TRIGGER_EVENTS = [
  { value: "LEVEL_FAIL", label: "关卡失败" },
  { value: "LEVEL_COMPLETE", label: "关卡完成" },
  { value: "SESSION_START", label: "会话开始" },
  { value: "ITEM_USE", label: "道具使用" },
  { value: "ENERGY_EMPTY", label: "体力耗尽" },
  { value: "COIN_LOW", label: "金币不足" },
];

export default function Monetize() {
  const { currentGameId } = useGame();
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const utils = trpc.useUtils();

  const { data: rules, isLoading: rulesLoading } = trpc.monetize.listRules.useQuery({ gameId: currentGameId ?? undefined });
  const { data: templates, isLoading: templatesLoading } = trpc.monetize.listTemplates.useQuery({ gameId: currentGameId ?? undefined });

  const createRule = trpc.monetize.createRule.useMutation({
    onSuccess: () => { utils.monetize.listRules.invalidate(); setShowCreateRule(false); toast.success("触发规则创建成功"); },
    onError: (err) => toast.error(err.message),
  });
  const updateRule = trpc.monetize.updateRule.useMutation({
    onSuccess: () => { utils.monetize.listRules.invalidate(); toast.success("规则更新成功"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteRule = trpc.monetize.deleteRule.useMutation({
    onSuccess: () => { utils.monetize.listRules.invalidate(); toast.success("规则已删除"); },
    onError: (err) => toast.error(err.message),
  });
  const createTemplate = trpc.monetize.createTemplate.useMutation({
    onSuccess: () => { utils.monetize.listTemplates.invalidate(); setShowCreateTemplate(false); toast.success("弹窗模板创建成功"); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <CrossModuleLinks links={MODULE_LINKS.monetize} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">变现触发管理</h1>
        <p className="text-muted-foreground text-sm mt-1">配置触发规则、冷却期、弹窗模板和触发优先级</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <Zap className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">触发规则</p>
              <p className="text-xl font-bold">{rules?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Layout className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">弹窗模板</p>
              <p className="text-xl font-bold">{templates?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">活跃规则</p>
              <p className="text-xl font-bold">{rules?.filter((r: Record<string,unknown>) => r.isActive).length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">触发规则</TabsTrigger>
          <TabsTrigger value="templates">弹窗模板</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">触发规则列表</CardTitle>
                <Dialog open={showCreateRule} onOpenChange={setShowCreateRule}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" />新建规则</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>创建触发规则</DialogTitle></DialogHeader>
                    <RuleForm onSubmit={(data) => createRule.mutate(data)} loading={createRule.isPending} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>规则编码</TableHead>
                    <TableHead>规则名称</TableHead>
                    <TableHead>触发事件</TableHead>
                    <TableHead>弹窗类型</TableHead>
                    <TableHead>每日上限</TableHead>
                    <TableHead>冷却(分)</TableHead>
                    <TableHead>优先级</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rulesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                      ))}</TableRow>
                    ))
                  ) : rules?.length ? (
                    (rules ?? []).map((rule: Record<string,unknown>) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-mono text-xs">{rule.ruleCode}</TableCell>
                        <TableCell className="text-sm">{rule.ruleName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{TRIGGER_EVENTS.find(e => e.value === rule.triggerEvent)?.label || rule.triggerEvent}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{POPUP_TYPES.find(t => t.value === rule.popupType)?.label || rule.popupType}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{rule.dailyLimit}</TableCell>
                        <TableCell className="text-sm">{rule.totalCooldownMinutes}</TableCell>
                        <TableCell className="text-sm">{rule.priority}</TableCell>
                        <TableCell>
                          <Switch checked={!!rule.isActive} onCheckedChange={(checked) => updateRule.mutate({ id: rule.id, isActive: checked ? 1 : 0 })} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm"><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => { if (confirm("确认删除？")) deleteRule.mutate({ id: rule.id }); }}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">暂无触发规则</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">弹窗模板列表</CardTitle>
                <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" />新建模板</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>创建弹窗模板</DialogTitle></DialogHeader>
                    <TemplateForm onSubmit={(data) => createTemplate.mutate(data)} loading={createTemplate.isPending} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模板编码</TableHead>
                    <TableHead>弹窗类型</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead>主按钮</TableHead>
                    <TableHead>语言</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templatesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                      ))}</TableRow>
                    ))
                  ) : templates?.length ? (
                    (templates ?? []).map((t: Record<string,unknown>) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.templateCode}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{POPUP_TYPES.find(p => p.value === t.popupType)?.label || t.popupType}</Badge></TableCell>
                        <TableCell className="text-sm">{t.title}</TableCell>
                        <TableCell className="text-sm">{t.primaryButtonText}</TableCell>
                        <TableCell className="text-xs">{t.languageCode}</TableCell>
                        <TableCell>{t.isActive ? <Badge className="bg-emerald-100 text-emerald-800 text-xs">活跃</Badge> : <Badge variant="outline" className="text-xs">停用</Badge>}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无弹窗模板</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RuleForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    ruleCode: "", ruleName: "", triggerEvent: "LEVEL_FAIL", popupType: "REWARDED_AD",
    targetSegments: JSON.stringify(["L3", "L4", "L5"]),
    dailyLimit: 3, totalCooldownMinutes: 20, afterPayCooldownMinutes: 30, afterAdCooldownMinutes: 10, priority: 0,
    effectiveFrom: new Date().toISOString().split("T")[0],
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>规则编码</Label><Input value={form.ruleCode} onChange={(e) => setForm({ ...form, ruleCode: e.target.value })} placeholder="RULE_001" /></div>
        <div><Label>规则名称</Label><Input value={form.ruleName} onChange={(e) => setForm({ ...form, ruleName: e.target.value })} placeholder="失败后激励视频" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>触发事件</Label>
          <Select value={form.triggerEvent} onValueChange={(v) => setForm({ ...form, triggerEvent: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TRIGGER_EVENTS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>弹窗类型</Label>
          <Select value={form.popupType} onValueChange={(v) => setForm({ ...form, popupType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{POPUP_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>每日上限</Label><Input type="number" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: Number(e.target.value) })} /></div>
        <div><Label>总冷却(分)</Label><Input type="number" value={form.totalCooldownMinutes} onChange={(e) => setForm({ ...form, totalCooldownMinutes: Number(e.target.value) })} /></div>
        <div><Label>优先级</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></div>
      </div>
      <Button onClick={() => {
        try { onSubmit({ ...form, targetSegments: JSON.parse(form.targetSegments) }); } catch { toast.error("目标分层JSON格式错误"); }
      }} disabled={loading || !form.ruleCode || !form.ruleName} className="w-full">{loading ? "创建中..." : "创建规则"}</Button>
    </div>
  );
}

function TemplateForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    templateCode: "", popupType: "REWARDED_AD", title: "", bodyText: "",
    primaryButtonText: "观看广告", secondaryButtonText: "取消", languageCode: "zh",
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>模板编码</Label><Input value={form.templateCode} onChange={(e) => setForm({ ...form, templateCode: e.target.value })} placeholder="TPL_001" /></div>
        <div><Label>弹窗类型</Label>
          <Select value={form.popupType} onValueChange={(v) => setForm({ ...form, popupType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{POPUP_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>标题</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="需要帮助吗？" /></div>
      <div><Label>正文</Label><Input value={form.bodyText} onChange={(e) => setForm({ ...form, bodyText: e.target.value })} placeholder="观看一段视频获得额外步数" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>主按钮文字</Label><Input value={form.primaryButtonText} onChange={(e) => setForm({ ...form, primaryButtonText: e.target.value })} /></div>
        <div><Label>副按钮文字</Label><Input value={form.secondaryButtonText} onChange={(e) => setForm({ ...form, secondaryButtonText: e.target.value })} /></div>
      </div>
      <Button onClick={() => onSubmit(form)} disabled={loading || !form.templateCode || !form.title} className="w-full">{loading ? "创建中..." : "创建模板"}</Button>
    </div>
  );
}
