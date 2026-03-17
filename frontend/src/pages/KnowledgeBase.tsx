import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, Plus, Edit, Trash2, BookOpen, Tag, Calendar, FileText, Brain } from "lucide-react";
import { Streamdown } from "streamdown";
const CATEGORIES = [
  { value: "all", label: "全部分类" },
  { value: "segment_strategy", label: "分层策略" },
  { value: "monetize_playbook", label: "变现手册" },
  { value: "acquisition_guide", label: "获客指南" },
  { value: "retention_tactics", label: "留存技巧" },
  { value: "ab_testing", label: "A/B实验" },
  { value: "industry_insight", label: "行业洞察" },
  { value: "best_practice", label: "最佳实践" },
  { value: "troubleshooting", label: "问题排查" },
];

const MODULES = [
  { value: "all", label: "全部模块" },
  { value: "segments", label: "用户分层" },
  { value: "monetize", label: "变现管理" },
  { value: "acquisition", label: "获客投放" },
  { value: "analytics", label: "数据分析" },
  { value: "experiments", label: "A/B实验" },
  { value: "difficulty", label: "难度调度" },
  { value: "loop_engine", label: "闭环引擎" },
];

export default function KnowledgeBase() {
  const { currentGameId } = useGame();
  // toast from sonner is already imported
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterModule, setFilterModule] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("best_practice");
  const [formModule, setFormModule] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTags, setFormTags] = useState("");

  const utils = trpc.useUtils();

  // Queries
  const { data: listData, isLoading: listLoading } = trpc.knowledgeBase.listKnowledge.useQuery({
    category: filterCategory !== "all" ? filterCategory : undefined,
    module: filterModule !== "all" ? filterModule : undefined,
    gameId: currentGameId ?? undefined,
  });

  const { data: searchData, isLoading: searchLoading } = trpc.knowledgeBase.searchKnowledge.useQuery(
    { keyword: searchKeyword },
    { enabled: searchKeyword.length >= 2 }
  );

  // Mutations
  const createMutation = trpc.knowledgeBase.createKnowledge.useMutation({
    onSuccess: () => {
      toast.success("创建成功");
      setShowCreateDialog(false);
      resetForm();
      utils.knowledgeBase.listKnowledge.invalidate();
    },
    onError: (err) => toast.error("创建失败: " + err.message),
  });

  const updateMutation = trpc.knowledgeBase.updateKnowledge.useMutation({
    onSuccess: () => {
      toast.success("更新成功");
      setShowCreateDialog(false);
      setEditingItem(null);
      resetForm();
      utils.knowledgeBase.listKnowledge.invalidate();
    },
    onError: (err) => toast.error("更新失败: " + err.message),
  });

  const deleteMutation = trpc.knowledgeBase.deleteKnowledge.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      utils.knowledgeBase.listKnowledge.invalidate();
    },
    onError: (err) => toast.error("删除失败: " + err.message),
  });

  const displayData = useMemo(() => {
    if (searchKeyword.length >= 2 && searchData) return searchData;
    return listData || [];
  }, [searchKeyword, searchData, listData]);

  function resetForm() {
    setFormTitle("");
    setFormCategory("best_practice");
    setFormModule("");
    setFormContent("");
    setFormTags("");
  }

  function openCreate() {
    resetForm();
    setEditingItem(null);
    setShowCreateDialog(true);
  }

  function openEdit(item: any) {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormModule(item.relatedModule || "");
    setFormContent(item.content);
    setFormTags(item.tags ? (typeof item.tags === "string" ? item.tags : JSON.parse(item.tags).join(", ")) : "");
    setShowCreateDialog(true);
  }

  function handleSave() {
    const tags = formTags.split(",").map(t => t.trim()).filter(Boolean);
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        title: formTitle,
        category: formCategory,
        content: formContent,
        tags,
        relatedModule: formModule || undefined,
      });
    } else {
      createMutation.mutate({
        title: formTitle,
        category: formCategory,
        content: formContent,
        tags,
        relatedModule: formModule || undefined,
      });
    }
  }

  function getCategoryLabel(value: string) {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  }

  function getModuleLabel(value: string) {
    return MODULES.find(m => m.value === value)?.label || value;
  }

  const isLoading = listLoading || (searchKeyword.length >= 2 && searchLoading);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            知识库
          </h1>
          <p className="text-muted-foreground mt-1">运营经验沉淀与最佳实践共享，支持AI自学习与智能推荐</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> 新建知识
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索知识库（标题、内容、标签）..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODULES.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{displayData.length}</div>
            <div className="text-xs text-muted-foreground">知识条目</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">
              {Array.from(new Set((displayData as Record<string, unknown>[]).map((d: Record<string,unknown>) => d.category))).length}
            </div>
            <div className="text-xs text-muted-foreground">分类数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">
              {Array.from(new Set((displayData as Record<string, unknown>[]).flatMap((d: any) => {
                try { return JSON.parse(d.tags || "[]"); } catch { return []; }
              }))).length}
            </div>
            <div className="text-xs text-muted-foreground">标签数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold text-purple-500">AI</div>
            <div className="text-xs text-muted-foreground">自学习中</div>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : displayData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">暂无知识条目</p>
            <Button variant="outline" className="mt-3" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> 创建第一条知识
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(displayData as Record<string, unknown>[]).map((item: Record<string,unknown>) => {
            let tags: string[] = [];
            try { tags = JSON.parse(item.tags || "[]"); } catch { tags = []; }
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => { setSelectedItem(item); setShowDetailDialog(true); }}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{item.title}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{getCategoryLabel(item.category)}</Badge>
                        {item.relatedModule && (
                          <Badge variant="outline" className="text-xs">{getModuleLabel(item.relatedModule)}</Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" aria-label="编辑" className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="删除" className="h-7 w-7 text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: item.id }); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {item.content?.substring(0, 150)}...
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {tags.slice(0, 4).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="h-2.5 w-2.5 mr-0.5" />{tag}
                      </Badge>
                    ))}
                    {tags.length > 4 && <Badge variant="outline" className="text-xs">+{tags.length - 4}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}
                    </span>
                    {item.createdBy && <span>{item.createdBy}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "编辑知识" : "新建知识"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">标题</label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="知识条目标题" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">分类</label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c.value !== "all").map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">关联模块</label>
                <Select value={formModule || "none"} onValueChange={(v) => setFormModule(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无</SelectItem>
                    {MODULES.filter(m => m.value !== "all").map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">内容（支持Markdown）</label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="在此输入知识内容，支持Markdown格式..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">标签（逗号分隔）</label>
              <Input value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="分层, 变现, 策略" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={!formTitle || !formContent || createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedItem.title}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{getCategoryLabel(selectedItem.category)}</Badge>
                  {selectedItem.relatedModule && (
                    <Badge variant="outline">{getModuleLabel(selectedItem.relatedModule)}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {selectedItem.createdBy} · {selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : "-"}
                  </span>
                </div>
              </DialogHeader>
              <div className="prose prose-sm dark:prose-invert max-w-none mt-4">
                <Streamdown>{selectedItem.content}</Streamdown>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => { setShowDetailDialog(false); openEdit(selectedItem); }}>
                  <Edit className="h-4 w-4 mr-1" /> 编辑
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
