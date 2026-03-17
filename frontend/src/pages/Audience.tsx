import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";
import { toast } from "sonner";
import { Users, Clock, RefreshCw, PlusCircle, Trash2, Settings2,
  Calculator, Loader2, Eye, Download, Zap, AlertCircle, CheckCircle2, LayoutGrid, } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: "活跃", color: "bg-green-500" },
  paused: { label: "暂停", color: "bg-yellow-500" },
  archived: { label: "归档", color: "bg-gray-400" },
};

interface Condition {
  field: string;
  operator: string;
  value: string;
}

const Audience = () => {
  const { currentGameId } = useGame();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: audiences = [], isLoading } = trpc.audience.list.useQuery({ gameId: currentGameId ?? undefined });
  const { data: fieldRegistry = [] } = trpc.audience.getFieldRegistry.useQuery({ gameId: currentGameId ?? undefined });
  const { data: operatorList = [] } = trpc.audience.getOperators.useQuery({ gameId: currentGameId ?? undefined });

  const createMutation = trpc.audience.create.useMutation({
    onSuccess: () => {
      utils.audience.list.invalidate();
      toast.success("分群创建成功");
      setTab("list");
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.audience.delete.useMutation({
    onSuccess: () => { utils.audience.list.invalidate(); toast.success("分群已删除"); },
  });
  const updateMutation = trpc.audience.update.useMutation({
    onSuccess: () => { utils.audience.list.invalidate(); toast.success("状态已更新"); },
  });
  const calcMutation = trpc.audience.calculateCount.useMutation({
    onSuccess: (data) => {
      utils.audience.list.invalidate();
      if (data.validationErrors && data.validationErrors.length > 0) {
        toast.error(`条件验证失败: ${data.validationErrors.join("; ")}`);
      } else {
        toast.success(`匹配用户数: ${data.count.toLocaleString()} (耗时 ${data.queryTime}ms)`);
      }
    },
  });
  const previewMutation = trpc.audience.preview.useMutation();

  const [tab, setTab] = useState("list");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [matchType, setMatchType] = useState<"all" | "any">("all");
  const [conditions, setConditions] = useState<Condition[]>([{ field: "", operator: "", value: "" }]);
  const [manageId, setManageId] = useState<number | null>(null);

  // 按分组组织字段
  const fieldGroups = useMemo(() => {
    const groups: Record<string, typeof fieldRegistry> = {};
    for (const f of fieldRegistry) {
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    }
    return groups;
  }, [fieldRegistry]);

  // 获取字段定义
  const getFieldDef = (fieldName: string) => fieldRegistry.find(f => f.field === fieldName);

  // 根据字段类型过滤可用运算符
  const getOperatorsForField = (fieldName: string) => {
    const fieldDef = getFieldDef(fieldName);
    if (!fieldDef) return operatorList;

    if (fieldDef.type === "string") {
      return operatorList.filter(o => ["eq", "neq", "in", "not_in", "contains", "is_null", "is_not_null"].includes(o.value));
    }
    if (fieldDef.type === "date") {
      return operatorList.filter(o => ["gt", "gte", "lt", "lte", "between", "is_null", "is_not_null"].includes(o.value));
    }
    // number / decimal
    return operatorList.filter(o => ["eq", "neq", "gt", "gte", "lt", "lte", "between", "in", "not_in"].includes(o.value));
  };

  const addCondition = () => setConditions([...conditions, { field: "", operator: "", value: "" }]);
  const removeCondition = (i: number) => setConditions(conditions.filter((_, idx) => idx !== i));
  const updateCondition = (i: number, key: keyof Condition, val: string) => {
    const next = [...conditions];
    next[i] = { ...next[i], [key]: val };
    // 切换字段时重置运算符和值
    if (key === "field") {
      next[i].operator = "";
      next[i].value = "";
    }
    setConditions(next);
  };

  const getValidConditions = () => conditions.filter(c => c.field && c.operator && (c.value || c.operator === "is_null" || c.operator === "is_not_null"));

  const handleCreate = () => {
    if (!name.trim()) { toast.error("请输入分群名称"); return; }
    const validConditions = getValidConditions();
    if (validConditions.length === 0) { toast.error("请至少添加一个完整条件"); return; }
    createMutation.mutate({ name, description, matchType, conditions: validConditions });
  };

  const handlePreview = () => {
    const validConditions = getValidConditions();
    if (validConditions.length === 0) { toast.error("请至少添加一个完整条件"); return; }
    previewMutation.mutate({ conditions: validConditions, matchType });
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setMatchType("all");
    setConditions([{ field: "", operator: "", value: "" }]);
    previewMutation.reset();
  };

  const managed = audiences.find((a: any) => a.id === manageId);

  // 获取值输入的 placeholder
  const getValuePlaceholder = (cond: Condition) => {
    const fieldDef = getFieldDef(cond.field);
    if (!fieldDef) return "值";
    if (cond.operator === "between") return "最小值,最大值";
    if (cond.operator === "in" || cond.operator === "not_in") return "值1,值2,值3";
    if (fieldDef.type === "date") return "YYYY-MM-DD 或 7d(7天前)";
    if (fieldDef.type === "number") return "数值";
    if (fieldDef.type === "decimal") return "小数值";
    return "值";
  };

  const isUnaryOperator = (op: string) => op === "is_null" || op === "is_not_null";

  return (
    <div className="p-4 md:p-6">
      <CrossModuleLinks links={MODULE_LINKS.audience} />
      <div className="flex items-center justify-between mb-4 mt-3">
        <div />
        <Button variant="outline" size="sm" onClick={() => navigate("/audience/templates")}>
          <LayoutGrid className="mr-2 h-4 w-4" />
          分群模板库
        </Button>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="list">分群列表</TabsTrigger>
          <TabsTrigger value="create" onClick={resetForm}>创建分群</TabsTrigger>
        </TabsList>

        {/* ==================== 分群列表 ==================== */}
        <TabsContent value="list" className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : audiences.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4 opacity-40" />
                <p className="text-lg font-medium">暂无分群</p>
                <p className="mt-1">点击"创建分群"开始定义您的目标用户群体</p>
                <Button className="mt-4" onClick={() => setTab("create")}>
                  <PlusCircle className="mr-2 h-4 w-4" />创建第一个分群
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {audiences.map((audience: any) => {
                const st = statusMap[audience.status] || statusMap.active;
                const condCount = (audience.conditions as any[])?.length || 0;
                return (
                  <Card key={audience.id} className="group hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg truncate">{audience.name}</CardTitle>
                        <span className={`h-3 w-3 rounded-full ${st.color}`} title={st.label} />
                      </div>
                      {audience.description && (
                        <CardDescription className="line-clamp-2">{audience.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2 pb-3">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="mr-2 h-4 w-4 shrink-0" />
                        <span>用户数: <strong className="text-foreground">{audience.userCount ? audience.userCount.toLocaleString() : "未计算"}</strong></span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Zap className="mr-2 h-4 w-4 shrink-0" />
                        <span>条件: <Badge variant="secondary" className="ml-1">{condCount} 个</Badge>
                          <Badge variant="outline" className="ml-1">{audience.matchType === "all" ? "AND" : "OR"}</Badge>
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-2 h-4 w-4 shrink-0" />
                        <span>{audience.lastCalcAt
                          ? `计算于 ${new Date(audience.lastCalcAt).toLocaleString()}`
                          : `创建于 ${new Date(audience.createdAt).toLocaleDateString()}`
                        }</span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between gap-2 pt-0">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => calcMutation.mutate({ id: audience.id })}
                        disabled={calcMutation.isPending}
                      >
                        <Calculator className="mr-1 h-3 w-3" />
                        {calcMutation.isPending ? "计算中..." : "重算"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setManageId(audience.id)}>
                        <Settings2 className="mr-1 h-3 w-3" />管理
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ==================== 创建分群 ==================== */}
        <TabsContent value="create" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* 左侧：条件编辑器 */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>创建新分群</CardTitle>
                  <CardDescription>
                    通过组合不同用户属性来定义目标用户群体。支持基础属性、鲁班分层、关卡进度、预测标签、归因数据等多维度条件。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">分群名称</label>
                      <Input placeholder="例如：高价值付费用户" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">描述（可选）</label>
                      <Input placeholder="分群用途描述" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                  </div>

                  <Separator />

                  {/* 条件编辑区 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">条件匹配方式</span>
                        <Select value={matchType} onValueChange={(v: "all" | "any") => setMatchType(v)}>
                          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全部满足 (AND)</SelectItem>
                            <SelectItem value="any">任一满足 (OR)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {getValidConditions().length} / {conditions.length} 条件有效
                      </Badge>
                    </div>

                    <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                      {conditions.map((cond, i) => (
                        <div key={i} className="flex items-start gap-2 flex-wrap sm:flex-nowrap">
                          {i > 0 && (
                            <Badge variant="secondary" className="mt-2 shrink-0 text-xs">
                              {matchType === "all" ? "且" : "或"}
                            </Badge>
                          )}

                          {/* 字段选择 - 带分组 */}
                          <Select value={cond.field} onValueChange={v => updateCondition(i, "field", v)}>
                            <SelectTrigger className="w-[180px] shrink-0">
                              <SelectValue placeholder="选择属性" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(fieldGroups).map(([group, fields]) => (
                                <div key={group}>
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group}</div>
                                  {fields.map(f => (
                                    <SelectItem key={f.field} value={f.field}>
                                      {f.label}
                                    </SelectItem>
                                  ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* 运算符选择 - 根据字段类型过滤 */}
                          <Select
                            value={cond.operator}
                            onValueChange={v => updateCondition(i, "operator", v)}
                            disabled={!cond.field}
                          >
                            <SelectTrigger className="w-[140px] shrink-0">
                              <SelectValue placeholder="运算符" />
                            </SelectTrigger>
                            <SelectContent>
                              {getOperatorsForField(cond.field).map(o => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* 值输入 - 一元运算符不需要值 */}
                          {!isUnaryOperator(cond.operator) && (
                            <Input
                              className="min-w-[140px] flex-1"
                              placeholder={getValuePlaceholder(cond)}
                              value={cond.value}
                              onChange={e => updateCondition(i, "value", e.target.value)}
                              disabled={!cond.operator}
                            />
                          )}

                          {conditions.length > 1 && (
                            <Button variant="ghost" size="icon" aria-label="删除" className="shrink-0" onClick={() => removeCondition(i)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}

                      <Button variant="outline" size="sm" onClick={addCondition} className="mt-2">
                        <PlusCircle className="mr-2 h-4 w-4" />添加条件
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between gap-2">
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={resetForm}>重置</Button>
                    <Button
                      variant="outline"
                      onClick={handlePreview}
                      disabled={previewMutation.isPending || getValidConditions().length === 0}
                    >
                      {previewMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />预估中...</>
                      ) : (
                        <><Eye className="mr-2 h-4 w-4" />预估人数</>
                      )}
                    </Button>
                  </div>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />创建中...</>
                    ) : "保存分群"}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* 右侧：预估结果面板 */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">预估结果</CardTitle>
                </CardHeader>
                <CardContent>
                  {previewMutation.data ? (
                    <div className="space-y-4">
                      {previewMutation?.data?.validationErrors && previewMutation?.data?.validationErrors.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-medium">条件验证失败</span>
                          </div>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {previewMutation?.data?.validationErrors.map((err, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-destructive mt-0.5">-</span>
                                <span>{err}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">查询成功</span>
                          </div>
                          <div className="text-center py-4">
                            <div className="text-4xl font-bold text-primary">
                              {previewMutation?.data?.count.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">匹配用户数</div>
                          </div>
                          <div className="text-xs text-muted-foreground text-center">
                            查询耗时: {previewMutation?.data?.queryTime}ms
                          </div>
                        </div>
                      )}
                    </div>
                  ) : previewMutation.isPending ? (
                    <div className="flex flex-col items-center py-8 gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">正在查询数据库...</span>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calculator className="mx-auto h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">配置条件后点击"预估人数"</p>
                      <p className="text-xs mt-1">将实时查询数据库返回精确结果</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 可用字段参考 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">可用字段</CardTitle>
                  <CardDescription className="text-xs">
                    支持 {fieldRegistry.length} 个字段，覆盖 {Object.keys(fieldGroups).length} 个维度
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(fieldGroups).map(([group, fields]) => (
                    <div key={group}>
                      <div className="text-xs font-semibold text-muted-foreground mb-1">{group}</div>
                      <div className="flex flex-wrap gap-1">
                        {fields.map(f => (
                          <Badge key={f.field} variant="outline" className="text-xs font-normal">
                            {f.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ==================== 管理对话框 ==================== */}
      <Dialog open={manageId !== null} onOpenChange={() => setManageId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>管理分群: {managed?.name}</DialogTitle>
            <DialogDescription>查看分群详情、更改状态或删除分群。</DialogDescription>
          </DialogHeader>
          {managed && (
            <div className="space-y-4">
              {managed.description && (
                <p className="text-sm text-muted-foreground">{managed.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">用户数:</span>{" "}
                  <strong>{managed.userCount ? managed.userCount.toLocaleString() : "未计算"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">状态:</span>{" "}
                  <Badge>{statusMap[managed.status]?.label}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">匹配类型:</span>{" "}
                  {managed.matchType === "all" ? "全部满足 (AND)" : "任一满足 (OR)"}
                </div>
                <div>
                  <span className="text-muted-foreground">条件数:</span>{" "}
                  {(managed.conditions as any[])?.length || 0}
                </div>
              </div>

              {/* 条件详情 */}
              {(managed.conditions as any[])?.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">条件详情</label>
                  <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
                    {(managed.conditions as any[]).map((cond: any, i: number) => {
                      const fieldDef = fieldRegistry.find(f => f.field === cond.field);
                      const opDef = operatorList.find(o => o.value === cond.operator);
                      return (
                        <div key={i} className="text-sm flex items-center gap-1">
                          {i > 0 && <Badge variant="secondary" className="text-xs mr-1">{managed.matchType === "all" ? "且" : "或"}</Badge>}
                          <span className="font-medium">{fieldDef?.label || cond.field}</span>
                          <span className="text-muted-foreground">{opDef?.label || cond.operator}</span>
                          {!isUnaryOperator(cond.operator) && <span className="text-primary">{String(cond.value)}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <label className="text-sm font-medium">更改状态</label>
                <Select
                  value={managed.status}
                  onValueChange={v => updateMutation.mutate({ id: managed.id, status: v as "active" | "paused" | "archived" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">活跃</SelectItem>
                    <SelectItem value="paused">暂停</SelectItem>
                    <SelectItem value="archived">归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="destructive" size="sm"
              onClick={() => {
                if (manageId) {
                  deleteMutation.mutate({ id: manageId });
                  setManageId(null);
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />删除分群
            </Button>
            <Button variant="outline" size="sm" onClick={() => setManageId(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Audience;
