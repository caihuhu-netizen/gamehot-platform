import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DollarSign, TrendingUp, TrendingDown, PieChart, Plus, Trash2, ArrowUpRight, ArrowDownRight, Wallet, Receipt, BarChart3 } from "lucide-react";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";
function fmt(val: number) {
  const { currentGameId } = useGame(); return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

// ==================== 利润总览 ====================
function ProfitOverview() {
  const [dateRange] = useState({ startDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0], endDate: new Date().toISOString().split("T")[0] });
  const { data: profit, isLoading } = trpc.costProfit.getProfitAnalysis.useQuery(dateRange);
  const { data: trend = [] } = trpc.costProfit.getProfitTrend.useQuery(dateRange);
  const { data: breakdown = [] } = trpc.costProfit.getCostBreakdown.useQuery(dateRange);

  if (isLoading || !profit) return <div className="text-muted-foreground text-sm py-8 text-center">加载中...</div>;

  const colors = ["bg-blue-500", "bg-green-500", "bg-orange-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500"];

  return (
    <div className="space-y-4">
      <CrossModuleLinks links={MODULE_LINKS.costProfit} />
      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> 总收入</div>
            <div className="text-xl font-bold mt-1 text-green-600">{fmt(profit.totalRevenue)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">IAP: {fmt(profit.iapRevenue)} | 广告: {fmt(profit.adRevenue)}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Receipt className="w-3 h-3" /> 总成本</div>
            <div className="text-xl font-bold mt-1 text-red-500">{fmt(profit.totalCost)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">获客: {fmt(profit.acquisitionCost)} | 其他: {fmt(profit.otherCost)}</div>
          </CardContent>
        </Card>
        <Card className={profit.profit >= 0 ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}>
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" /> 净利润</div>
            <div className={`text-xl font-bold mt-1 flex items-center gap-1 ${profit.profit >= 0 ? "text-green-600" : "text-red-500"}`}>
              {profit.profit >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {fmt(Math.abs(profit.profit))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> 利润率</div>
            <div className={`text-xl font-bold mt-1 ${profit.margin >= 0 ? "text-green-600" : "text-red-500"}`}>{profit.margin.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* 利润趋势 */}
      {trend.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">利润趋势（近30天）</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {trend.map((d: any, i: number) => {
                const maxVal = Math.max(...trend.map((x: any) => Math.max(Math.abs(x.profit || 0), x.totalRevenue || 0, x.totalCost || 0)));
                const revH = maxVal > 0 ? ((d.totalRevenue || 0) / maxVal) * 100 : 0;
                const costH = maxVal > 0 ? ((d.totalCost || 0) / maxVal) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.date}\n收入: ${fmt(d.totalRevenue || 0)}\n成本: ${fmt(d.totalCost || 0)}\n利润: ${fmt(d.profit || 0)}`}>
                    <div className="w-full flex gap-px">
                      <div className="flex-1 bg-green-500/70 rounded-t" style={{ height: `${Math.max(revH, 2)}%` }} />
                      <div className="flex-1 bg-red-400/70 rounded-t" style={{ height: `${Math.max(costH, 2)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{trend[0]?.date || ""}</span>
              <div className="flex gap-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500/70 rounded" /> 收入</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400/70 rounded" /> 成本</span>
              </div>
              <span>{trend[trend.length - 1]?.date || ""}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 成本结构 */}
      {breakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">成本结构分布</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {breakdown.map((item: any, i: number) => {
                const total = breakdown.reduce((s: number, x: any) => s + (parseFloat(x.totalAmount) || 0), 0);
                const pct = total > 0 ? ((parseFloat(item.totalAmount) || 0) / total) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-24 text-sm truncate">{item.categoryName || `分类${item.categoryId}`}</div>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-20 text-right text-sm font-medium">{fmt(parseFloat(item.totalAmount) || 0)}</div>
                    <div className="w-12 text-right text-xs text-muted-foreground">{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {profit.totalRevenue === 0 && profit.totalCost === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          <PieChart className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>暂无利润数据</p>
          <p className="text-xs mt-1">请先在"成本录入"中添加成本记录，或通过 SDK/API 导入收入数据</p>
        </CardContent></Card>
      )}
    </div>
  );
}

// ==================== 成本录入 ====================
function CostEntries() {
  const { currentGameId } = useGame();
  const utils = trpc.useUtils();
  const { data: categories = [] } = trpc.costProfit.listCategories.useQuery({ gameId: currentGameId ?? undefined });
  const { data: entries = [], isLoading } = trpc.costProfit.listEntries.useQuery({ gameId: currentGameId ?? undefined });
  const createCatMut = trpc.costProfit.createCategory.useMutation({
    onSuccess: () => { utils.costProfit.listCategories.invalidate(); toast.success("分类已创建"); setCatOpen(false); },
  });
  const createEntryMut = trpc.costProfit.createEntry.useMutation({
    onSuccess: () => { utils.costProfit.listEntries.invalidate(); utils.costProfit.getProfitAnalysis.invalidate(); toast.success("成本记录已添加"); },
  });
  const deleteEntryMut = trpc.costProfit.deleteEntry.useMutation({
    onSuccess: () => { utils.costProfit.listEntries.invalidate(); utils.costProfit.getProfitAnalysis.invalidate(); toast.success("记录已删除"); },
  });

  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ categoryCode: "", categoryName: "" });
  const [entryForm, setEntryForm] = useState({ categoryId: "", costDate: new Date().toISOString().split("T")[0], amount: "", description: "" });

  return (
    <div className="space-y-4">
      {/* 新增分类 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">成本分类与录入</h3>
        <Dialog open={catOpen} onOpenChange={setCatOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" /> 新增分类</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>新增成本分类</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="分类编码 (如 ua_cost)" value={catForm.categoryCode} onChange={e => setCatForm(p => ({ ...p, categoryCode: e.target.value }))} />
              <Input placeholder="分类名称 (如 用户获取成本)" value={catForm.categoryName} onChange={e => setCatForm(p => ({ ...p, categoryName: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button onClick={() => createCatMut.mutate(catForm)} disabled={createCatMut.isPending || !catForm.categoryCode || !catForm.categoryName}>
                {createCatMut.isPending ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 快速录入 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">快速录入成本</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select value={entryForm.categoryId} onValueChange={v => setEntryForm(p => ({ ...p, categoryId: v }))}>
              <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.categoryName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={entryForm.costDate} onChange={e => setEntryForm(p => ({ ...p, costDate: e.target.value }))} />
            <Input placeholder="金额 (USD)" value={entryForm.amount} onChange={e => setEntryForm(p => ({ ...p, amount: e.target.value }))} />
            <Input placeholder="备注说明" value={entryForm.description} onChange={e => setEntryForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <Button className="mt-3" onClick={() => createEntryMut.mutate({
            categoryId: parseInt(entryForm.categoryId), costDate: entryForm.costDate,
            amount: entryForm.amount, description: entryForm.description || undefined,
          })} disabled={createEntryMut.isPending || !entryForm.categoryId || !entryForm.amount}>
            {createEntryMut.isPending ? "提交中..." : "添加记录"}
          </Button>
        </CardContent>
      </Card>

      {/* 成本记录列表 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">成本记录</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm py-4 text-center">加载中...</div>
          ) : entries.length === 0 ? (
            <div className="text-muted-foreground text-sm py-8 text-center">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>暂无成本记录</p>
              <p className="text-xs mt-1">建议先创建"用户获取"、"服务器"、"人力"等成本分类</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">日期</th>
                    <th className="text-left py-2 font-medium">分类</th>
                    <th className="text-right py-2 font-medium">金额</th>
                    <th className="text-left py-2 font-medium">备注</th>
                    <th className="text-right py-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e: any) => (
                    <tr key={e.id} className="border-b hover:bg-muted/50">
                      <td className="py-2">{e.costDate ? new Date(e.costDate).toLocaleDateString() : "-"}</td>
                      <td className="py-2"><Badge variant="outline">{categories.find((c: any) => c.id === e.categoryId)?.categoryName || `#${e.categoryId}`}</Badge></td>
                      <td className="py-2 text-right font-medium">{fmt(parseFloat(e.amount) || 0)}</td>
                      <td className="py-2 text-muted-foreground text-xs">{e.description || "-"}</td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" size="icon" aria-label="删除" className="h-7 w-7 text-destructive" onClick={() => deleteEntryMut.mutate({ id: e.id })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 主页面 ====================
export default function CostProfitPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">成本核算 & 利润分析</h2>
        <p className="text-sm text-muted-foreground">追踪运营成本、分析利润结构、监控 ROI</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">利润总览</TabsTrigger>
          <TabsTrigger value="entries">成本录入</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><ProfitOverview /></TabsContent>
        <TabsContent value="entries"><CostEntries /></TabsContent>
      </Tabs>
    </div>
  );
}
