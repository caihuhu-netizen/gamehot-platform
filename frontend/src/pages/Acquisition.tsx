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
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Users, Target, BarChart3, ArrowUpRight, ArrowDownRight, Minus, CalendarDays, Eye, Download, RefreshCw, CheckCircle2, XCircle, Clock, Loader2, CloudDownload, Settings2 } from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";
import { DateRangePicker, toDateParams } from "@/components/DateRangePicker";
import { subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area, ComposedChart } from "recharts";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";
function formatCurrency(val: number) {
  const { currentGameId } = useGame();
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatPercent(val: number) {
  return `${val.toFixed(1)}%`;
}

// ==================== 投放日报 Tab ====================
function AdDailyReport() {
  const { currentGameId } = useGame();
  const [adDateRange, setAdDateRange] = useState({ from: subDays(new Date(), 29), to: new Date() });
  const adDateParams = useMemo(() => toDateParams(adDateRange), [adDateRange]);
  const { data: rawData = [], isLoading } = trpc.reports.adDailySummary.useQuery({ ...adDateParams, limit: 90,
  gameId: currentGameId ?? undefined,
});
  const data = (rawData as unknown as unknown as Record<string, unknown>[]).map((d: any) => ({
    ...d,
    dau: Number(d.dau || 0),
    newUsers: Number(d.new_users || d.newUsers || 0),
    retentionD1: Number(d.retention_d1 || d.retentionD1 || 0),
    retentionD7: Number(d.retention_d7 || d.retentionD7 || 0),
    iapRevenue: Number(d.iap_revenue || d.iapRevenue || 0),
    adSpend: Number(d.ad_spend || d.adSpend || 0),
    adRevenue: Number(d.ad_revenue || d.adRevenue || 0),
    totalRevenue: Number(d.total_revenue || d.totalRevenue || 0),
    roi: Number(d.roi || 0),
    avgSessionMinutes: Number(d.avg_session_minutes || d.avgSessionMinutes || 0),
    reportDate: (d.report_date || d.reportDate) instanceof Date ? (d.report_date || d.reportDate).toISOString().split('T')[0] : String(d.report_date || d.reportDate || ''),
  }));
  const chartData = [...data].reverse();
  if (isLoading) return <div className="text-center py-8 text-muted-foreground">加载中...</div>;
  if (data.length === 0) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">
      <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>暂无投放日报数据</p><p className="text-xs mt-1">数据将从 AppsFlyer/AppLovin API 自动同步，或手动录入</p>
    </CardContent></Card>
  );
  const latest = data[0];
  const prev = data[1];
  const diff = (a: number, b: number) => b ? ((a - b) / b * 100) : 0;
  const handleExportAd = () => {
    exportToCsv("投放日报", data.map(d => ({
      "日期": d.reportDate, "DAU": d.dau, "新增用户": d.newUsers,
      "D1留存%": d.retentionD1, "D7留存%": d.retentionD7,
      "IAP收入": d.iapRevenue, "广告花费": d.adSpend,
      "广告收入": d.adRevenue, "总收入": d.totalRevenue,
      "ROI%": d.roi, "平均时长(分)": d.avgSessionMinutes,
    })));
  };
  return (
    <div className="space-y-4">
      <CrossModuleLinks links={MODULE_LINKS.acquisition} />
      <div className="flex items-center justify-between mb-2">
        <DateRangePicker value={adDateRange} onChange={setAdDateRange} />
        <Button variant="outline" size="sm" onClick={handleExportAd}>
          <Download className="h-3.5 w-3.5 mr-1" />导出CSV
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "DAU", value: latest.dau.toLocaleString(), change: diff(latest.dau, prev?.dau) },
          { label: "新增用户", value: latest.newUsers.toLocaleString(), change: diff(latest.newUsers, prev?.newUsers) },
          { label: "广告花费", value: `$${latest.adSpend.toFixed(2)}`, change: diff(latest.adSpend, prev?.adSpend) },
          { label: "总收入", value: `$${latest.totalRevenue.toFixed(2)}`, change: diff(latest.totalRevenue, prev?.totalRevenue) },
          { label: "ROI", value: `${latest.roi.toFixed(1)}%`, change: diff(latest.roi, prev?.roi) },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-lg font-bold">{kpi.value}</p>
              <p className={`text-xs ${kpi.change > 0 ? 'text-green-600' : kpi.change < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {kpi.change > 0 ? '↑' : kpi.change < 0 ? '↓' : '→'} {Math.abs(kpi.change).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">收入 vs 花费趋势</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reportDate" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="totalRevenue" stroke="#10b981" name="总收入" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="adSpend" stroke="#ef4444" name="广告花费" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="adRevenue" stroke="#6366f1" name="广告收入" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      {/* ROI Trend Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">ROI 趋势</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reportDate" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="iapRevenue" fill="#dbeafe" stroke="#3b82f6" name="IAP收入" />
              <Line yAxisId="right" type="monotone" dataKey="roi" stroke="#f59e0b" name="ROI%" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      {/* Retention Trend Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">留存趋势</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reportDate" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="retentionD1" stroke="#6366f1" name="D1留存%" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="retentionD7" stroke="#10b981" name="D7留存%" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      {/* Weekly Comparison */}
      {data.length >= 14 && (() => {
        const thisWeek = data.slice(0, 7);
        const lastWeek = data.slice(7, 14);
        const sumArr = (arr: any[], key: string) => arr.reduce((s, r) => s + r[key], 0);
        const avgArr = (arr: any[], key: string) => sumArr(arr, key) / arr.length;
        const metrics = [
          { label: "DAU均值", thisW: avgArr(thisWeek, 'dau'), lastW: avgArr(lastWeek, 'dau'), fmt: (v: number) => v.toLocaleString(undefined, {maximumFractionDigits: 0}) },
          { label: "新增合计", thisW: sumArr(thisWeek, 'newUsers'), lastW: sumArr(lastWeek, 'newUsers'), fmt: (v: number) => v.toLocaleString() },
          { label: "花费合计", thisW: sumArr(thisWeek, 'adSpend'), lastW: sumArr(lastWeek, 'adSpend'), fmt: (v: number) => `$${v.toFixed(2)}` },
          { label: "收入合计", thisW: sumArr(thisWeek, 'totalRevenue'), lastW: sumArr(lastWeek, 'totalRevenue'), fmt: (v: number) => `$${v.toFixed(2)}` },
          { label: "D1留存均值", thisW: avgArr(thisWeek, 'retentionD1'), lastW: avgArr(lastWeek, 'retentionD1'), fmt: (v: number) => `${v.toFixed(1)}%` },
          { label: "ROI均值", thisW: avgArr(thisWeek, 'roi'), lastW: avgArr(lastWeek, 'roi'), fmt: (v: number) => `${v.toFixed(1)}%` },
        ];
        return (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">周环比分析（近7天 vs 上一周）</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {metrics.map(m => {
                  const change = m.lastW ? ((m.thisW - m.lastW) / m.lastW * 100) : 0;
                  return (
                    <div key={m.label} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                      <p className="text-sm font-bold">{m.fmt(m.thisW)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-xs font-medium ${change > 0 ? (m.label.includes('花费') ? 'text-red-600' : 'text-green-600') : change < 0 ? (m.label.includes('花费') ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                          {change > 0 ? '↑' : change < 0 ? '↓' : '→'} {Math.abs(change).toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">上周 {m.fmt(m.lastW)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">日报明细</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b text-muted-foreground">
              <th className="py-2 text-left">日期</th><th className="text-right">DAU</th><th className="text-right">新增</th>
              <th className="text-right">D1留存</th><th className="text-right">D7留存</th><th className="text-right">IAP收入</th>
              <th className="text-right">广告花费</th><th className="text-right">广告收入</th><th className="text-right">总收入</th>
              <th className="text-right">ROI</th><th className="text-right">时长(分)</th>
            </tr></thead>
            <tbody>
              {data.map((row: any) => (
                <tr key={row.reportDate} className="border-b hover:bg-muted/50">
                  <td className="py-1.5">{row.reportDate}</td>
                  <td className="text-right">{row.dau.toLocaleString()}</td>
                  <td className="text-right">{row.newUsers.toLocaleString()}</td>
                  <td className="text-right">{row.retentionD1.toFixed(1)}%</td>
                  <td className="text-right">{row.retentionD7.toFixed(1)}%</td>
                  <td className="text-right">${row.iapRevenue.toFixed(2)}</td>
                  <td className="text-right text-red-600">${row.adSpend.toFixed(2)}</td>
                  <td className="text-right text-green-600">${row.adRevenue.toFixed(2)}</td>
                  <td className="text-right font-medium">${row.totalRevenue.toFixed(2)}</td>
                  <td className={`text-right font-medium ${row.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>{row.roi.toFixed(1)}%</td>
                  <td className="text-right">{row.avgSessionMinutes.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 渠道管理 Tab ====================
function ChannelManagement() {
  const { currentGameId } = useGame();
  const utils = trpc.useUtils();
  const { data: channels = [], isLoading } = trpc.acquisition.listChannels.useQuery({ gameId: currentGameId ?? undefined });
  const createMut = trpc.acquisition.createChannel.useMutation({
    onSuccess: () => { utils.acquisition.listChannels.invalidate(); setOpen(false); toast.success("渠道创建成功"); },
  });
  const deleteMut = trpc.acquisition.deleteChannel.useMutation({
    onSuccess: () => { utils.acquisition.listChannels.invalidate(); toast.success("渠道已删除"); },
  });

  const [open, setOpen] = useState(false);
  type ChannelType = "PAID" | "ORGANIC" | "REFERRAL" | "SOCIAL" | "DIRECT";
  type AttrProvider = "APPSFLYER" | "ADJUST" | "SINGULAR" | "BRANCH" | "NONE";
  const [form, setForm] = useState<{ channelCode: string; channelName: string; channelType: ChannelType; platform: string; attributionProvider: AttrProvider }>({
    channelCode: "", channelName: "", channelType: "PAID", platform: "", attributionProvider: "APPSFLYER"
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">获客渠道</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> 新增渠道</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>新增获客渠道</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="渠道编码 (如 applovin_us)" value={form.channelCode} onChange={e => setForm(p => ({ ...p, channelCode: e.target.value }))} />
              <Input placeholder="渠道名称" value={form.channelName} onChange={e => setForm(p => ({ ...p, channelName: e.target.value }))} />
              <Select value={form.channelType} onValueChange={v => setForm(p => ({ ...p, channelType: v as ChannelType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">付费投放</SelectItem>
                  <SelectItem value="ORGANIC">自然流量</SelectItem>
                  <SelectItem value="REFERRAL">推荐</SelectItem>
                  <SelectItem value="SOCIAL">社交</SelectItem>
                  <SelectItem value="DIRECT">直接</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="平台 (iOS/Android)" value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))} />
              <Select value={form.attributionProvider} onValueChange={v => setForm(p => ({ ...p, attributionProvider: v as typeof p.attributionProvider }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPSFLYER">AppsFlyer</SelectItem>
                  <SelectItem value="ADJUST">Adjust</SelectItem>
                  <SelectItem value="SINGULAR">Singular</SelectItem>
                  <SelectItem value="NONE">无</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.channelCode || !form.channelName}>
                {createMut.isPending ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">加载中...</div>
      ) : channels.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          <Target className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>暂无渠道，点击"新增渠道"开始配置</p>
          <p className="text-xs mt-1">建议先添加 AppLovin 作为主要投放渠道</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {channels.map((ch: any) => (
            <Card key={ch.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {ch.channelCode.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{ch.channelName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{ch.channelCode}</span>
                      <Badge variant="outline" className="text-[10px] px-1">{ch.channelType}</Badge>
                      {ch.platform && <Badge variant="secondary" className="text-[10px] px-1">{ch.platform}</Badge>}
                      {ch.attributionProvider && ch.attributionProvider !== "NONE" && (
                        <Badge className="text-[10px] px-1 bg-blue-500/10 text-blue-600 border-blue-200">{ch.attributionProvider}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ch.isActive ? "default" : "secondary"}>{ch.isActive ? "启用" : "停用"}</Badge>
                  <Button variant="ghost" size="icon" aria-label="删除" className="h-8 w-8 text-destructive" onClick={() => deleteMut.mutate({ id: ch.id })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== ROI 分析 Tab ====================
function ROIAnalysis() {
  const { currentGameId } = useGame();
  const [dateRange] = useState({ startDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0], endDate: new Date().toISOString().split("T")[0] });
  const { data: roiData = [], isLoading } = trpc.acquisition.getROI.useQuery(dateRange);
  const { data: costTrend = [] } = trpc.acquisition.getCostSummary.useQuery({ ...dateRange, groupBy: "date",
  gameId: currentGameId ?? undefined,
});

  const totals = useMemo(() => {
    return roiData.reduce((acc: any, ch: any) => ({
      spend: acc.spend + ch.totalSpend,
      installs: acc.installs + ch.totalInstalls,
      revenue: acc.revenue + ch.totalRevenue,
    }), { spend: 0, installs: 0, revenue: 0 });
  }, [roiData]);

  const overallROAS = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  const overallCPI = totals.installs > 0 ? totals.spend / totals.installs : 0;

  return (
    <div className="space-y-4">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="py-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> 总花费</div>
          <div className="text-xl font-bold mt-1">{formatCurrency(totals.spend)}</div>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> 总安装</div>
          <div className="text-xl font-bold mt-1">{totals.installs.toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> 平均 CPI</div>
          <div className="text-xl font-bold mt-1">{formatCurrency(overallCPI)}</div>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> ROAS</div>
          <div className={`text-xl font-bold mt-1 ${overallROAS >= 1 ? "text-green-600" : "text-red-500"}`}>{(overallROAS * 100).toFixed(0)}%</div>
        </CardContent></Card>
      </div>

      {/* 渠道 ROI 对比表 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">渠道 ROI 对比</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm py-4 text-center">加载中...</div>
          ) : roiData.length === 0 ? (
            <div className="text-muted-foreground text-sm py-8 text-center">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>暂无 ROI 数据</p>
              <p className="text-xs mt-1">请先添加渠道并导入投放成本数据</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">渠道</th>
                    <th className="text-right py-2 font-medium">花费</th>
                    <th className="text-right py-2 font-medium">安装</th>
                    <th className="text-right py-2 font-medium">CPI</th>
                    <th className="text-right py-2 font-medium">收入</th>
                    <th className="text-right py-2 font-medium">ROAS</th>
                    <th className="text-right py-2 font-medium">LTV-7</th>
                    <th className="text-right py-2 font-medium">LTV-30</th>
                    <th className="text-right py-2 font-medium">D1留存</th>
                    <th className="text-right py-2 font-medium">D7留存</th>
                  </tr>
                </thead>
                <tbody>
                  {roiData.map((ch: any) => (
                    <tr key={ch.channelId} className="border-b hover:bg-muted/50">
                      <td className="py-2">
                        <div className="font-medium">{ch.channelName}</div>
                        <div className="text-xs text-muted-foreground">{ch.channelCode}</div>
                      </td>
                      <td className="text-right">{formatCurrency(ch.totalSpend)}</td>
                      <td className="text-right">{ch.totalInstalls.toLocaleString()}</td>
                      <td className="text-right">{formatCurrency(ch.cpi)}</td>
                      <td className="text-right">{formatCurrency(ch.totalRevenue)}</td>
                      <td className="text-right">
                        <span className={`inline-flex items-center gap-0.5 ${ch.roas >= 1 ? "text-green-600" : "text-red-500"}`}>
                          {ch.roas >= 1 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {(ch.roas * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="text-right">{formatCurrency(ch.avgLtv7)}</td>
                      <td className="text-right">{formatCurrency(ch.avgLtv30)}</td>
                      <td className="text-right">{formatPercent(ch.retentionD1)}</td>
                      <td className="text-right">{formatPercent(ch.retentionD7)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 花费趋势 */}
      {costTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">每日花费趋势</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {costTrend.slice(-30).map((d: any, i: number) => {
                const maxSpend = Math.max(...costTrend.map((x: any) => parseFloat(x.totalSpend) || 0));
                const height = maxSpend > 0 ? ((parseFloat(d.totalSpend) || 0) / maxSpend) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.costDate}: ${formatCurrency(parseFloat(d.totalSpend) || 0)}`}>
                    <div className="w-full bg-blue-500/80 rounded-t" style={{ height: `${Math.max(height, 2)}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{(costTrend[0] as Record<string, unknown>)?.costDate ? new Date(String((costTrend[0] as Record<string, unknown>).costDate)).toLocaleDateString() : ""}</span>
              <span>{(costTrend[costTrend.length - 1] as Record<string, unknown>)?.costDate ? new Date(String((costTrend[costTrend.length - 1] as Record<string, unknown>).costDate)).toLocaleDateString() : ""}  </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== 成本导入 Tab ====================
function CostImport() {
  const { currentGameId } = useGame();
  const utils = trpc.useUtils();
  const { data: channels = [] } = trpc.acquisition.listChannels.useQuery({ gameId: currentGameId ?? undefined });
  const createMut = trpc.acquisition.createCost.useMutation({
    onSuccess: () => { utils.acquisition.listCosts.invalidate(); utils.acquisition.getCostSummary.invalidate(); toast.success("成本记录已添加"); setForm(prev => ({ ...prev, spend: "", impressions: "", clicks: "", installs: "" })); },
  });

  const [form, setForm] = useState({ channelId: "", costDate: new Date().toISOString().split("T")[0], spend: "", impressions: "", clicks: "", installs: "", campaignName: "", countryCode: "" });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">手动录入投放成本</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select value={form.channelId} onValueChange={v => setForm(p => ({ ...p, channelId: v }))}>
              <SelectTrigger><SelectValue placeholder="选择渠道" /></SelectTrigger>
              <SelectContent>
                {channels.map((ch: any) => (
                  <SelectItem key={ch.id} value={String(ch.id)}>{ch.channelName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={form.costDate} onChange={e => setForm(p => ({ ...p, costDate: e.target.value }))} />
            <Input placeholder="花费 (USD)" value={form.spend} onChange={e => setForm(p => ({ ...p, spend: e.target.value }))} />
            <Input placeholder="安装数" value={form.installs} onChange={e => setForm(p => ({ ...p, installs: e.target.value }))} />
            <Input placeholder="展示数" value={form.impressions} onChange={e => setForm(p => ({ ...p, impressions: e.target.value }))} />
            <Input placeholder="点击数" value={form.clicks} onChange={e => setForm(p => ({ ...p, clicks: e.target.value }))} />
            <Input placeholder="Campaign 名称" value={form.campaignName} onChange={e => setForm(p => ({ ...p, campaignName: e.target.value }))} />
            <Input placeholder="国家代码 (US/JP)" value={form.countryCode} onChange={e => setForm(p => ({ ...p, countryCode: e.target.value }))} />
          </div>
          <Button className="mt-3" onClick={() => createMut.mutate({
            channelId: parseInt(form.channelId), costDate: form.costDate, spend: form.spend,
            impressions: parseInt(form.impressions) || 0, clicks: parseInt(form.clicks) || 0,
            installs: parseInt(form.installs) || 0, campaignName: form.campaignName || undefined,
            countryCode: form.countryCode || undefined,
          })} disabled={createMut.isPending || !form.channelId || !form.spend}>
            {createMut.isPending ? "提交中..." : "添加记录"}
          </Button>
        </CardContent>
      </Card>

      <AppsFlyerStatusCard />
    </div>
  );
}

// ==================== AppsFlyer 状态卡片 ====================
function AppsFlyerStatusCard() {
  const { data: configStatus } = trpc.appsflyer.getConfigStatus.useQuery();
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
        API 对接状态
        {configStatus?.configured ? (
          <Badge className="bg-green-500/10 text-green-600 border-green-200">已配置</Badge>
        ) : (
          <Badge variant="outline" className="text-xs">配置中</Badge>
        )}
      </CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">AL</div>
            <div>
              <div className="font-medium text-sm">AppLovin</div>
              <div className="text-xs text-muted-foreground">Reporting API - 自动拉取每日投放花费</div>
            </div>
          </div>
          <Badge variant="secondary">待配置 API Key</Badge>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-xs font-bold">AF</div>
            <div>
              <div className="font-medium text-sm">AppsFlyer</div>
              <div className="text-xs text-muted-foreground">Pull API V2 - 拉取归因数据和投放成本</div>
            </div>
          </div>
          {configStatus?.configured ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/10 text-green-600 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />已连接
              </Badge>
              <span className="text-xs text-muted-foreground">App: {configStatus.appId}</span>
            </div>
          ) : (
            <Badge variant="secondary">待配置 API Key</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== AppsFlyer 同步 Tab ====================
function AppsFlyerSync() {
  const { currentGameId } = useGame();
  const utils = trpc.useUtils();
  const { data: configStatus, isLoading: configLoading } = trpc.appsflyer.getConfigStatus.useQuery();
  const { data: syncLogs = [], isLoading: logsLoading, refetch: refetchLogs } = trpc.appsflyer.listSyncLogs.useQuery({
    gameId: currentGameId ?? undefined,
    limit: 20,
  });
  const { data: reportTypes = [] } = trpc.appsflyer.getReportTypes.useQuery();

  const [syncType, setSyncType] = useState("aggregate_costs");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
    endDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
  });
  const [includeOrganic, setIncludeOrganic] = useState(false);

  const syncCostsMut = trpc.appsflyer.syncCosts.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`同步完成：导入 ${result.rowCount} 条成本数据（耗时 ${((result.duration || 0) / 1000).toFixed(1)}s）`);
      } else {
        toast.error(`同步失败: ${result.error}`);
      }
      refetchLogs();
      utils.acquisition.listCosts.invalidate();
      utils.acquisition.getCostSummary.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const syncInstallsMut = trpc.appsflyer.syncInstalls.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`同步完成：导入 ${result.rowCount} 条归因数据（耗时 ${((result.duration || 0) / 1000).toFixed(1)}s）`);
      } else {
        toast.error(`同步失败: ${result.error}`);
      }
      refetchLogs();
    },
    onError: (err) => toast.error(err.message),
  });

  const syncInAppEventsMut = trpc.appsflyer.syncInAppEvents.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`同步完成：导入 ${result.rowCount} 条付费记录（耗时 ${((result.duration || 0) / 1000).toFixed(1)}s）`);
      } else {
        toast.error(`同步失败: ${result.error}`);
      }
      refetchLogs();
    },
    onError: (err) => toast.error(err.message),
  });

  const syncAdRevenueMut = trpc.appsflyer.syncAdRevenue.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`同步完成：导入 ${result.rowCount} 条广告收入记录（耗时 ${((result.duration || 0) / 1000).toFixed(1)}s）`);
      } else {
        toast.error(`同步失败: ${result.error}`);
      }
      refetchLogs();
    },
    onError: (err) => toast.error(err.message),
  });

  const isSyncing = syncCostsMut.isPending || syncInstallsMut.isPending || syncInAppEventsMut.isPending || syncAdRevenueMut.isPending;

  const handleSync = () => {
    if (!currentGameId) { toast.error("请先选择游戏项目"); return; }
    if (syncType === "aggregate_costs") {
      syncCostsMut.mutate({
        gameId: currentGameId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    } else if (syncType === "raw_installs") {
      syncInstallsMut.mutate({
        gameId: currentGameId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        includeOrganic,
      });
    } else if (syncType === "in_app_events") {
      syncInAppEventsMut.mutate({
        gameId: currentGameId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        includeOrganic,
      });
    } else if (syncType === "ad_revenue") {
      syncAdRevenueMut.mutate({
        gameId: currentGameId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
      case "running": return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      completed: { label: "完成", variant: "default" },
      failed: { label: "失败", variant: "destructive" },
      running: { label: "运行中", variant: "secondary" },
      pending: { label: "等待中", variant: "outline" },
    };
    const s = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (configLoading) return <div className="text-center py-8 text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-4">
      {/* 配置状态 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> AppsFlyer 配置状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {configStatus?.hasApiKey ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm">API Token: {configStatus?.hasApiKey ? (
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{configStatus.apiKeyPreview}</code>
              ) : (
                <span className="text-muted-foreground">未配置</span>
              )}</span>
            </div>
            <div className="flex items-center gap-2">
              {configStatus?.hasAppId ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm">App ID: {configStatus?.hasAppId ? (
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{configStatus.appId}</code>
              ) : (
                <span className="text-muted-foreground">未配置</span>
              )}</span>
            </div>
          </div>
          {!configStatus?.configured && (
            <p className="text-xs text-muted-foreground mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
              请在系统设置中配置 <code>APPSFLYER_API_KEY</code> 和 <code>APPSFLYER_APP_ID</code> 环境变量后才能使用同步功能。
              获取方式：AppsFlyer 后台 → API Token 管理页面。
            </p>
          )}
        </CardContent>
      </Card>

      {/* 同步操作 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> 手动同步
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={syncType} onValueChange={setSyncType}>
              <SelectTrigger><SelectValue placeholder="选择报表类型" /></SelectTrigger>
              <SelectContent>
                {reportTypes.map((rt: any) => (
                  <SelectItem key={rt.value} value={rt.value} disabled={rt.disabled}>
                    {rt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={e => setDateRange(p => ({ ...p, startDate: e.target.value }))}
            />
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={e => setDateRange(p => ({ ...p, endDate: e.target.value }))}
            />
            <Button
              onClick={handleSync}
              disabled={isSyncing || !configStatus?.configured}
              className="flex items-center gap-2"
            >
              {isSyncing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 同步中...</>
              ) : (
                <><CloudDownload className="w-4 h-4" /> 开始同步</>
              )}
            </Button>
          </div>

          {(syncType === "raw_installs" || syncType === "in_app_events") && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeOrganic}
                onChange={e => setIncludeOrganic(e.target.checked)}
                className="rounded border-gray-300"
              />
              包含自然{syncType === "raw_installs" ? "安装" : "事件"}数据
            </label>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• <strong>聚合报表</strong>：拉取按渠道+日期汇总的花费、展示、点击、安装数据，写入「获客成本」表</p>
            <p>• <strong>原始安装</strong>：拉取每次安装的详细归因信息（媒体来源、Campaign、设备等），写入「用户归因」表</p>
            <p>• <strong>应用内事件</strong>：拉取 af_purchase 付费事件，写入「付费记录」表并更新用户 LTV</p>
            <p>• <strong>广告收入归因</strong>：拉取 af_ad_revenue 事件，按广告网络归因写入「广告收入」表，用于计算真实 ROAS</p>
            <p>• 建议拉取范围不超过 30 天，避免 API 超时</p>
          </div>
        </CardContent>
      </Card>

      {/* 同步日志 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">同步日志</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetchLogs()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">加载中...</div>
          ) : syncLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无同步记录</p>
              <p className="text-xs mt-1">点击上方“开始同步”按钮开始第一次数据拉取</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium w-8">#</th>
                    <th className="text-left py-2 font-medium">类型</th>
                    <th className="text-left py-2 font-medium">日期范围</th>
                    <th className="text-center py-2 font-medium">状态</th>
                    <th className="text-right py-2 font-medium">行数</th>
                    <th className="text-right py-2 font-medium">跳过</th>
                    <th className="text-right py-2 font-medium">耗时</th>
                    <th className="text-left py-2 font-medium">消息</th>
                    <th className="text-left py-2 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLogs.map((log: any) => (
                    <tr key={log.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 text-muted-foreground">{log.id}</td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-xs">
                          {log.syncType === "aggregate_costs" ? "聚合报表" : log.syncType === "raw_installs" ? "原始安装" : log.syncType === "in_app_events" ? "应用内事件" : log.syncType === "ad_revenue" ? "广告收入" : log.syncType}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs">{log.startDate} ~ {log.endDate}</td>
                      <td className="py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {statusIcon(log.status)}
                          {statusLabel(log.status)}
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono">{log.rowCount.toLocaleString()}</td>
                      <td className="py-2 text-right font-mono text-muted-foreground">{log.skippedCount}</td>
                      <td className="py-2 text-right text-xs">{log.duration ? `${(log.duration / 1000).toFixed(1)}s` : "-"}</td>
                      <td className="py-2 text-xs max-w-[200px] truncate" title={log.message || ""}>{log.message || "-"}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}
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
export default function AcquisitionPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">获客渠道管理</h2>
        <p className="text-sm text-muted-foreground">管理投放渠道、追踪获客成本、分析渠道 ROI</p>
      </div>

      <Tabs defaultValue="ad-daily" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="ad-daily">投放日报</TabsTrigger>
          <TabsTrigger value="roi">ROI 分析</TabsTrigger>
          <TabsTrigger value="channels">渠道管理</TabsTrigger>
          <TabsTrigger value="import">成本导入</TabsTrigger>
          <TabsTrigger value="appsflyer" className="flex items-center gap-1">
            <CloudDownload className="w-3.5 h-3.5" /> AppsFlyer 同步
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ad-daily"><AdDailyReport /></TabsContent>
        <TabsContent value="roi"><ROIAnalysis /></TabsContent>
        <TabsContent value="channels"><ChannelManagement /></TabsContent>
        <TabsContent value="import"><CostImport /></TabsContent>
        <TabsContent value="appsflyer"><AppsFlyerSync /></TabsContent>
      </Tabs>
    </div>
  );
}
