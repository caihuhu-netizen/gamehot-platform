import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Package, PlusCircle, Pencil, Trash2, DollarSign, TrendingUp, ShoppingCart, Loader2, ArrowUpDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useTableSelection } from "@/hooks/useTableSelection";
import BatchActionBar from "@/components/BatchActionBar";
const categoryMap: Record<string, string> = {
  consumable: "消耗品", non_consumable: "非消耗品", subscription: "订阅",
};
const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "上架", variant: "default" },
  inactive: { label: "下架", variant: "secondary" },
  deprecated: { label: "废弃", variant: "destructive" },
};

export default function IAPProducts() {
  const { currentGameId } = useGame();
  const utils = trpc.useUtils();
  const { data: products = [], isLoading } = trpc.iapProducts.list.useQuery({ gameId: currentGameId ?? undefined });
  const { data: stats } = trpc.iapProducts.stats.useQuery({ gameId: currentGameId ?? undefined });
  const createMutation = trpc.iapProducts.create.useMutation({
    onSuccess: () => { utils.iapProducts.list.invalidate(); utils.iapProducts.stats.invalidate(); toast.success("商品创建成功"); setShowCreate(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.iapProducts.update.useMutation({
    onSuccess: () => { utils.iapProducts.list.invalidate(); utils.iapProducts.stats.invalidate(); toast.success("商品已更新"); setEditId(null); },
  });
  const deleteMutation = trpc.iapProducts.delete.useMutation({
    onSuccess: () => { utils.iapProducts.list.invalidate(); utils.iapProducts.stats.invalidate(); toast.success("商品已删除"); },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<{ productId: string; productName: string; category: "consumable" | "non_consumable" | "subscription"; priceUsd: string; priceCny: string; description: string }>({ productId: "", productName: "", category: "consumable", priceUsd: "", priceCny: "", description: "" });

  const resetForm = () => setForm({ productId: "", productName: "", category: "consumable" as const, priceUsd: "", priceCny: "", description: "" });

  const handleCreate = () => {
    if (!form.productId || !form.productName || !form.priceUsd) { toast.error("请填写必填字段"); return; }
    createMutation.mutate(form);
  };

  const editProduct = products.find((p: any) => p.id === editId);

  // Batch selection
  const selection = useTableSelection(products as { id: number }[]);

  const handleBatchStatusChange = async (status: string) => {
    let success = 0, fail = 0;
    for (const item of selection.selectedItems) {
      try { await updateMutation.mutateAsync({ id: item.id, status: status as "active" | "inactive" | "deprecated" }); success++; } catch { fail++; }
    }
    toast.success(`批量${status === "active" ? "上架" : status === "inactive" ? "下架" : "废弃"}完成: ${success} 成功${fail > 0 ? `, ${fail} 失败` : ""}`);
    selection.clear();
  };

  const handleBatchDelete = async () => {
    let success = 0, fail = 0;
    for (const item of selection.selectedItems) {
      try { await deleteMutation.mutateAsync({ id: item.id }); success++; } catch { fail++; }
    }
    toast.success(`批量删除完成: ${success} 成功${fail > 0 ? `, ${fail} 失败` : ""}`);
    selection.clear();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="pt-4 sm:pt-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">总商品数</p><p className="text-xl sm:text-2xl font-bold">{stats?.totalProducts || 0}</p></div><Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">上架商品</p><p className="text-xl sm:text-2xl font-bold">{stats?.activeProducts || 0}</p></div><ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">总收入</p><p className="text-xl sm:text-2xl font-bold">${(stats?.totalRevenue || 0).toLocaleString()}</p></div><DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-muted-foreground">平均转化率</p><p className="text-xl sm:text-2xl font-bold">{((stats?.avgConversion || 0) * 100).toFixed(1)}%</p></div><TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" /></div></CardContent></Card>
      </div>

      <Tabs defaultValue="list">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="list">商品列表</TabsTrigger>
            <TabsTrigger value="analysis">商品分析</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }}>
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline">新增商品</span><span className="sm:hidden">新增</span>
          </Button>
        </div>

        <TabsContent value="list" className="mt-4 space-y-3">
          {/* Batch Action Bar */}
          {selection.hasSelection && (
            <BatchActionBar
              selectedCount={selection.selectedCount}
              totalCount={products.length}
              onClear={selection.clear}
              actions={[
                {
                  label: "批量上架",
                  icon: <ShoppingCart className="h-3 w-3" />,
                  needsConfirm: true,
                  confirmTitle: "批量上架商品",
                  confirmDescription: `将上架选中的 ${selection.selectedCount} 个商品。`,
                  onClick: () => handleBatchStatusChange("active"),
                },
                {
                  label: "批量下架",
                  icon: <ArrowUpDown className="h-3 w-3" />,
                  variant: "secondary",
                  needsConfirm: true,
                  confirmTitle: "批量下架商品",
                  confirmDescription: `将下架选中的 ${selection.selectedCount} 个商品。`,
                  onClick: () => handleBatchStatusChange("inactive"),
                },
                {
                  label: "批量删除",
                  icon: <Trash2 className="h-3 w-3" />,
                  variant: "destructive",
                  needsConfirm: true,
                  confirmTitle: "批量删除商品",
                  confirmDescription: `将删除选中的 ${selection.selectedCount} 个商品，此操作不可恢复。`,
                  onClick: handleBatchDelete,
                },
              ]}
            />
          )}

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : products.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">暂无商品</p>
              <p className="mt-1">点击"新增商品"开始配置内购商品</p>
            </CardContent></Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>内购商品管理</CardTitle>
                <CardDescription>管理游戏内的所有内购商品、定价和销售状态。</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="table-responsive">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox checked={selection.isAllSelected} onCheckedChange={() => selection.toggleAll()} aria-label="全选" />
                        </TableHead>
                        <TableHead>商品名称</TableHead>
                        <TableHead className="hidden sm:table-cell">类型</TableHead>
                        <TableHead>价格</TableHead>
                        <TableHead className="hidden md:table-cell">销量</TableHead>
                        <TableHead className="hidden md:table-cell">收入</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p: Record<string,unknown>) => {
                        const st = statusMap[p.status] || statusMap.active;
                        return (
                          <TableRow key={p.id} className={selection.isSelected(p.id) ? "bg-primary/5" : ""}>
                            <TableCell>
                              <Checkbox checked={selection.isSelected(p.id)} onCheckedChange={() => selection.toggle(p.id)} aria-label={`选择 ${p.productName}`} />
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">{p.productName}</span>
                                <span className="block text-[10px] text-muted-foreground font-mono sm:hidden">{p.productId}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell"><Badge variant="outline">{categoryMap[p.category] || p.category}</Badge></TableCell>
                            <TableCell>${Number(p.priceUsd).toFixed(2)}</TableCell>
                            <TableCell className="hidden md:table-cell">{(p.totalSales || 0).toLocaleString()}</TableCell>
                            <TableCell className="hidden md:table-cell">${Number(p.totalRevenue || 0).toLocaleString()}</TableCell>
                            <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" aria-label="编辑" className="h-8 w-8" onClick={() => setEditId(p.id)}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" aria-label="删除" className="h-8 w-8" onClick={() => { if (confirm("确认删除?")) deleteMutation.mutate({ id: p.id }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis">
          <Card><CardHeader><CardTitle>商品分析</CardTitle></CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无商品数据</p>
              ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                  {products.map((p: Record<string,unknown>) => (
                    <div key={p.id} className="p-4 border rounded-lg space-y-2">
                      <p className="font-medium">{p.productName}</p>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>销量: {(p.totalSales || 0).toLocaleString()}</span>
                        <span>收入: ${Number(p.totalRevenue || 0).toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: `${Math.min(((p.totalSales || 1) / Math.max(...products.map((x: Record<string,unknown>) => x.totalSales || 1))) * 100, 100)}%` }} />
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
          <DialogHeader><DialogTitle>添加内购商品</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-medium">商品ID *</label><Input placeholder="com.game.gems100" value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">商品名称 *</label><Input placeholder="100钻石" value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><label className="text-sm font-medium">类型</label>
                <Select value={form.category} onValueChange={(v: "consumable" | "non_consumable" | "subscription") => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumable">消耗品</SelectItem>
                    <SelectItem value="non_consumable">非消耗品</SelectItem>
                    <SelectItem value="subscription">订阅</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">价格(USD) *</label><Input placeholder="0.99" value={form.priceUsd} onChange={e => setForm({ ...form, priceUsd: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">价格(CNY)</label><Input placeholder="6.00" value={form.priceCny} onChange={e => setForm({ ...form, priceCny: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">描述</label><Textarea placeholder="商品描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? "创建中..." : "创建商品"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editId !== null} onOpenChange={() => setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑商品: {editProduct?.productName}</DialogTitle></DialogHeader>
          {editProduct && (
            <div className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium">状态</label>
                <Select defaultValue={editProduct.status} onValueChange={v => updateMutation.mutate({ id: editProduct.id, status: v as "active" | "inactive" | "deprecated" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">上架</SelectItem>
                    <SelectItem value="inactive">下架</SelectItem>
                    <SelectItem value="deprecated">废弃</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">总销量:</span> {editProduct.totalSales}</div>
                <div><span className="text-muted-foreground">总收入:</span> ${Number(editProduct.totalRevenue || 0).toLocaleString()}</div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setEditId(null)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
