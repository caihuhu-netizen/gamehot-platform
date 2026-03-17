import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit, ShieldAlert, Clock, AlertTriangle, Zap, Bot, VolumeX, ArrowUpCircle, Layers, RefreshCw, Play } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";

const RULE_TYPES = [
  { value: "revenue", label: "收入异常" },
  { value: "retention", label: "留存异常" },
  { value: "cpi", label: "CPI异常" },
  { value: "fill_rate", label: "填充率异常" },
  { value: "custom", label: "自定义" },
];

const OPERATORS = [
  { value: "gt", label: "> 大于" },
  { value: "lt", label: "< 小于" },
  { value: "gte", label: ">= 大于等于" },
  { value: "lte", label: "<= 小于等于" },
  { value: "deviation_pct", label: "偏离百分比" },
];

const SEVERITIES = [
  { value: "critical", label: "严重", color: "text-red-500" },
  { value: "warning", label: "警告", color: "text-amber-500" },
  { value: "info", label: "提示", color: "text-blue-500" },
];

const AUTO_RESPONSE_TYPES = [
  { value: "none", label: "无自动响应" },
  { value: "generate_report", label: "自动生成分析报告" },
  { value: "notify_feishu", label: "推送飞书群" },
  { value: "generate_and_notify", label: "生成报告 + 推送飞书" },
  { value: "custom_webhook", label: "自定义Webhook" },
];

