import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter, } from "@/components/ui/dialog";
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, } from "@/components/ui/select";
import { Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow, } from "@/components/ui/table";
import { toast } from "sonner";
import { Bell,
  Plus,
  Trash2,
  TestTube,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  BarChart3,
  History,
  Pencil,
  Power,
  PowerOff, } from "lucide-react";

// ==================== Webhook配置管理 ====================
function WebhookConfigsTab() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    webhookUrl: "",
    secret: "",
    eventTypes: [] as string[],
    description: "",
  });

  const utils = trpc.useUtils();
  const { data: configs, isLoading } = trpc.feishuNotification.listConfigs.useQuery();
  const { data: eventTypes } = trpc.feishuNotification.getEventTypes.useQuery();

  const createMutation = trpc.feishuNotification.createConfig.useMutation({
    onSuccess: () => {
      toast.success("Webhook配置创建成功");
      utils.feishuNotification.listConfigs.invalidate();
      resetForm();
    },
    onError: (err) => toast.error(`创建失败: ${err.message}`),
  });

  const updateMutation = trpc.feishuNotification.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Webhook配置更新成功");
      utils.feishuNotification.listConfigs.invalidate();
      resetForm();
    },
    onError: (err) => toast.error(`更新失败: ${err.message}`),
  });

  const deleteMutation = trpc.feishuNotification.deleteConfig.useMutation({
    onSuccess: () => {
      toast.success("已删除");
      utils.feishuNotification.listConfigs.invalidate();
    },
    onError: (err) => toast.error(`删除失败: ${err.message}`),
  });

  const toggleMutation = trpc.feishuNotification.updateConfig.useMutation({
    onSuccess: () => {
      utils.feishuNotification.listConfigs.invalidate();
    },
  });

  const testMutation = trpc.feishuNotification.testWebhook.useMutation({
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(data.msg);
      } else {
        toast.error(data.msg);
      }
    },
    onError: (err) => toast.error(`测试失败: ${err.message}`),
  });

  function resetForm() {
    setShowDialog(false);
    setEditingId(null);
    setForm({ name: "", webhookUrl: "", secret: "", eventTypes: [], description: "" });
  }

  function openEdit(config: any) {
    setEditingId(config.id);
    setForm({
      name: config.name,
      webhookUrl: config.webhookUrl,
      secret: config.secret ?? "",
      eventTypes: config.eventTypes ?? [],
      description: config.description ?? "",
    });
    setShowDialog(true);
  }

  function handleSubmit() {
    if (!form.name || !form.webhookUrl || form.eventTypes.length === 0) {
      toast.error("请填写名称、Webhook地址，并选择至少一个事件类型");
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...form,
        secret: form.secret || null,
      });
    } else {
      createMutation.mutate({
        ...form,
        secret: form.secret || undefined,
      });
    }
  }

  function toggleEventType(type: string) {
    setForm((prev) => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(type)
        ? prev.eventTypes.filter((t) => t !== type)
        : [...prev.eventTypes, type],
    }));
  }

  const eventTypeLabels: Record<string, string> = useMemo(() => {
    if (!eventTypes) return {};
    return Object.fromEntries(eventTypes.map((et) => [et.value, et.label]));
  }, [eventTypes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Webhook配置</h3>
          <p className="text-sm text-muted-foreground">管理飞书群机器人Webhook，配置消息推送规则</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" /> 新增Webhook
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : !configs?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">暂无Webhook配置</p>
            <p className="text-sm text-muted-foreground mt-1">点击"新增Webhook"添加飞书群机器人</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(configs ?? []).map((config) => (
            <Card key={config.id} className={config.enabled ? "" : "opacity-60"}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{config.name}</h4>
                      <Badge variant={config.enabled ? "default" : "secondary"}>
                        {config.enabled ? "启用" : "禁用"}
                      </Badge>
                      {config.secret && <Badge variant="outline">已签名</Badge>}
                    </div>
                    {config.description && (
                      <p className="text-sm text-muted-foreground mb-2">{config.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(config.eventTypes as string[]).map((et) => (
                        <Badge key={et} variant="outline" className="text-xs">
                          {eventTypeLabels[et] ?? et}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {config.webhookUrl}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="测试连通性"
                      title="测试连通性"
                      onClick={() => testMutation.mutate({ webhookUrl: config.webhookUrl, secret: config.secret })}
                      disabled={testMutation.isPending}
                    >
                      <TestTube className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon" aria-label="电源"
                      title={config.enabled ? "禁用" : "启用"}
                      onClick={() => toggleMutation.mutate({ id: config.id, enabled: config.enabled ? 0 : 1 })}
                    >
                      {config.enabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="编辑" title="编辑" onClick={() => openEdit(config)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="删除"
                      title="删除"
                      onClick={() => {
                        if (confirm("确定删除此Webhook配置？")) {
                          deleteMutation.mutate({ id: config.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 新增/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={(v) => { if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑Webhook配置" : "新增Webhook配置"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>配置名称 *</Label>
              <Input
                placeholder="如：告警群、日报群"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Webhook地址 *</Label>
              <Input
                placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
                value={form.webhookUrl}
                onChange={(e) => setForm((p) => ({ ...p, webhookUrl: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                在飞书群设置 → 群机器人 → 自定义机器人中获取
              </p>
            </div>
            <div>
              <Label>签名密钥（可选）</Label>
              <Input
                placeholder="留空则不启用签名校验"
                value={form.secret}
                onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))}
              />
            </div>
            <div>
              <Label>订阅事件类型 *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {eventTypes?.map((et) => (
                  <Badge
                    key={et.value}
                    variant={form.eventTypes.includes(et.value) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleEventType(et.value)}
                  >
                    {et.label}
                  </Badge>
                ))}
                <Badge
                  variant={form.eventTypes.includes("*") ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggleEventType("*")}
                >
                  全部事件
                </Badge>
              </div>
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                placeholder="Webhook用途说明"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 通知日志 ====================
function NotificationLogsTab() {
  const [eventFilter, setEventFilter] = useState<string>("all");
  const { data: logs, isLoading } = trpc.feishuNotification.listLogs.useQuery(
    eventFilter === "all" ? {} : { eventType: eventFilter }
  );
  const { data: eventTypes } = trpc.feishuNotification.getEventTypes.useQuery();

  const statusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">通知日志</h3>
          <p className="text-sm text-muted-foreground">查看飞书通知发送记录</p>
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="筛选事件类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {eventTypes?.map((et) => (
              <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : !logs?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">暂无通知记录</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">状态</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>事件类型</TableHead>
                <TableHead>响应码</TableHead>
                <TableHead>错误信息</TableHead>
                <TableHead className="w-[160px]">发送时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs ?? []).map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{statusIcon(log.status)}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{log.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {eventTypes?.find((et) => et.value === log.eventType)?.label ?? log.eventType}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.responseCode ?? "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {log.errorMessage ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(log.createdAt).toLocaleString("zh-CN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ==================== 手动发送测试 ====================
function TestSendTab() {
  const [eventType, setEventType] = useState("custom");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("info");
  const [sendType, setSendType] = useState<"card" | "text">("card");

  const { data: eventTypes } = trpc.feishuNotification.getEventTypes.useQuery();

  const sendAlertMutation = trpc.feishuNotification.sendTestAlert.useMutation({
    onSuccess: (data) => {
      toast.success(`发送完成：成功 ${data.sent}，失败 ${data.failed}`);
    },
    onError: (err) => toast.error(`发送失败: ${err.message}`),
  });

  const sendTextMutation = trpc.feishuNotification.sendTestText.useMutation({
    onSuccess: (data) => {
      toast.success(`发送完成：成功 ${data.sent}，失败 ${data.failed}`);
    },
    onError: (err) => toast.error(`发送失败: ${err.message}`),
  });

  function handleSend() {
    if (!title || !message) {
      toast.error("请填写标题和消息内容");
      return;
    }
    if (sendType === "card") {
      sendAlertMutation.mutate({ eventType, title, severity, message });
    } else {
      sendTextMutation.mutate({ eventType, title, text: message });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">手动发送测试</h3>
        <p className="text-sm text-muted-foreground">向已配置的Webhook发送测试消息</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>消息类型</Label>
              <Select value={sendType} onValueChange={(v) => setSendType(v as "text" | "card")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">飞书卡片（告警样式）</SelectItem>
                  <SelectItem value="text">纯文本</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>事件类型</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes?.map((et) => (
                    <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {sendType === "card" && (
            <div>
              <Label>告警级别</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as "critical" | "warning" | "info")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">严重 (红色)</SelectItem>
                  <SelectItem value="warning">警告 (橙色)</SelectItem>
                  <SelectItem value="info">信息 (蓝色)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>标题</Label>
            <Input
              placeholder="通知标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label>消息内容</Label>
            <Textarea
              placeholder="通知内容..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={sendAlertMutation.isPending || sendTextMutation.isPending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-1" />
            {sendAlertMutation.isPending || sendTextMutation.isPending ? "发送中..." : "发送测试消息"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 统计概览 ====================
function StatsOverview() {
  const { data: stats } = trpc.feishuNotification.getStats.useQuery();
  const { data: configs } = trpc.feishuNotification.listConfigs.useQuery();

  const statsData = stats as unknown as { total?: number; success_count?: number; failed_count?: number };

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="text-sm text-muted-foreground">Webhook配置</div>
          <div className="text-2xl font-bold mt-1">{configs?.length ?? 0}</div>
          <div className="text-xs text-muted-foreground">
            启用 {configs?.filter((c) => c.enabled).length ?? 0}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="text-sm text-muted-foreground">24h发送总量</div>
          <div className="text-2xl font-bold mt-1">{statsData?.total ?? 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="text-sm text-muted-foreground">成功</div>
          <div className="text-2xl font-bold mt-1 text-green-600">{statsData?.success_count ?? 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="text-sm text-muted-foreground">失败</div>
          <div className="text-2xl font-bold mt-1 text-red-600">{statsData?.failed_count ?? 0}</div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 主页面 ====================
export default function FeishuNotification() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">飞书通知管理</h2>
        <p className="text-muted-foreground">
          配置飞书群机器人Webhook，接收系统告警、日报、异常通知等消息推送
        </p>
      </div>

      <StatsOverview />

      <Tabs defaultValue="configs">
        <TabsList>
          <TabsTrigger value="configs">
            <Settings className="h-4 w-4 mr-1" /> Webhook配置
          </TabsTrigger>
          <TabsTrigger value="logs">
            <History className="h-4 w-4 mr-1" /> 通知日志
          </TabsTrigger>
          <TabsTrigger value="test">
            <Send className="h-4 w-4 mr-1" /> 手动测试
          </TabsTrigger>
        </TabsList>
        <TabsContent value="configs" className="mt-4">
          <WebhookConfigsTab />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <NotificationLogsTab />
        </TabsContent>
        <TabsContent value="test" className="mt-4">
          <TestSendTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
