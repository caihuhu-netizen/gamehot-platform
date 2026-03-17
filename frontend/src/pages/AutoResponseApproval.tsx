import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShieldCheck, Clock, CheckCircle, XCircle, Timer,
  TrendingUp, TrendingDown, Minus, BarChart3, Settings2, Plus, Trash2,
  Bell, RefreshCw, Eye, Bot, Loader2, Download, Layers, BookOpen,
  ExternalLink, Pencil,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSearch, Link } from "wouter";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";

const APPROVAL_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "待审批", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock },
  approved: { label: "已通过", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", icon: CheckCircle },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", icon: XCircle },
  expired: { label: "已过期", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: Timer },
  auto_approved: { label: "自动通过", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", icon: Bot },
};

const EFFECT_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  tracking: { label: "追踪中", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", icon: Eye },
  improved: { label: "已改善", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", icon: TrendingUp },
  no_change: { label: "无变化", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: Minus },
  degraded: { label: "已恶化", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", icon: TrendingDown },
  completed: { label: "已完成", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", icon: CheckCircle },
};

const RESPONSE_TYPE_LABEL: Record<string, string> = {
  create_experiment: "创建实验", adjust_difficulty: "调整难度", all: "全部类型",
};

const RISK_LABEL: Record<string, { label: string; color: string }> = {
  low: { label: "低风险", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  medium: { label: "中风险", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  high: { label: "高风险", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

const ACTION_LABEL: Record<string, string> = {
  auto_approve: "自动审批", auto_reject: "自动拒绝", auto_extend: "自动延期", require_approval: "需要审批",
};

const TIMEOUT_ACTION_LABEL: Record<string, string> = {
  expire: "过期", auto_approve: "自动通过", auto_extend: "自动延期",
};

const APPROVAL_MODE_LABEL: Record<string, string> = {
  auto: "自动审批", single: "单人审批", multi: "多人会签",
};

const ESCALATION_ACTION_LABEL: Record<string, string> = {
  notify_admin: "通知管理员", auto_approve: "自动通过", auto_reject: "自动拒绝",
};

type TabType = "approvals" | "effects" | "policies" | "levelConfigs" | "feishuGuide";

export default function AutoResponseApproval() {
  const { currentGameId } = useGame();
  const [activeTab, setActiveTab] = useState<TabType>("approvals");
  const searchString = useSearch();
  const [feishuAction, setFeishuAction] = useState<{ action: string; id: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const action = params.get("action");
    const id = params.get("id");
    if (action && id && (action === "approve" || action === "reject")) {
      setFeishuAction({ action, id: Number(id) });
      setActiveTab("approvals");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchString]);

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: "approvals", label: "审批管理", icon: ShieldCheck },
    { key: "effects", label: "效果追踪", icon: BarChart3 },
    { key: "policies", label: "策略配置", icon: Settings2 },
    { key: "levelConfigs", label: "权限分级", icon: Layers },
    { key: "feishuGuide", label: "飞书配置", icon: BookOpen },
  ];

  return (
    <div className="space-y-4">
      <CrossModuleLinks links={MODULE_LINKS.anomalyMonitor || []} />
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit flex-wrap">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="h-4 w-4" />{tab.label}
            </button>
          );
        })}
      </div>
      {activeTab === "approvals" && <ApprovalTab gameId={currentGameId} feishuAction={feishuAction} onFeishuActionHandled={() => setFeishuAction(null)} />}
      {activeTab === "effects" && <EffectTrackingTab gameId={currentGameId} />}
      {activeTab === "policies" && <PolicyTab gameId={currentGameId} />}
      {activeTab === "levelConfigs" && <LevelConfigTab gameId={currentGameId} />}
      {activeTab === "feishuGuide" && <FeishuGuideTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ApprovalTab (with export button)
// ═══════════════════════════════════════════════════════════════
function ApprovalTab({ gameId, feishuAction, onFeishuActionHandled }: { gameId: number | null; feishuAction?: { action: string; id: number } | null; onFeishuActionHandled?: () => void }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; id: number; action: "approved" | "rejected" }>({ open: false, id: 0, action: "approved" });
  const [reviewComment, setReviewComment] = useState("");
  const feishuHandled = useRef(false);

  useEffect(() => {
    if (feishuAction && !feishuHandled.current) {
      feishuHandled.current = true;
      setStatusFilter("pending");
      setReviewDialog({
        open: true,
        id: feishuAction.id,
        action: feishuAction.action === "approve" ? "approved" : "rejected",
      });
      onFeishuActionHandled?.();
    }
  }, [feishuAction, onFeishuActionHandled]);

  const { data: stats } = trpc.autoResponseApproval.getApprovalStats.useQuery({ gameId: gameId ?? undefined });
  const { data: approvals, isLoading, refetch } = trpc.autoResponseApproval.listApprovals.useQuery({
    gameId: gameId ?? undefined, status: statusFilter === "all" ? undefined : statusFilter,
  });

  const reviewMut = trpc.autoResponseApproval.review.useMutation({
    onSuccess: () => { toast.success("审批操作成功"); refetch(); setReviewDialog({ open: false, id: 0, action: "approved" }); setReviewComment(""); },
    onError: () => toast.error("审批操作失败"),
  });
  const processTimeoutsMut = trpc.autoResponseApproval.processTimeouts.useMutation({
    onSuccess: (r) => { toast.success(`处理完成: 自动审批 ${r.autoApproved} 条, 过期 ${r.expired} 条`); refetch(); },
    onError: () => toast.error("超时处理失败"),
  });
  const notifyMut = trpc.autoResponseApproval.notifyPendingApprovals.useMutation({
    onSuccess: (r) => { r.sent ? toast.success(`已推送通知: ${r.pending} 条待审批`) : toast.info("当前无待审批项"); },
    onError: () => toast.error("通知发送失败"),
  });
  const exportMut = trpc.autoResponseApproval.exportApprovals.useMutation({
    onSuccess: (r) => {
      toast.success(`导出成功: ${r.totalRows} 条记录`);
      window.open(r.url, "_blank");
    },
    onError: () => toast.error("导出失败"),
  });

  const rows = (approvals?.rows || []) as any[];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(APPROVAL_STATUS).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setStatusFilter(key === statusFilter ? "all" : key)}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{cfg.label}</span></div>
                <p className="text-2xl font-bold mt-1">{Number(stats?.[key] ?? 0)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(APPROVAL_STATUS).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportMut.mutate({ gameId: gameId ?? undefined, status: statusFilter === "all" ? undefined : statusFilter })} disabled={exportMut.isPending}>
            {exportMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}导出Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => notifyMut.mutate()} disabled={notifyMut.isPending}><Bell className="h-3.5 w-3.5 mr-1" />推送提醒</Button>
          <Button variant="outline" size="sm" onClick={() => processTimeoutsMut.mutate()} disabled={processTimeoutsMut.isPending}><Timer className="h-3.5 w-3.5 mr-1" />处理超时</Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1" />刷新</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary/60" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>暂无审批记录</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((item: any) => {
            const sc = APPROVAL_STATUS[item.status] || APPROVAL_STATUS.pending;
            const SI = sc.icon;
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={sc.color}><SI className="h-3 w-3 mr-1" />{sc.label}</Badge>
                        <Badge variant="outline">{RESPONSE_TYPE_LABEL[item.response_type] || item.response_type}</Badge>
                        {item.rule_name && <span className="text-xs text-muted-foreground">规则: {item.rule_name}</span>}
                      </div>
                      <p className="text-sm font-medium mt-1">{item.action_summary}</p>
                      {item.action_payload?.levelConfig && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {item.action_payload.levelConfig.approvalMode === "multi" ? "多人会签" : item.action_payload.levelConfig.approvalMode === "auto" ? "自动审批" : "单人审批"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">风险等级: {item.action_payload.levelConfig.riskLevel === "high" ? "高" : item.action_payload.levelConfig.riskLevel === "medium" ? "中" : "低"}</span>
                          {item.action_payload.levelConfig.name && <span className="text-xs text-muted-foreground">({item.action_payload.levelConfig.name})</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>创建: {new Date(item.created_at).toLocaleString()}</span>
                        {item.expires_at && <span>过期: {new Date(item.expires_at).toLocaleString()}</span>}
                        {item.reviewed_by && <span>审批人: {item.reviewed_by}</span>}
                        {item.execution_status && item.execution_status !== "not_executed" && (
                          <Badge variant="outline" className="text-xs">执行: {item.execution_status === "success" ? "成功" : item.execution_status === "failed" ? "失败" : "执行中"}</Badge>
                        )}
                      </div>
                      {item.review_comment && <p className="text-xs text-muted-foreground mt-1 italic">备注: {item.review_comment}</p>}
                    </div>
                    {item.status === "pending" && (
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <Button size="sm" onClick={() => setReviewDialog({ open: true, id: item.id, action: "approved" })}><CheckCircle className="h-3.5 w-3.5 mr-1" />通过</Button>
                        <Button size="sm" variant="destructive" onClick={() => setReviewDialog({ open: true, id: item.id, action: "rejected" })}><XCircle className="h-3.5 w-3.5 mr-1" />拒绝</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {approvals?.total && Number(approvals.total) > 20 && <p className="text-center text-xs text-muted-foreground">显示 {rows.length} / {approvals.total} 条记录</p>}
        </div>
      )}

      <Dialog open={reviewDialog.open} onOpenChange={(o) => setReviewDialog(p => ({ ...p, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewDialog.action === "approved" ? "确认通过" : "确认拒绝"}</DialogTitle>
            <DialogDescription>{reviewDialog.action === "approved" ? "通过后将自动执行该操作" : "拒绝后该操作将不会执行"}</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="审批备注（可选）" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(p => ({ ...p, open: false }))}>取消</Button>
            <Button variant={reviewDialog.action === "approved" ? "default" : "destructive"} disabled={reviewMut.isPending}
              onClick={() => reviewMut.mutate({ id: reviewDialog.id, status: reviewDialog.action, reviewComment: reviewComment || undefined })}>
              {reviewMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              确认{reviewDialog.action === "approved" ? "通过" : "拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EffectTrackingTab (unchanged)
// ═══════════════════════════════════════════════════════════════
function EffectTrackingTab({ gameId }: { gameId: number | null }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: stats } = trpc.autoResponseApproval.getEffectTrackingStats.useQuery({ gameId: gameId ?? undefined });
  const { data: tracking, isLoading } = trpc.autoResponseApproval.listEffectTracking.useQuery({
    gameId: gameId ?? undefined, effectStatus: statusFilter === "all" ? undefined : statusFilter,
  });
  const rows = (tracking?.rows || []) as any[];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(EFFECT_STATUS).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setStatusFilter(key === statusFilter ? "all" : key)}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{cfg.label}</span></div>
                <p className="text-2xl font-bold mt-1">{Number(stats?.[key] ?? 0)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          {Object.entries(EFFECT_STATUS).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary/60" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>暂无效果追踪记录</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((item: any) => {
            const sc = EFFECT_STATUS[item.effect_status] || EFFECT_STATUS.tracking;
            const SI = sc.icon;
            const baseline = Number(item.baseline_value);
            const latest = item.value_7d ?? item.value_72h ?? item.value_24h ?? item.value_6h ?? item.value_1h;
            const latestNum = latest != null ? Number(latest) : null;
            const pct = latestNum != null && baseline !== 0 ? (((latestNum - baseline) / baseline) * 100).toFixed(1) : null;
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={sc.color}><SI className="h-3 w-3 mr-1" />{sc.label}</Badge>
                    <Badge variant="outline">{RESPONSE_TYPE_LABEL[item.response_type] || item.response_type}</Badge>
                    <span className="text-xs font-medium">{item.metric}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <div><p className="text-xs text-muted-foreground">基线值</p><p className="text-sm font-semibold">{baseline.toFixed(2)}</p></div>
                    {item.value_1h != null && <div><p className="text-xs text-muted-foreground">1h</p><p className="text-sm font-semibold">{Number(item.value_1h).toFixed(2)}</p></div>}
                    {item.value_24h != null && <div><p className="text-xs text-muted-foreground">24h</p><p className="text-sm font-semibold">{Number(item.value_24h).toFixed(2)}</p></div>}
                    {item.value_7d != null && <div><p className="text-xs text-muted-foreground">7d</p><p className="text-sm font-semibold">{Number(item.value_7d).toFixed(2)}</p></div>}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {pct != null && <span className={Number(pct) > 0 ? "text-green-600" : Number(pct) < 0 ? "text-red-600" : ""}>变化: {Number(pct) > 0 ? "+" : ""}{pct}%</span>}
                    {item.effect_score != null && <span>效果评分: {Number(item.effect_score).toFixed(1)}</span>}
                    <span>开始: {new Date(Number(item.tracking_started_at)).toLocaleString()}</span>
                  </div>
                  {item.effect_summary && <p className="text-xs text-muted-foreground mt-1">{item.effect_summary}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PolicyTab (unchanged)
// ═══════════════════════════════════════════════════════════════
function PolicyTab({ gameId }: { gameId: number | null }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", responseType: "all", riskLevel: "medium", action: "require_approval", timeoutHours: 24, timeoutAction: "expire", extendHours: 168 });

  const { data: policies = [], isLoading, refetch } = trpc.autoResponseApproval.listPolicies.useQuery({ gameId: gameId ?? undefined });
  const createMut = trpc.autoResponseApproval.createPolicy.useMutation({
    onSuccess: () => { toast.success("策略创建成功"); refetch(); setCreateOpen(false); setForm({ name: "", description: "", responseType: "all", riskLevel: "medium", action: "require_approval", timeoutHours: 24, timeoutAction: "expire", extendHours: 168 }); },
    onError: () => toast.error("创建失败"),
  });
  const updateMut = trpc.autoResponseApproval.updatePolicy.useMutation({
    onSuccess: () => { toast.success("已更新"); refetch(); },
    onError: () => toast.error("更新失败"),
  });
  const deleteMut = trpc.autoResponseApproval.deletePolicy.useMutation({
    onSuccess: () => { toast.success("已删除"); refetch(); },
    onError: () => toast.error("删除失败"),
  });

  const policyList = policies as any[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">审批策略配置</h3><p className="text-sm text-muted-foreground">配置不同类型操作的审批策略和超时处理方式</p></div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />新建策略</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary/60" /></div>
      ) : policyList.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Settings2 className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>暂无审批策略</p><p className="text-xs mt-1">创建策略以配置自动审批和超时处理规则</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {policyList.map((p: any) => {
            const rc = RISK_LABEL[p.risk_level] || RISK_LABEL.medium;
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{p.name}</span>
                        <Badge className={rc.color}>{rc.label}</Badge>
                        <Badge variant="outline">{RESPONSE_TYPE_LABEL[p.response_type] || p.response_type}</Badge>
                        <Badge variant={p.enabled ? "default" : "secondary"}>{p.enabled ? "启用" : "禁用"}</Badge>
                      </div>
                      {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>动作: {ACTION_LABEL[p.action] || p.action}</span>
                        <span>超时: {p.timeout_hours}h</span>
                        <span>超时处理: {TIMEOUT_ACTION_LABEL[p.timeout_action] || p.timeout_action}</span>
                        {p.created_by && <span>创建人: {p.created_by}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ id: p.id, enabled: p.enabled ? 0 : 1 })}>{p.enabled ? "禁用" : "启用"}</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("确认删除此策略？")) deleteMut.mutate({ id: p.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新建审批策略</DialogTitle><DialogDescription>配置自动响应操作的审批规则和超时处理方式</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">策略名称</label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如：高风险操作需人工审批" /></div>
            <div><label className="text-sm font-medium">描述</label><Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="策略说明" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">响应类型</label>
                <Select value={form.responseType} onValueChange={(v) => setForm(f => ({ ...f, responseType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">全部类型</SelectItem><SelectItem value="create_experiment">创建实验</SelectItem><SelectItem value="adjust_difficulty">调整难度</SelectItem></SelectContent>
                </Select></div>
              <div><label className="text-sm font-medium">风险等级</label>
                <Select value={form.riskLevel} onValueChange={(v) => setForm(f => ({ ...f, riskLevel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">低风险</SelectItem><SelectItem value="medium">中风险</SelectItem><SelectItem value="high">高风险</SelectItem></SelectContent>
                </Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">审批动作</label>
                <Select value={form.action} onValueChange={(v) => setForm(f => ({ ...f, action: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="require_approval">需要审批</SelectItem><SelectItem value="auto_approve">自动审批</SelectItem><SelectItem value="auto_reject">自动拒绝</SelectItem><SelectItem value="auto_extend">自动延期</SelectItem></SelectContent>
                </Select></div>
              <div><label className="text-sm font-medium">超时时间(小时)</label><Input type="number" value={form.timeoutHours} onChange={(e) => setForm(f => ({ ...f, timeoutHours: Number(e.target.value) }))} min={1} max={720} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">超时处理</label>
                <Select value={form.timeoutAction} onValueChange={(v) => setForm(f => ({ ...f, timeoutAction: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="expire">过期</SelectItem><SelectItem value="auto_approve">自动通过</SelectItem><SelectItem value="auto_extend">自动延期</SelectItem></SelectContent>
                </Select></div>
              {form.timeoutAction === "auto_extend" && <div><label className="text-sm font-medium">延期时间(小时)</label><Input type="number" value={form.extendHours} onChange={(e) => setForm(f => ({ ...f, extendHours: Number(e.target.value) }))} min={1} max={720} /></div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button disabled={!form.name || createMut.isPending}
              onClick={() => createMut.mutate({ gameId: gameId ?? 0, name: form.name, description: form.description || undefined, responseType: form.responseType as any, riskLevel: form.riskLevel as any, action: form.action as any, timeoutHours: form.timeoutHours, timeoutAction: form.timeoutAction as any, extendHours: form.extendHours })}>
              {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LevelConfigTab (NEW - Approval Permission Tiers)
// ═══════════════════════════════════════════════════════════════
interface LevelConfigItem {
  id: number;
  game_id: number;
  name: string;
  description: string | null;
  risk_level: string;
  response_type: string;
  approval_mode: string;
  required_approvers: number;
  approver_roles: string;
  escalation_hours: number;
  escalation_action: string;
  priority: number;
  enabled: number | boolean;
  created_at: string;
  updated_at: string;
}

function LevelConfigTab({ gameId }: { gameId: number | null }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<LevelConfigItem | null>(null);
  const defaultForm = {
    name: "", description: "", riskLevel: "medium", responseType: "all",
    approvalMode: "single", requiredApprovers: 1, approverRoles: [] as string[],
    escalationHours: 24, escalationAction: "notify_admin", priority: 0,
  };
  const [form, setForm] = useState(defaultForm);

  const { data: configs = [], isLoading, refetch } = trpc.autoResponseApproval.listLevelConfigs.useQuery({ gameId: gameId ?? undefined });
  const createMut = trpc.autoResponseApproval.createLevelConfig.useMutation({
    onSuccess: () => { toast.success("权限分级创建成功"); refetch(); setCreateOpen(false); setForm(defaultForm); },
    onError: () => toast.error("创建失败"),
  });
  const updateMut = trpc.autoResponseApproval.updateLevelConfig.useMutation({
    onSuccess: () => { toast.success("已更新"); refetch(); setEditItem(null); },
    onError: () => toast.error("更新失败"),
  });
  const deleteMut = trpc.autoResponseApproval.deleteLevelConfig.useMutation({
    onSuccess: () => { toast.success("已删除"); refetch(); },
    onError: () => toast.error("删除失败"),
  });
  const exportSLAMut = trpc.autoResponseApproval.exportSLAStats.useMutation({
    onSuccess: (r) => {
      toast.success(`SLA报表导出成功: ${r.totalRows} 条记录`);
      window.open(r.url, "_blank");
    },
    onError: () => toast.error("SLA报表导出失败"),
  });

  const configList = configs as LevelConfigItem[];

  const openEdit = (item: LevelConfigItem) => {
    setEditItem(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      riskLevel: item.risk_level || "medium",
      responseType: item.response_type || "all",
      approvalMode: item.approval_mode || "single",
      requiredApprovers: Number(item.required_approvers) || 1,
      approverRoles: (() => { try { return JSON.parse(item.approver_roles || "[]"); } catch { return []; } })(),
      escalationHours: Number(item.escalation_hours) || 24,
      escalationAction: item.escalation_action || "notify_admin",
      priority: Number(item.priority) || 0,
    });
  };

  const handleSave = () => {
    if (editItem) {
      updateMut.mutate({
        id: editItem.id,
        name: form.name,
        description: form.description || undefined,
        riskLevel: form.riskLevel as any,
        responseType: form.responseType as any,
        approvalMode: form.approvalMode as any,
        requiredApprovers: form.requiredApprovers,
        approverRoles: form.approverRoles,
        escalationHours: form.escalationHours,
        escalationAction: form.escalationAction as any,
        priority: form.priority,
      });
    } else {
      createMut.mutate({
        gameId: gameId ?? 0,
        name: form.name,
        description: form.description || undefined,
        riskLevel: form.riskLevel as any,
        responseType: form.responseType as any,
        approvalMode: form.approvalMode as any,
        requiredApprovers: form.requiredApprovers,
        approverRoles: form.approverRoles,
        escalationHours: form.escalationHours,
        escalationAction: form.escalationAction as any,
        priority: form.priority,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">审批权限分级</h3>
          <p className="text-sm text-muted-foreground">根据风险等级配置不同的审批模式（自动/单人/多人会签）</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportSLAMut.mutate()} disabled={exportSLAMut.isPending}>
            {exportSLAMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}导出SLA报表
          </Button>
          <Button size="sm" onClick={() => { setEditItem(null); setForm(defaultForm); setCreateOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" />新建分级
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {(["low", "medium", "high"] as const).map(level => {
          const rc = RISK_LABEL[level];
          const count = configList.filter(c => c.risk_level === level).length;
          return (
            <Card key={level}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Badge className={rc.color}>{rc.label}</Badge>
                  <span className="text-xs text-muted-foreground">{count} 条规则</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary/60" /></div>
      ) : configList.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Layers className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>暂无权限分级配置</p><p className="text-xs mt-1">创建分级规则以实现不同风险等级的差异化审批</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {configList.map((c: LevelConfigItem) => {
            const rc = RISK_LABEL[c.risk_level] || RISK_LABEL.medium;
            let roles: string[] = [];
            try { roles = JSON.parse(c.approver_roles || "[]"); } catch { /* ignore */ }
            return (
              <Card key={c.id} className={`hover:shadow-md transition-shadow ${!c.enabled ? "opacity-60" : ""}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{c.name}</span>
                        <Badge className={rc.color}>{rc.label}</Badge>
                        <Badge variant="outline">{RESPONSE_TYPE_LABEL[c.response_type] || c.response_type}</Badge>
                        <Badge variant="secondary">{APPROVAL_MODE_LABEL[c.approval_mode] || c.approval_mode}</Badge>
                        {!c.enabled && <Badge variant="secondary">已禁用</Badge>}
                      </div>
                      {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>需要审批人: {c.required_approvers}</span>
                        {roles.length > 0 && <span>审批角色: {roles.join(", ")}</span>}
                        <span>升级时间: {c.escalation_hours}h</span>
                        <span>升级动作: {ESCALATION_ACTION_LABEL[c.escalation_action] || c.escalation_action}</span>
                        <span>优先级: {c.priority}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5 mr-1" />编辑</Button>
                      <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ id: c.id, enabled: !c.enabled })}>{c.enabled ? "禁用" : "启用"}</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("确认删除此分级配置？")) deleteMut.mutate({ id: c.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen || !!editItem} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditItem(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "编辑权限分级" : "新建权限分级"}</DialogTitle>
            <DialogDescription>配置不同风险等级的审批模式和升级策略</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">名称</label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如：高风险多人会签" /></div>
            <div><label className="text-sm font-medium">描述</label><Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="分级说明" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">风险等级</label>
                <Select value={form.riskLevel} onValueChange={(v) => setForm(f => ({ ...f, riskLevel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">低风险</SelectItem><SelectItem value="medium">中风险</SelectItem><SelectItem value="high">高风险</SelectItem></SelectContent>
                </Select></div>
              <div><label className="text-sm font-medium">响应类型</label>
                <Select value={form.responseType} onValueChange={(v) => setForm(f => ({ ...f, responseType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">全部类型</SelectItem><SelectItem value="create_experiment">创建实验</SelectItem><SelectItem value="adjust_difficulty">调整难度</SelectItem></SelectContent>
                </Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">审批模式</label>
                <Select value={form.approvalMode} onValueChange={(v) => setForm(f => ({ ...f, approvalMode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="auto">自动审批</SelectItem><SelectItem value="single">单人审批</SelectItem><SelectItem value="multi">多人会签</SelectItem></SelectContent>
                </Select></div>
              <div><label className="text-sm font-medium">需要审批人数</label><Input type="number" value={form.requiredApprovers} onChange={(e) => setForm(f => ({ ...f, requiredApprovers: Number(e.target.value) }))} min={0} max={10} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">升级时间(小时)</label><Input type="number" value={form.escalationHours} onChange={(e) => setForm(f => ({ ...f, escalationHours: Number(e.target.value) }))} min={1} max={720} /></div>
              <div><label className="text-sm font-medium">升级动作</label>
                <Select value={form.escalationAction} onValueChange={(v) => setForm(f => ({ ...f, escalationAction: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="notify_admin">通知管理员</SelectItem><SelectItem value="auto_approve">自动通过</SelectItem><SelectItem value="auto_reject">自动拒绝</SelectItem></SelectContent>
                </Select></div>
            </div>
            <div><label className="text-sm font-medium">优先级 (0-100, 越高越优先)</label><Input type="number" value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: Number(e.target.value) }))} min={0} max={100} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditItem(null); }}>取消</Button>
            <Button disabled={!form.name || createMut.isPending || updateMut.isPending} onClick={handleSave}>
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editItem ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FeishuGuideTab (NEW - Webhook Configuration Guide)
// ═══════════════════════════════════════════════════════════════
function FeishuGuideTab() {
  const steps = [
    {
      step: 1,
      title: "进入飞书通知配置",
      description: "在系统侧边栏找到「飞书通知」页面，确认已配置好飞书机器人 Webhook 地址。",
      action: (
        <Link href="/feishu-notification">
          <Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" />前往飞书通知设置</Button>
        </Link>
      ),
    },
    {
      step: 2,
      title: "启用审批相关事件类型",
      description: "在飞书通知配置页面的「事件类型」中，确保以下事件已启用：\n- approval_pending（审批待处理）\n- approval_review（审批结果通知）\n- approval_timeout（审批超时提醒）",
      action: null,
    },
    {
      step: 3,
      title: "配置审批策略",
      description: "在「策略配置」Tab 中创建审批策略，设置不同风险等级的审批动作和超时处理方式。策略将决定何时触发飞书通知。",
      action: null,
    },
    {
      step: 4,
      title: "测试通知推送",
      description: "在「审批管理」Tab 中点击「推送提醒」按钮，验证飞书机器人是否能正常接收审批通知。如果有待审批项，系统会自动发送汇总通知。",
      action: null,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">飞书 Webhook 配置引导</h3>
        <p className="text-sm text-muted-foreground">按照以下步骤配置飞书审批通知，实现审批消息实时推送到飞书群</p>
      </div>

      <div className="grid gap-4">
        {steps.map(s => (
          <Card key={s.step} className="hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                  {s.step}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{s.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{s.description}</p>
                  {s.action && <div className="mt-3">{s.action}</div>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-200">通知类型说明</h4>
              <div className="mt-2 space-y-1.5 text-sm text-blue-800 dark:text-blue-300">
                <p><strong>approval_pending</strong> - 新审批项创建时推送，包含操作摘要、风险等级和快捷审批按钮</p>
                <p><strong>approval_review</strong> - 审批完成（通过/拒绝）时推送，通知相关人员审批结果</p>
                <p><strong>approval_timeout</strong> - 审批超时自动处理时推送，包含自动审批和过期的统计</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium text-amber-900 dark:text-amber-200">飞书交互卡片</h4>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                审批通知使用飞书交互卡片格式，包含「通过」「拒绝」「查看详情」三个操作按钮。
                点击按钮将直接跳转到系统审批页面并自动弹出审批对话框，无需手动查找审批项。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