export default function AlertRulesConfig() {
  const { currentGameId } = useGame();
  const [activeTab, setActiveTab] = useState("rules");

  return (
    <div className="space-y-6">
      <CrossModuleLinks links={MODULE_LINKS.alertRules} />
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          智能告警配置
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          配置告警规则、合并推送、静默期和自动升级机制
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="rules" className="text-xs sm:text-sm">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />告警规则
          </TabsTrigger>
          <TabsTrigger value="aggregation" className="text-xs sm:text-sm">
            <Layers className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />合并推送
          </TabsTrigger>
          <TabsTrigger value="silence" className="text-xs sm:text-sm">
            <VolumeX className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />静默期
          </TabsTrigger>
          <TabsTrigger value="escalation" className="text-xs sm:text-sm">
            <ArrowUpCircle className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />自动升级
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules"><AlertRulesTab /></TabsContent>
        <TabsContent value="aggregation"><AggregationTab /></TabsContent>
        <TabsContent value="silence"><SilenceTab /></TabsContent>
        <TabsContent value="escalation"><EscalationTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== 告警规则 Tab ====================
function AlertRulesTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"revenue" | "retention" | "cpi" | "fill_rate" | "custom">("revenue");
  const [formMetric, setFormMetric] = useState("");
  const [formOperator, setFormOperator] = useState<"gt" | "lt" | "gte" | "lte" | "deviation_pct">("deviation_pct");
  const [formThreshold, setFormThreshold] = useState("");
  const [formWindow, setFormWindow] = useState("7");
  const [formSeverity, setFormSeverity] = useState<"critical" | "warning" | "info">("warning");
  const [formNotify, setFormNotify] = useState(true);
  const utils = trpc.useUtils();
  const { data: rules, isLoading } = trpc.alerts.listRules.useQuery();
  const createMut = trpc.alerts.createRule.useMutation({
    onSuccess: () => { toast.success("规则创建成功"); setShowCreate(false); resetForm(); utils.alerts.listRules.invalidate(); },
    onError: (e) => toast.error("创建失败: " + e.message),
  });
  const updateMut = trpc.alerts.updateRule.useMutation({
    onSuccess: () => { toast.success("已更新"); utils.alerts.listRules.invalidate(); },
  });
  const deleteMut = trpc.alerts.deleteRule.useMutation({
    onSuccess: () => { toast.success("已删除"); utils.alerts.listRules.invalidate(); },
  });

  const resetForm = () => { setFormName(""); setFormType("revenue"); setFormMetric(""); setFormOperator("deviation_pct"); setFormThreshold(""); setFormWindow("7"); setFormSeverity("warning"); setFormNotify(true); };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">告警规则列表</CardTitle>
          <CardDescription>定义指标异常检测规则</CardDescription>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />新建规则</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>规则名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>指标</TableHead>
                <TableHead>阈值</TableHead>
                <TableHead>级别</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rules as Record<string, unknown>[])?.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.rule_name || r.ruleName}</TableCell>
                  <TableCell><Badge variant="outline">{RULE_TYPES.find(t => t.value === (r.rule_type || r.ruleType))?.label}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{r.metric}</TableCell>
                  <TableCell>{r.operator === 'deviation_pct' ? `±${r.threshold}%` : `${r.operator} ${r.threshold}`}</TableCell>
                  <TableCell>
                    <Badge className={r.severity === 'critical' ? 'bg-red-100 text-red-700' : r.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}>
                      {SEVERITIES.find(s => s.value === r.severity)?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={(r.is_active ?? r.isActive) === 1} onCheckedChange={(v) => updateMut.mutate({ id: r.id, isActive: v ? 1 : 0 })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label="删除" className="h-8 w-8 text-red-500" onClick={() => { if (confirm("确定删除？")) deleteMut.mutate({ id: r.id }); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!rules?.length && !isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">暂无告警规则</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建告警规则</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>规则名称</Label><Input placeholder="如：日收入下降30%告警" value={formName} onChange={e => setFormName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>规则类型</Label>
                <Select value={formType} onValueChange={(v: any) => setFormType(v)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>严重级别</Label>
                <Select value={formSeverity} onValueChange={(v: any) => setFormSeverity(v)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>监控指标</Label><Input placeholder="如：daily_revenue" value={formMetric} onChange={e => setFormMetric(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>比较方式</Label>
                <Select value={formOperator} onValueChange={(v: any) => setFormOperator(v)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>阈值</Label><Input placeholder="30" value={formThreshold} onChange={e => setFormThreshold(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={() => createMut.mutate({ ruleName: formName, ruleType: formType, metric: formMetric, operator: formOperator, threshold: formThreshold, comparisonWindow: Number(formWindow), severity: formSeverity, notifyOwner: formNotify ? 1 : 0 })} disabled={!formName || !formMetric || !formThreshold}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ==================== 合并推送 Tab ====================
function AggregationTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ruleName: "", alertType: "revenue_drop", severity: "all", aggregationWindow: 300, maxAlertsPerWindow: 10, digestTemplate: "" });
  const utils = trpc.useUtils();
  const { data: rules, isLoading } = trpc.alertEnhancement.listAggregationRules.useQuery();
  const createMut = trpc.alertEnhancement.createAggregationRule.useMutation({
    onSuccess: () => { toast.success("聚合规则已创建"); setShowCreate(false); utils.alertEnhancement.listAggregationRules.invalidate(); },
    onError: (e) => toast.error("创建失败: " + e.message),
  });
  const updateMut = trpc.alertEnhancement.updateAggregationRule.useMutation({
    onSuccess: () => { toast.success("已更新"); utils.alertEnhancement.listAggregationRules.invalidate(); },
  });
  const deleteMut = trpc.alertEnhancement.deleteAggregationRule.useMutation({
    onSuccess: () => { toast.success("已删除"); utils.alertEnhancement.listAggregationRules.invalidate(); },
  });
  const flushMut = trpc.alertEnhancement.flushDigests.useMutation({
    onSuccess: (r) => toast.success(`已发送 ${r.sent} 条合并通知`),
    onError: () => toast.error("推送失败"),
  });

  const ALERT_TYPES = [
    { value: "revenue_drop", label: "收入下降" },
    { value: "revenue_spike", label: "收入异常上升" },
    { value: "retention_drop", label: "留存下降" },
    { value: "cpi_spike", label: "CPI异常" },
    { value: "fill_rate_drop", label: "填充率下降" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" />告警合并推送</CardTitle>
            <CardDescription>同类告警在时间窗口内聚合后统一推送，避免告警风暴</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => flushMut.mutate()} disabled={flushMut.isPending}>
              <RefreshCw className={`h-4 w-4 mr-1 ${flushMut.isPending ? 'animate-spin' : ''}`} />推送待发
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />新建规则</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规则名称</TableHead>
                  <TableHead>告警类型</TableHead>
                  <TableHead>聚合窗口</TableHead>
                  <TableHead>最大告警数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules as Record<string, unknown>[])?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.rule_name}</TableCell>
                    <TableCell><Badge variant="outline">{ALERT_TYPES.find(t => t.value === r.alert_type)?.label || r.alert_type}</Badge></TableCell>
                    <TableCell>{r.aggregation_window >= 3600 ? `${r.aggregation_window / 3600}小时` : `${r.aggregation_window / 60}分钟`}</TableCell>
                    <TableCell>{r.max_alerts_per_window}</TableCell>
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
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无聚合规则。创建后，同类告警将在窗口期内合并推送。</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建聚合规则</DialogTitle>
            <DialogDescription>同类告警在时间窗口内聚合后统一推送</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>规则名称</Label><Input placeholder="如：收入告警合并推送" value={form.ruleName} onChange={e => setForm({...form, ruleName: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>告警类型</Label>
                <Select value={form.alertType} onValueChange={v => setForm({...form, alertType: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ALERT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>严重级别</Label>
                <Select value={form.severity} onValueChange={v => setForm({...form, severity: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部级别</SelectItem>
                    <SelectItem value="critical">严重</SelectItem>
                    <SelectItem value="warning">警告</SelectItem>
                    <SelectItem value="info">提示</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>聚合窗口</Label>
                <Select value={String(form.aggregationWindow)} onValueChange={v => setForm({...form, aggregationWindow: Number(v)})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1分钟</SelectItem>
                    <SelectItem value="300">5分钟</SelectItem>
                    <SelectItem value="600">10分钟</SelectItem>
                    <SelectItem value="1800">30分钟</SelectItem>
                    <SelectItem value="3600">1小时</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>最大告警数</Label><Input type="number" value={form.maxAlertsPerWindow} onChange={e => setForm({...form, maxAlertsPerWindow: Number(e.target.value)})} /></div>
            </div>
            <div className="space-y-2"><Label>推送模板（可选）</Label><Textarea placeholder="[告警合并] {{rule_name}}：{{count}} 个同类告警" value={form.digestTemplate} onChange={e => setForm({...form, digestTemplate: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={!form.ruleName}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 静默期 Tab ====================
function SilenceTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ruleName: "", alertType: "", metricName: "", severity: "", silenceStart: "", silenceEnd: "", reason: "" });
  const utils = trpc.useUtils();
  const { data: rules, isLoading } = trpc.alertEnhancement.listSilenceRules.useQuery();
  const createMut = trpc.alertEnhancement.createSilenceRule.useMutation({
    onSuccess: () => { toast.success("静默规则已创建"); setShowCreate(false); utils.alertEnhancement.listSilenceRules.invalidate(); },
    onError: (e) => toast.error("创建失败: " + e.message),
  });
  const updateMut = trpc.alertEnhancement.updateSilenceRule.useMutation({
    onSuccess: () => { toast.success("已更新"); utils.alertEnhancement.listSilenceRules.invalidate(); },
  });
  const deleteMut = trpc.alertEnhancement.deleteSilenceRule.useMutation({
    onSuccess: () => { toast.success("已删除"); utils.alertEnhancement.listSilenceRules.invalidate(); },
  });

  const isActive = (r: any) => {
    const now = new Date();
    const start = new Date(r.silence_start);
    const end = new Date(r.silence_end);
    return r.is_active === 1 && now >= start && now <= end;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><VolumeX className="h-4 w-4" />告警静默期</CardTitle>
            <CardDescription>在指定时间窗口内屏蔽匹配的告警通知（如版本发布、维护窗口）</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />新建静默</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规则名称</TableHead>
                  <TableHead>匹配条件</TableHead>
                  <TableHead>静默时间</TableHead>
                  <TableHead>原因</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules as Record<string, unknown>[])?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.rule_name}</TableCell>
                    <TableCell className="text-xs">
                      {r.alert_type && <Badge variant="outline" className="mr-1">{r.alert_type}</Badge>}
                      {r.severity && <Badge variant="outline" className="mr-1">{r.severity}</Badge>}
                      {!r.alert_type && !r.severity && <span className="text-muted-foreground">全部告警</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(r.silence_start).toLocaleString()} ~ {new Date(r.silence_end).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.reason || "-"}</TableCell>
                    <TableCell>
                      {isActive(r) ? (
                        <Badge className="bg-orange-100 text-orange-700">静默中</Badge>
                      ) : r.is_active === 1 ? (
                        <Badge className="bg-blue-100 text-blue-700">待生效</Badge>
                      ) : (
                        <Badge variant="secondary">已停用</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right flex gap-1 justify-end">
                      <Switch checked={r.is_active === 1} onCheckedChange={(v) => updateMut.mutate({ id: r.id, isActive: v ? 1 : 0 })} />
                      <Button variant="ghost" size="icon" aria-label="删除" className="h-8 w-8 text-red-500" onClick={() => { if (confirm("确定删除？")) deleteMut.mutate({ id: r.id }); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!rules?.length && !isLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无静默规则。创建后，匹配的告警在静默期内不会推送通知。</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建静默规则</DialogTitle>
            <DialogDescription>在指定时间窗口内屏蔽匹配的告警通知</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>规则名称</Label><Input placeholder="如：版本发布静默窗口" value={form.ruleName} onChange={e => setForm({...form, ruleName: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>告警类型（可选）</Label>
                <Select value={form.alertType || "all"} onValueChange={v => setForm({...form, alertType: v === "all" ? "" : v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="revenue_drop">收入下降</SelectItem>
                    <SelectItem value="revenue_spike">收入异常上升</SelectItem>
                    <SelectItem value="retention_drop">留存下降</SelectItem>
                    <SelectItem value="cpi_spike">CPI异常</SelectItem>
                    <SelectItem value="fill_rate_drop">填充率下降</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>严重级别（可选）</Label>
                <Select value={form.severity || "all"} onValueChange={v => setForm({...form, severity: v === "all" ? "" : v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部级别</SelectItem>
                    <SelectItem value="critical">严重</SelectItem>
                    <SelectItem value="warning">警告</SelectItem>
                    <SelectItem value="info">提示</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>静默开始</Label><Input type="datetime-local" value={form.silenceStart} onChange={e => setForm({...form, silenceStart: e.target.value})} /></div>
              <div className="space-y-2"><Label>静默结束</Label><Input type="datetime-local" value={form.silenceEnd} onChange={e => setForm({...form, silenceEnd: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>静默原因</Label><Textarea placeholder="如：v2.1.0版本发布，预计数据波动" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={() => createMut.mutate({ ...form, alertType: form.alertType || undefined, severity: form.severity || undefined, metricName: form.metricName || undefined })} disabled={!form.ruleName || !form.silenceStart || !form.silenceEnd}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 自动升级 Tab ====================
function EscalationTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ruleName: "", sourceSeverity: "warning" as "warning" | "info", targetSeverity: "critical" as "critical" | "warning", escalationTimeout: 3600 });
  const utils = trpc.useUtils();
  const { data: rules, isLoading } = trpc.alertEnhancement.listEscalationRules.useQuery();
  const createMut = trpc.alertEnhancement.createEscalationRule.useMutation({
    onSuccess: () => { toast.success("升级规则已创建"); setShowCreate(false); utils.alertEnhancement.listEscalationRules.invalidate(); },
    onError: (e) => toast.error("创建失败: " + e.message),
  });
  const updateMut = trpc.alertEnhancement.updateEscalationRule.useMutation({
    onSuccess: () => { toast.success("已更新"); utils.alertEnhancement.listEscalationRules.invalidate(); },
  });
  const deleteMut = trpc.alertEnhancement.deleteEscalationRule.useMutation({
    onSuccess: () => { toast.success("已删除"); utils.alertEnhancement.listEscalationRules.invalidate(); },
  });
  const runEscMut = trpc.alertEnhancement.runEscalation.useMutation({
    onSuccess: (r) => toast.success(`已升级 ${r.escalated} 个告警`),
    onError: () => toast.error("升级执行失败"),
  });

  const timeoutLabel = (secs: number) => {
    if (secs >= 86400) return `${secs / 86400} 天`;
    if (secs >= 3600) return `${secs / 3600} 小时`;
    return `${secs / 60} 分钟`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><ArrowUpCircle className="h-4 w-4" />告警自动升级</CardTitle>
            <CardDescription>超时未处理的告警自动升级严重级别并推送通知</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => runEscMut.mutate()} disabled={runEscMut.isPending}>
              <Play className={`h-4 w-4 mr-1 ${runEscMut.isPending ? 'animate-spin' : ''}`} />立即检查
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />新建规则</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规则名称</TableHead>
                  <TableHead>原始级别</TableHead>
                  <TableHead>升级到</TableHead>
                  <TableHead>超时时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules as Record<string, unknown>[])?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.rule_name}</TableCell>
                    <TableCell>
                      <Badge className={r.source_severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}>
                        {r.source_severity === 'warning' ? '警告' : '提示'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ArrowUpCircle className="h-3.5 w-3.5 text-red-500" />
                        <Badge className={r.target_severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                          {r.target_severity === 'critical' ? '严重' : '警告'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{timeoutLabel(r.escalation_timeout)}</TableCell>
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
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无升级规则。创建后，超时未处理的告警将自动升级。</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建升级规则</DialogTitle>
            <DialogDescription>告警超时未处理时自动升级严重级别</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>规则名称</Label><Input placeholder="如：警告超1小时升级为严重" value={form.ruleName} onChange={e => setForm({...form, ruleName: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>原始级别</Label>
                <Select value={form.sourceSeverity} onValueChange={(v: any) => setForm({...form, sourceSeverity: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">提示</SelectItem>
                    <SelectItem value="warning">警告</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>升级到</Label>
                <Select value={form.targetSeverity} onValueChange={(v: any) => setForm({...form, targetSeverity: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">警告</SelectItem>
                    <SelectItem value="critical">严重</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>超时时间</Label>
              <Select value={String(form.escalationTimeout)} onValueChange={v => setForm({...form, escalationTimeout: Number(v)})}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">5分钟</SelectItem>
                  <SelectItem value="900">15分钟</SelectItem>
                  <SelectItem value="1800">30分钟</SelectItem>
                  <SelectItem value="3600">1小时</SelectItem>
                  <SelectItem value="7200">2小时</SelectItem>
                  <SelectItem value="14400">4小时</SelectItem>
                  <SelectItem value="28800">8小时</SelectItem>
                  <SelectItem value="86400">24小时</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={!form.ruleName}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
