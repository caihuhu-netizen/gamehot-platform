import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Bell, PlusCircle, Send, Loader2, Trash2, Eye, Users, BarChart3,
  FileText, Copy, Pencil, Search, Megaphone, RotateCcw, CalendarDays,
  Settings, Tag, Hash, ArrowRight, } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useTableSelection } from "@/hooks/useTableSelection";
import BatchActionBar from "@/components/BatchActionBar";
import { useGame } from "@/contexts/GameContext";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";

/* ── Status / Channel maps ── */
const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "草稿", variant: "secondary" },
  scheduled: { label: "已排期", variant: "outline" },
  sending: { label: "发送中", variant: "default" },
  sent: { label: "已发送", variant: "default" },
  failed: { label: "失败", variant: "destructive" },
};
const channelMap: Record<string, string> = {
  push: "推送通知", in_app: "应用内消息", email: "邮件", sms: "短信",
};
const channelIcon: Record<string, React.ReactNode> = {
  push: <Bell className="h-3.5 w-3.5" />,
  in_app: <Megaphone className="h-3.5 w-3.5" />,
  email: <FileText className="h-3.5 w-3.5" />,
  sms: <Send className="h-3.5 w-3.5" />,
};
const categoryMap: Record<string, { label: string; color: string }> = {
  system: { label: "系统通知", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  marketing: { label: "营销推广", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
  recall: { label: "用户召回", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  event: { label: "赛事活动", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  custom: { label: "自定义", color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20" },
};
const categoryIcons: Record<string, React.ReactNode> = {
  system: <Settings className="h-4 w-4" />,
  marketing: <Megaphone className="h-4 w-4" />,
  recall: <RotateCcw className="h-4 w-4" />,
  event: <CalendarDays className="h-4 w-4" />,
  custom: <Tag className="h-4 w-4" />,
};

/* ── Variable type ── */
interface TemplateVariable {
  key: string;
  label: string;
  defaultValue?: string;
}

export default function PushCenter() {
  const { currentGameId } = useGame();
  const utils = trpc.useUtils();

  /* ── Push tasks queries ── */
  const { data: tasks = [], isLoading } = trpc.pushCenter.list.useQuery({ gameId: currentGameId ?? undefined });
  const { data: stats } = trpc.pushCenter.stats.useQuery({ gameId: currentGameId ?? undefined });

  /* ── Push tasks mutations ── */
  const createMutation = trpc.pushCenter.create.useMutation({
    onSuccess: () => { utils.pushCenter.list.invalidate(); utils.pushCenter.stats.invalidate(); toast.success("推送任务创建成功"); setShowCreate(false); resetForm(); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const sendMutation = trpc.pushCenter.send.useMutation({
    onSuccess: () => { utils.pushCenter.list.invalidate(); utils.pushCenter.stats.invalidate(); toast.success("推送已发送"); },
  });
  const deleteMutation = trpc.pushCenter.delete.useMutation({
    onSuccess: () => { utils.pushCenter.list.invalidate(); utils.pushCenter.stats.invalidate(); toast.success("任务已删除"); },
  });

  /* ── Push templates queries ── */
  const [tplCategory, setTplCategory] = useState<string>("all");
  const [tplSearch, setTplSearch] = useState("");
  const tplQueryInput = useMemo(() => ({
    ...(tplCategory !== "all" ? { category: tplCategory } : {}),
    ...(tplSearch ? { search: tplSearch } : {}),
  }), [tplCategory, tplSearch]);
  const { data: templates = [], isLoading: tplLoading } = trpc.pushTemplates.list.useQuery(tplQueryInput);
  const { data: tplCategories = [] } = trpc.pushTemplates.categories.useQuery({ gameId: currentGameId ?? undefined });

  /* ── Push templates mutations ── */
  const createTplMutation = trpc.pushTemplates.create.useMutation({
    onSuccess: () => { utils.pushTemplates.list.invalidate(); utils.pushTemplates.categories.invalidate(); toast.success("模板创建成功"); setShowTplCreate(false); resetTplForm(); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const updateTplMutation = trpc.pushTemplates.update.useMutation({
    onSuccess: () => { utils.pushTemplates.list.invalidate(); utils.pushTemplates.categories.invalidate(); toast.success("模板更新成功"); setEditTpl(null); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const deleteTplMutation = trpc.pushTemplates.delete.useMutation({
    onSuccess: () => { utils.pushTemplates.list.invalidate(); utils.pushTemplates.categories.invalidate(); toast.success("模板已删除"); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const useTplMutation = trpc.pushTemplates.useTemplate.useMutation({
    onSuccess: (data) => {
      setForm({
        name: data.title,
        title: data.title,
        content: data.content,
        channel: (data.channel as "push" | "in_app" | "email" | "sms") || "push",
        targetType: "all",
      });
      setShowCreate(true);
      toast.success("模板已应用到推送任务");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  /* ── Push task state ── */
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", title: "", content: "", channel: "push" as "push" | "in_app" | "email" | "sms", targetType: "all" as "all" | "segment" | "custom" });
  const resetForm = () => setForm({ name: "", title: "", content: "", channel: "push", targetType: "all" });

  /* ── Template state ── */
  const [showTplCreate, setShowTplCreate] = useState(false);
  const [editTpl, setEditTpl] = useState<any>(null);
  const [previewTpl, setPreviewTpl] = useState<any>(null);
  const [tplForm, setTplForm] = useState({
    name: "", title: "", content: "", channel: "push" as string,
    category: "custom" as string, description: "",
    variables: [] as TemplateVariable[],
  });
  const resetTplForm = () => setTplForm({ name: "", title: "", content: "", channel: "push", category: "custom", description: "", variables: [] });

  /* ── Handlers ── */
  const handleCreate = () => {
    if (!form.title || !form.content) { toast.error("请填写标题和内容"); return; }
    if (!form.name) form.name = form.title;
    createMutation.mutate(form);
  };

  const handleCreateTpl = () => {
    if (!tplForm.name || !tplForm.title || !tplForm.content) { toast.error("请填写模板名称、标题和内容"); return; }
    createTplMutation.mutate({
      ...tplForm,
      variables: tplForm.variables.length > 0 ? tplForm.variables : undefined,
    } as any);
  };

  const handleUpdateTpl = () => {
    if (!editTpl) return;
    updateTplMutation.mutate({
      id: editTpl.id,
      name: tplForm.name || undefined,
      title: tplForm.title || undefined,
      content: tplForm.content || undefined,
      channel: tplForm.channel as any,
      category: tplForm.category as any,
      description: tplForm.description || undefined,
      variables: tplForm.variables.length > 0 ? (tplForm.variables as unknown as Record<string, unknown>[]) : undefined,
    });
  };

  const openEditTpl = (tpl: any) => {
    setEditTpl(tpl);
    const vars = Array.isArray(tpl.variables) ? tpl.variables : [];
    setTplForm({
      name: tpl.name, title: tpl.title, content: tpl.content,
      channel: tpl.channel, category: tpl.category,
      description: tpl.description || "",
      variables: vars,
    });
  };

  const addVariable = () => {
    setTplForm(f => ({ ...f, variables: [...f.variables, { key: "", label: "", defaultValue: "" }] }));
  };
  const removeVariable = (idx: number) => {
    setTplForm(f => ({ ...f, variables: f.variables.filter((_, i) => i !== idx) }));
  };
  const updateVariable = (idx: number, field: keyof TemplateVariable, value: string) => {
    setTplForm(f => ({
      ...f,
      variables: f.variables.map((v, i) => i === idx ? { ...v, [field]: value } : v),
    }));
  };

  /* ── Render variable preview ── */
  const renderPreview = (content: string, variables: TemplateVariable[]) => {
    let result = content;
    for (const v of variables) {
      result = result.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, "g"), v.defaultValue || `[${v.label || v.key}]`);
    }
    return result;
  };

  const detailTask = tasks.find((t: any) => t.id === detailId);
  const selection = useTableSelection(tasks as { id: number }[]);

  const handleBatchSend = async () => {
    const draftItems = selection.selectedItems.filter((t: any) => t.status === "draft");
    if (draftItems.length === 0) { toast.error("选中的任务中没有草稿状态的任务"); return; }
    let success = 0, fail = 0;
    for (const item of draftItems) {
      try { await sendMutation.mutateAsync({ id: item.id }); success++; } catch { fail++; }
    }
    toast.success(`批量发送完成: ${success} 成功${fail > 0 ? `, ${fail} 失败` : ""}`);
    selection.clear();
  };

  const handleBatchDelete = async () => {
    const deletable = selection.selectedItems.filter((t: any) => t.status === "draft" || t.status === "failed");
    if (deletable.length === 0) { toast.error("选中的任务中没有可删除的任务（仅草稿/失败可删除）"); return; }
    let success = 0, fail = 0;
    for (const item of deletable) {
      try { await deleteMutation.mutateAsync({ id: item.id }); success++; } catch { fail++; }
    }
    toast.success(`批量删除完成: ${success} 成功${fail > 0 ? `, ${fail} 失败` : ""}`);
    selection.clear();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="pt-4 sm:pt-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">总推送数</p><p className="text-xl sm:text-2xl font-bold">{stats?.total || 0}</p></div><Bell className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">已发送</p><p className="text-xl sm:text-2xl font-bold">{stats?.sent || 0}</p></div><Send className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">已排期</p><p className="text-xl sm:text-2xl font-bold">{stats?.scheduled || 0}</p></div><Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">平均打开率</p><p className="text-xl sm:text-2xl font-bold">{(stats?.avgOpenRate || 0).toFixed(1)}%</p></div><BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" /></div></CardContent></Card>
      </div>

      <Tabs defaultValue="list">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="list">推送列表</TabsTrigger>
            <TabsTrigger value="templates">模板管理</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }}><PlusCircle className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">创建推送</span><span className="sm:hidden">创建</span></Button>
        </div>

        {/* ═══════════════════ Push List Tab ═══════════════════ */}
        <TabsContent value="list" className="mt-4 space-y-3">
          {selection.hasSelection && (
            <BatchActionBar
              selectedCount={selection.selectedCount}
              totalCount={tasks.length}
              onClear={selection.clear}
              actions={[
                {
                  label: "批量发送",
                  icon: <Send className="h-3 w-3" />,
                  needsConfirm: true,
                  confirmTitle: "批量发送推送",
                  confirmDescription: `将发送选中的 ${selection.selectedItems.filter((t: any) => t.status === "draft").length} 条草稿推送任务。`,
                  onClick: handleBatchSend,
                },
                {
                  label: "批量删除",
                  icon: <Trash2 className="h-3 w-3" />,
                  variant: "destructive",
                  needsConfirm: true,
                  confirmTitle: "批量删除推送",
                  confirmDescription: `将删除选中的 ${selection.selectedItems.filter((t: any) => t.status === "draft" || t.status === "failed").length} 条可删除任务（仅草稿/失败状态）。`,
                  onClick: handleBatchDelete,
                },
              ]}
            />
          )}

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : tasks.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <Bell className="mx-auto h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">暂无推送任务</p>
              <p className="mt-1">点击"创建推送"开始向用户发送消息</p>
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
                      <TableHead>标题</TableHead>
                      <TableHead className="hidden sm:table-cell">渠道</TableHead>
                      <TableHead className="hidden md:table-cell">目标</TableHead>
                      <TableHead className="hidden md:table-cell">触达数</TableHead>
                      <TableHead className="hidden lg:table-cell">打开率</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="hidden sm:table-cell">创建时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((t: any) => {
                      const st = statusMap[t.status] || statusMap.draft;
                      return (
                        <TableRow key={t.id} className={selection.isSelected(t.id) ? "bg-primary/5" : ""}>
                          <TableCell><Checkbox checked={selection.isSelected(t.id)} onCheckedChange={() => selection.toggle(t.id)} aria-label={`选择 ${t.title}`} /></TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">{t.title}</TableCell>
                          <TableCell className="hidden sm:table-cell"><Badge variant="outline">{channelMap[t.channel] || t.channel}</Badge></TableCell>
                          <TableCell className="hidden md:table-cell">{t.targetType === "all" ? "全部用户" : t.targetType === "segment" ? "分群用户" : "自定义"}</TableCell>
                          <TableCell className="hidden md:table-cell">{(t.totalDelivered || 0).toLocaleString()}</TableCell>
                          <TableCell className="hidden lg:table-cell">{t.openRate ? `${Number(t.openRate).toFixed(1)}%` : "-"}</TableCell>
                          <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                          <TableCell className="text-xs hidden sm:table-cell">{new Date(t.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" aria-label="查看" className="h-8 w-8" onClick={() => setDetailId(t.id)}><Eye className="h-4 w-4" /></Button>
                              {t.status === "draft" && (
                                <Button variant="ghost" size="icon" aria-label="发送" className="h-8 w-8" onClick={() => sendMutation.mutate({ id: t.id })}><Send className="h-4 w-4 text-green-600" /></Button>
                              )}
                              {(t.status === "draft" || t.status === "failed") && (
                                <Button variant="ghost" size="icon" aria-label="删除" className="h-8 w-8" onClick={() => { if (confirm("确认删除?")) deleteMutation.mutate({ id: t.id }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

        {/* ═══════════════════ Templates Tab ═══════════════════ */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索模板..."
                  className="pl-9 w-[200px]"
                  value={tplSearch}
                  onChange={(e) => setTplSearch(e.target.value)}
                />
              </div>
              <Select value={tplCategory} onValueChange={setTplCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {Object.entries(categoryMap).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => { resetTplForm(); setShowTplCreate(true); }}>
              <PlusCircle className="mr-1.5 h-4 w-4" />新建模板
            </Button>
          </div>

          {/* Category summary */}
          {tplCategories.length > 0 && tplCategory === "all" && (
            <div className="flex gap-2 flex-wrap">
              {tplCategories.map((c: any) => {
                const cat = categoryMap[c.category] || categoryMap.custom;
                return (
                  <button
                    key={c.category}
                    onClick={() => setTplCategory(c.category)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:opacity-80 ${cat.color}`}
                  >
                    {categoryIcons[c.category]}
                    {cat.label}
                    <span className="ml-0.5 opacity-70">{c.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Template cards */}
          {tplLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : templates.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">暂无推送模板</p>
              <p className="mt-1">点击"新建模板"创建您的第一个推送模板</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl: any) => {
                const cat = categoryMap[tpl.category] || categoryMap.custom;
                const vars: TemplateVariable[] = Array.isArray(tpl.variables) ? tpl.variables : [];
                return (
                  <Card key={tpl.id} className="group relative overflow-hidden transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-semibold truncate">{tpl.name}</CardTitle>
                          <CardDescription className="text-xs mt-0.5 truncate">{tpl.title}</CardDescription>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className={`text-[10px] px-1.5 ${cat.color}`}>
                            {cat.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {channelIcon[tpl.channel]}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{tpl.content}</p>
                      {vars.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {vars.slice(0, 3).map((v: TemplateVariable) => (
                            <span key={v.key} className="inline-flex items-center gap-0.5 text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              <Hash className="h-2.5 w-2.5" />{v.label || v.key}
                            </span>
                          ))}
                          {vars.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{vars.length - 3}</span>
                          )}
                        </div>
                      )}
                      {tpl.description && (
                        <p className="text-[11px] text-muted-foreground mt-2 italic line-clamp-1">{tpl.description}</p>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0 pb-3 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        使用 {tpl.usageCount || 0} 次
                        {tpl.isBuiltin ? " · 内置" : ""}
                      </span>
                      <div className="flex gap-1">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="查看" className="h-7 w-7" onClick={() => setPreviewTpl(tpl)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>预览</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="前进" className="h-7 w-7" onClick={() => useTplMutation.mutate({ id: tpl.id })}>
                                <ArrowRight className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>使用模板创建推送</TooltipContent>
                          </Tooltip>
                          {!tpl.isBuiltin && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label="编辑" className="h-7 w-7" onClick={() => openEditTpl(tpl)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>编辑</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label="删除" className="h-7 w-7" onClick={() => { if (confirm("确认删除此模板？")) deleteTplMutation.mutate({ id: tpl.id }); }}>
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>删除</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </TooltipProvider>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════ Create Push Dialog ═══════════════════ */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>创建推送任务</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>推送标题 *</Label><Input placeholder="输入推送标题" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>推送内容 *</Label><Textarea placeholder="输入推送内容" rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>推送渠道</Label>
                <Select value={form.channel} onValueChange={(v: "push" | "in_app" | "email" | "sms") => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">推送通知</SelectItem>
                    <SelectItem value="in_app">应用内消息</SelectItem>
                    <SelectItem value="email">邮件</SelectItem>
                    <SelectItem value="sms">短信</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>目标用户</Label>
                <Select value={form.targetType} onValueChange={(v: "all" | "segment" | "custom") => setForm({ ...form, targetType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部用户</SelectItem>
                    <SelectItem value="segment">分群用户</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? "创建中..." : "创建任务"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ Push Detail Dialog ═══════════════════ */}
      <Dialog open={detailId !== null} onOpenChange={() => setDetailId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>推送详情</DialogTitle></DialogHeader>
          {detailTask && (
            <div className="space-y-4">
              <div><span className="text-sm text-muted-foreground">标题:</span> <strong>{detailTask.title}</strong></div>
              <div><span className="text-sm text-muted-foreground">内容:</span> <p className="mt-1 text-sm bg-muted p-3 rounded">{detailTask.content}</p></div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">类型:</span> {detailTask.type}</div>
                <div><span className="text-muted-foreground">状态:</span> <Badge variant={statusMap[detailTask.status]?.variant}>{statusMap[detailTask.status]?.label}</Badge></div>
                <div><span className="text-muted-foreground">触达数:</span> {(detailTask.totalDelivered || 0).toLocaleString()}</div>
                <div><span className="text-muted-foreground">打开数:</span> {(detailTask.totalOpened || 0).toLocaleString()}</div>
                <div><span className="text-muted-foreground">创建时间:</span> {new Date(detailTask.createdAt).toLocaleString()}</div>
                {detailTask.sentAt && <div><span className="text-muted-foreground">发送时间:</span> {new Date(detailTask.sentAt).toLocaleString()}</div>}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setDetailId(null)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ Create Template Dialog ═══════════════════ */}
      <Dialog open={showTplCreate} onOpenChange={setShowTplCreate}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建推送模板</DialogTitle>
            <DialogDescription>创建可复用的推送消息模板，支持变量占位符。</DialogDescription>
          </DialogHeader>
          <TemplateFormFields form={tplForm} setForm={setTplForm} addVariable={addVariable} removeVariable={removeVariable} updateVariable={updateVariable} renderPreview={renderPreview} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTplCreate(false)}>取消</Button>
            <Button onClick={handleCreateTpl} disabled={createTplMutation.isPending}>{createTplMutation.isPending ? "创建中..." : "创建模板"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ Edit Template Dialog ═══════════════════ */}
      <Dialog open={editTpl !== null} onOpenChange={() => setEditTpl(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑推送模板</DialogTitle>
            <DialogDescription>修改模板内容和变量配置。</DialogDescription>
          </DialogHeader>
          <TemplateFormFields form={tplForm} setForm={setTplForm} addVariable={addVariable} removeVariable={removeVariable} updateVariable={updateVariable} renderPreview={renderPreview} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTpl(null)}>取消</Button>
            <Button onClick={handleUpdateTpl} disabled={updateTplMutation.isPending}>{updateTplMutation.isPending ? "保存中..." : "保存修改"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ Preview Template Dialog ═══════════════════ */}
      <Dialog open={previewTpl !== null} onOpenChange={() => setPreviewTpl(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>模板预览</DialogTitle>
            <DialogDescription>{previewTpl?.name}</DialogDescription>
          </DialogHeader>
          {previewTpl && (() => {
            const vars: TemplateVariable[] = Array.isArray(previewTpl.variables) ? previewTpl.variables : [];
            const cat = categoryMap[previewTpl.category] || categoryMap.custom;
            return (
              <div className="space-y-4">
      <CrossModuleLinks links={MODULE_LINKS.pushCenter} />
                <div className="flex gap-2">
                  <Badge variant="outline" className={cat.color}>{cat.label}</Badge>
                  <Badge variant="outline">{channelMap[previewTpl.channel] || previewTpl.channel}</Badge>
                  {previewTpl.isBuiltin ? <Badge variant="secondary">内置</Badge> : null}
                </div>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-sm">{renderPreview(previewTpl.title, vars)}</p>
                  <p className="text-sm whitespace-pre-wrap">{renderPreview(previewTpl.content, vars)}</p>
                </div>
                {vars.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">变量列表</p>
                    <div className="space-y-1">
                      {vars.map((v: TemplateVariable) => (
                        <div key={v.key} className="flex items-center gap-2 text-xs">
                          <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">{`{{${v.key}}}`}</code>
                          <span className="text-muted-foreground">{v.label}</span>
                          {v.defaultValue && <span className="text-muted-foreground/60">= {v.defaultValue}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {previewTpl.description && (
                  <p className="text-xs text-muted-foreground italic">{previewTpl.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground">使用次数: {previewTpl.usageCount || 0} · 创建于 {new Date(previewTpl.createdAt).toLocaleDateString()}</p>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreviewTpl(null)}>关闭</Button>
            <Button onClick={() => { useTplMutation.mutate({ id: previewTpl.id }); setPreviewTpl(null); }}>
              <ArrowRight className="mr-1.5 h-4 w-4" />使用此模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Shared Template Form Fields ── */
function TemplateFormFields({
  form, setForm, addVariable, removeVariable, updateVariable, renderPreview,
}: {
  form: { name: string; title: string; content: string; channel: string; category: string; description: string; variables: TemplateVariable[] };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  addVariable: () => void;
  removeVariable: (idx: number) => void;
  updateVariable: (idx: number, field: keyof TemplateVariable, value: string) => void;
  renderPreview: (content: string, variables: TemplateVariable[]) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>模板名称 *</Label>
          <Input placeholder="如：新版本更新通知" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>分类</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(categoryMap).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>渠道</Label>
        <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="push">推送通知</SelectItem>
            <SelectItem value="in_app">应用内消息</SelectItem>
            <SelectItem value="email">邮件</SelectItem>
            <SelectItem value="sms">短信</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>推送标题 *</Label>
        <Input placeholder="支持 {{变量名}} 占位符" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>推送内容 *</Label>
        <Textarea placeholder="支持 {{变量名}} 占位符，如：{{username}}，好久不见！" rows={4} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>描述（可选）</Label>
        <Input placeholder="模板用途说明" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>

      {/* Variables editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>变量配置</Label>
          <Button type="button" variant="outline" size="sm" onClick={addVariable}>
            <PlusCircle className="mr-1 h-3 w-3" />添加变量
          </Button>
        </div>
        {form.variables.length > 0 && (
          <div className="space-y-2">
            {form.variables.map((v, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input className="flex-1" placeholder="变量key" value={v.key} onChange={e => updateVariable(idx, "key", e.target.value)} />
                <Input className="flex-1" placeholder="显示名称" value={v.label} onChange={e => updateVariable(idx, "label", e.target.value)} />
                <Input className="flex-1" placeholder="默认值" value={v.defaultValue || ""} onChange={e => updateVariable(idx, "defaultValue", e.target.value)} />
                <Button type="button" variant="ghost" size="icon" aria-label="删除" className="h-8 w-8 shrink-0" onClick={() => removeVariable(idx)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live preview */}
      {form.title && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">实时预览</Label>
          <div className="bg-muted rounded-lg p-3 space-y-1">
            <p className="font-semibold text-sm">{renderPreview(form.title, form.variables)}</p>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{renderPreview(form.content, form.variables)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
