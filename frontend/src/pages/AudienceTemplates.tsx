import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Crown, Fish, TrendingUp, Target, AlertTriangle, Moon, CloudOff,
  ArrowUpRight, UserPlus, Users, UserX, UserCheck, Layers, RefreshCw,
  Monitor, Zap, EyeOff, XCircle, AlertOctagon, Award, Leaf, DollarSign,
  ShieldAlert, AlertCircle, Activity, Search, Plus, Sparkles, UsersRound,
  LayoutGrid, ChevronRight, Loader2, Copy } from "lucide-react";

// Icon mapping for template icons
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Crown, Fish, TrendingUp, Target, AlertTriangle, Moon, CloudOff,
  ArrowUpRight, UserPlus, Users, UserX, UserCheck, Layers, RefreshCw,
  Monitor, Zap, EyeOff, XCircle, AlertOctagon, Award, Leaf, DollarSign,
  ShieldAlert, AlertCircle, Activity,
};

// Category color mapping
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "高价值用户": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  "流失风险": { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20" },
  "新用户": { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", border: "border-green-500/20" },
  "鲁班分层": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  "广告行为": { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  "关卡进度": { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
  "渠道归因": { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/20" },
  "复合场景": { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/20" },
};

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  "高价值用户": Crown,
  "流失风险": AlertTriangle,
  "新用户": UserPlus,
  "鲁班分层": Layers,
  "广告行为": Monitor,
  "关卡进度": Award,
  "渠道归因": Leaf,
  "复合场景": Sparkles,
};

// Operator labels for condition display
const OPERATOR_LABELS: Record<string, string> = {
  eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤",
  in: "∈", not_in: "∉", contains: "包含", between: "介于",
  is_null: "为空", is_not_null: "不为空",
};

interface AudienceCondition {
  field: string;
  operator: string;
  value: any;
}

function ConditionBadge({ condition, fieldLabels }: { condition: AudienceCondition; fieldLabels: Record<string, string> }) {
  const { currentGameId } = useGame();
  const fieldLabel = fieldLabels[condition.field] || condition.field;
  const opLabel = OPERATOR_LABELS[condition.operator] || condition.operator;
  const valueStr = Array.isArray(condition.value) ? condition.value.join(", ") : String(condition.value ?? "");

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-xs font-mono">
      <span className="text-muted-foreground">{fieldLabel}</span>
      <span className="text-primary font-semibold">{opLabel}</span>
      <span className="text-foreground max-w-[120px] truncate">{valueStr}</span>
    </span>
  );
}

export default function AudienceTemplates() {
  const { currentGameId } = useGame();
  const { user } = useAuth();
  // toast from sonner
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [audienceName, setAudienceName] = useState("");
  const [audienceDesc, setAudienceDesc] = useState("");
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const [previewCounts, setPreviewCounts] = useState<Record<number, { count: number; loading: boolean }>>({});

  // Queries
  const { data: templates = [], isLoading } = trpc.audienceTemplates.list.useQuery(
    selectedCategory ? { category: selectedCategory } : undefined
  );
  const { data: categories = [] } = trpc.audienceTemplates.categories.useQuery({ gameId: currentGameId ?? undefined });
  const { data: fieldRegistry = [] } = trpc.audience.getFieldRegistry.useQuery({ gameId: currentGameId ?? undefined });

  // Build field label map
  const fieldLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of fieldRegistry) {
      map[f.field] = f.label;
    }
    return map;
  }, [fieldRegistry]);

  // Mutations
  const createAudienceMutation = trpc.audienceTemplates.createAudience.useMutation({
    onSuccess: (data) => {
      toast.success(`已从模板「${data.templateName}」创建分群`);
      setCreateDialogOpen(false);
      setAudienceName("");
      setAudienceDesc("");
      navigate("/audience");
    },
    onError: (err) => {
      toast.error(`创建失败: ${err.message}`);
    },
  });

  const previewCountMutation = trpc.audienceTemplates.previewCount.useMutation({
    onSuccess: (data, variables) => {
      setPreviewCounts(prev => ({
        ...prev,
        [variables.id]: { count: data.count, loading: false },
      }));
    },
    onError: (_, variables) => {
      setPreviewCounts(prev => ({
        ...prev,
        [variables.id]: { count: 0, loading: false },
      }));
    },
  });

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase();
    return templates.filter((t: any) =>
      t.name.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      (t.tags as string[] || []).some((tag: string) => tag.toLowerCase().includes(q))
    );
  }, [templates, searchQuery]);

  // Group templates by category for display
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const t of filteredTemplates) {
      const cat = (t as any).category || "其他";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return groups;
  }, [filteredTemplates]);

  const handlePreview = (templateId: number) => {
    setPreviewCounts(prev => ({
      ...prev,
      [templateId]: { count: 0, loading: true },
    }));
    previewCountMutation.mutate({ id: templateId });
  };

  const handleCreateFromTemplate = (template: any) => {
    setSelectedTemplate(template);
    setAudienceName(`${template.name} - ${new Date().toLocaleDateString("zh-CN")}`);
    setAudienceDesc(template.description || "");
    setCreateDialogOpen(true);
  };

  const handleConfirmCreate = () => {
    if (!selectedTemplate || !audienceName.trim()) return;
    createAudienceMutation.mutate({
      templateId: selectedTemplate.id,
      name: audienceName.trim(),
      description: audienceDesc.trim() || undefined,
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">分群模板库</h1>
          <p className="text-muted-foreground mt-1">
            预设 {templates.length} 个常用分群模板，一键创建用户分群
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/audience")}>
            <UsersRound className="mr-2 h-4 w-4" />
            我的分群
          </Button>
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索模板名称、描述或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
            全部
          </Button>
          {categories.map((cat) => {
            const colors = CATEGORY_COLORS[cat.category] || { bg: "bg-muted", text: "text-foreground", border: "border-border" };
            const CatIcon = CATEGORY_ICONS[cat.category] || Sparkles;
            return (
              <Button
                key={cat.category}
                variant={selectedCategory === cat.category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(selectedCategory === cat.category ? null : cat.category)}
                className={selectedCategory !== cat.category ? `${colors.text} hover:${colors.bg}` : ""}
              >
                <CatIcon className="mr-1.5 h-3.5 w-3.5" />
                {cat.category}
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                  {cat.count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Template Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="py-20">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">未找到匹配的模板</p>
            <p className="text-muted-foreground mt-1">尝试调整搜索条件或选择其他分类</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
          const colors = CATEGORY_COLORS[category] || { bg: "bg-muted", text: "text-foreground", border: "border-border" };
          const CatIcon = CATEGORY_ICONS[category] || Sparkles;

          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`rounded-md p-1.5 ${colors.bg}`}>
                  <CatIcon className={`h-4 w-4 ${colors.text}`} />
                </div>
                <h2 className="text-lg font-semibold">{category}</h2>
                <Badge variant="outline" className="text-xs">{categoryTemplates.length} 个模板</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {categoryTemplates.map((template: any) => {
                  const IconComp = ICON_MAP[template.icon] || Sparkles;
                  const conditions = (template.conditions || []) as AudienceCondition[];
                  const preview = previewCounts[template.id];
                  const tags = (template.tags || []) as string[];

                  return (
                    <Card
                      key={template.id}
                      className={`group relative overflow-hidden transition-all hover:shadow-md border ${colors.border} hover:border-primary/30`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className={`rounded-lg p-2 ${colors.bg}`}>
                            <IconComp className={`h-5 w-5 ${colors.text}`} />
                          </div>
                          {template.usageCount > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              已使用 {template.usageCount} 次
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base mt-2">{template.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-2">
                          {template.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pb-2">
                        {/* Condition preview */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            匹配条件 ({template.matchType === "all" ? "全部满足" : "任一满足"})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {conditions.slice(0, 3).map((cond, i) => (
                              <ConditionBadge key={i} condition={cond} fieldLabels={fieldLabels} />
                            ))}
                            {conditions.length > 3 && (
                              <span className="text-[10px] text-muted-foreground self-center">
                                +{conditions.length - 3} 更多
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tags.slice(0, 4).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Preview count */}
                        {preview && (
                          <div className={`mt-2 rounded-md p-2 ${colors.bg}`}>
                            {preview.loading ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                计算中...
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">预估匹配</span>
                                <span className={`text-sm font-bold ${colors.text}`}>
                                  {preview.count.toLocaleString()} 人
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="pt-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => handlePreview(template.id)}
                          disabled={preview?.loading}
                        >
                          {preview?.loading ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <UsersRound className="mr-1 h-3 w-3" />
                          )}
                          预估人数
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => handleCreateFromTemplate(template)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          创建分群
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Create Audience Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              从模板创建分群
            </DialogTitle>
            <DialogDescription>
              基于模板「{selectedTemplate?.name}」创建新的用户分群
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              {/* Template info */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{(selectedTemplate as any).category}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {((selectedTemplate.conditions || []) as AudienceCondition[]).length} 个条件 · {selectedTemplate.matchType === "all" ? "全部满足" : "任一满足"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {((selectedTemplate.conditions || []) as AudienceCondition[]).map((cond: AudienceCondition, i: number) => (
                    <ConditionBadge key={i} condition={cond} fieldLabels={fieldLabels} />
                  ))}
                </div>
              </div>

              {/* Audience name */}
              <div className="space-y-2">
                <Label htmlFor="audience-name">分群名称 *</Label>
                <Input
                  id="audience-name"
                  value={audienceName}
                  onChange={(e) => setAudienceName(e.target.value)}
                  placeholder="输入分群名称"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="audience-desc">描述（可选）</Label>
                <Textarea
                  id="audience-desc"
                  value={audienceDesc}
                  onChange={(e) => setAudienceDesc(e.target.value)}
                  placeholder="输入分群描述"
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleConfirmCreate}
              disabled={!audienceName.trim() || createAudienceMutation.isPending}
            >
              {createAudienceMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              创建分群
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
