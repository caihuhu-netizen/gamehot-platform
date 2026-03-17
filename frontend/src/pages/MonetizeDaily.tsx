import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/csvExport";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area, ComposedChart, } from "recharts";
import { useState, useMemo } from "react";
import { DateRangePicker, toDateParams } from "@/components/DateRangePicker";
import { subDays } from "date-fns";
const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];
const COUNTRY_COLORS: Record<string, string> = { US: "#3b82f6", JP: "#ef4444", ALL: "#10b981", KR: "#f59e0b", DE: "#8b5cf6" };

function parseRow(d: any) {
  const { currentGameId } = useGame();
  return {
    reportDate: (d.report_date || d.reportDate) instanceof Date ? (d.report_date || d.reportDate).toISOString().split('T')[0] : String(d.report_date || d.reportDate || ''),
    iapRevenue: Number(d.iap_revenue || d.iapRevenue || 0),
    adInterstitial: Number(d.ad_revenue_interstitial || d.adRevenueInterstitial || 0),
    adRewarded: Number(d.ad_revenue_rewarded || d.adRevenueRewarded || 0),
    adBanner: Number(d.ad_revenue_banner || d.adRevenueBanner || 0),
    adNative: Number(d.ad_revenue_native || d.adRevenueNative || 0),
    totalAdRevenue: Number(d.total_ad_revenue || d.totalAdRevenue || 0),
    totalRevenue: Number(d.total_revenue || d.totalRevenue || 0),
    payingUsers: Number(d.paying_users || d.payingUsers || 0),
    arpu: Number(d.arpu || 0),
    arppu: Number(d.arppu || 0),
    country: d.country || "ALL",
  };
}

export default function MonetizeDaily() {
  const { currentGameId } = useGame();
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 29), to: new Date() });
  const dateParams = useMemo(() => toDateParams(dateRange), [dateRange]);
  // Fetch ALL data (no country filter) for the overview
  const { data: rawAll = [], isLoading } = trpc.reports.monetizeDailySummary.useQuery({ ...dateParams, limit: 90,
  gameId: currentGameId ?? undefined,
});
  
  const allData = useMemo(() => (rawAll as unknown as unknown as Record<string, unknown>[]).map(parseRow), [rawAll]);
  
  // Split by country
  const overviewData = useMemo(() => allData.filter(d => d.country === "ALL"), [allData]);
  const countryData = useMemo(() => allData.filter(d => d.country !== "ALL"), [allData]);
  
  const chartData = useMemo(() => [...overviewData].reverse(), [overviewData]);

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">加载中...</div>;
  if (overviewData.length === 0) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">
      <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>暂无变现日报数据</p><p className="text-xs mt-1">数据将从 SDK 事件和 AppLovin MAX 自动汇总</p>
    </CardContent></Card>
  );

  const latest = overviewData[0];
  const prev = overviewData[1];
  const diff = (a: number, b: number) => b ? ((a - b) / b * 100) : 0;

  // Pie chart data for revenue breakdown
  const pieData = [
    { name: "IAP", value: latest.iapRevenue },
    { name: "插屏", value: latest.adInterstitial },
    { name: "激励视频", value: latest.adRewarded },
    { name: "Banner", value: latest.adBanner },
    { name: "原生", value: latest.adNative },
  ].filter(d => d.value > 0);

  // Country revenue comparison - aggregate by country
  const countries = Array.from(new Set(countryData.map(d => d.country)));
  const countryAgg = countries.map(c => {
    const rows = countryData.filter(d => d.country === c);
    return {
      country: c,
      totalRevenue: rows.reduce((s, r) => s + r.totalRevenue, 0),
      iapRevenue: rows.reduce((s, r) => s + r.iapRevenue, 0),
      adRevenue: rows.reduce((s, r) => s + r.totalAdRevenue, 0),
      avgArpu: rows.reduce((s, r) => s + r.arpu, 0) / rows.length,
      days: rows.length,
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Country daily trend for stacked area
  const countryDailyMap = new Map<string, Record<string, number>>();
  countryData.forEach(d => {
    if (!countryDailyMap.has(d.reportDate)) countryDailyMap.set(d.reportDate, {});
    const entry = countryDailyMap.get(d.reportDate)!;
    entry[d.country] = d.totalRevenue;
  });
  const countryDailyChart = Array.from(countryDailyMap.entries())
    .map(([date, vals]) => ({ reportDate: date, ...vals }))
    .sort((a, b) => a.reportDate.localeCompare(b.reportDate));

  const handleExportMonetize = () => {
    exportToCsv("变现日报", overviewData.map(d => ({
      "日期": d.reportDate, "IAP收入": d.iapRevenue,
      "插屏收入": d.adInterstitial, "激励视频": d.adRewarded,
      "Banner收入": d.adBanner, "原生收入": d.adNative,
      "广告总收入": d.totalAdRevenue, "总收入": d.totalRevenue,
      "付费用户": d.payingUsers, "ARPU": d.arpu, "ARPPU": d.arppu,
    })));
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <Button variant="outline" size="sm" onClick={handleExportMonetize}>
          <Download className="h-3.5 w-3.5 mr-1" />导出CSV
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "总收入", value: `$${latest.totalRevenue.toFixed(2)}`, change: diff(latest.totalRevenue, prev?.totalRevenue) },
          { label: "IAP收入", value: `$${latest.iapRevenue.toFixed(2)}`, change: diff(latest.iapRevenue, prev?.iapRevenue) },
          { label: "广告收入", value: `$${latest.totalAdRevenue.toFixed(2)}`, change: diff(latest.totalAdRevenue, prev?.totalAdRevenue) },
          { label: "ARPU", value: `$${latest.arpu.toFixed(4)}`, change: diff(latest.arpu, prev?.arpu) },
          { label: "付费用户", value: latest.payingUsers.toLocaleString(), change: diff(latest.payingUsers, prev?.payingUsers) },
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

      {/* Revenue Composition + Ad Type Stacked Bar */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">收入构成</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">广告收入按类型趋势</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="reportDate" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="adInterstitial" stackId="a" fill="#6366f1" name="插屏" />
                <Bar dataKey="adRewarded" stackId="a" fill="#f59e0b" name="激励视频" />
                <Bar dataKey="adBanner" stackId="a" fill="#10b981" name="Banner" />
                <Bar dataKey="adNative" stackId="a" fill="#8b5cf6" name="原生" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* IAP vs Ad Revenue Stacked Area + ARPU/ARPPU Trend */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">IAP vs 广告收入趋势</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="reportDate" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `$${Number(v).toFixed(2)}`} />
                <Legend />
                <Area type="monotone" dataKey="iapRevenue" stackId="1" fill="#6366f1" stroke="#6366f1" fillOpacity={0.6} name="IAP收入" />
                <Area type="monotone" dataKey="totalAdRevenue" stackId="1" fill="#10b981" stroke="#10b981" fillOpacity={0.6} name="广告收入" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">ARPU / ARPPU 趋势</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="reportDate" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `$${Number(v).toFixed(4)}`} />
                <Legend />
                <Line type="monotone" dataKey="arpu" stroke="#6366f1" name="ARPU" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="arppu" stroke="#f59e0b" name="ARPPU" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Country Revenue Comparison */}
      {countryAgg.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">国家收入对比</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={countryAgg} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={40} />
                  <Tooltip formatter={(v: number) => `$${Number(v).toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="iapRevenue" stackId="a" fill="#6366f1" name="IAP" />
                  <Bar dataKey="adRevenue" stackId="a" fill="#10b981" name="广告" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          {countryDailyChart.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">国家收入趋势</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={countryDailyChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="reportDate" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => `$${Number(v).toFixed(2)}`} />
                    <Legend />
                    {countries.map((c, i) => (
                      <Area key={c} type="monotone" dataKey={c} stackId="1" fill={COUNTRY_COLORS[c] || COLORS[i % COLORS.length]} stroke={COUNTRY_COLORS[c] || COLORS[i % COLORS.length]} fillOpacity={0.5} name={c} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Detail Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">变现日报明细</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b text-muted-foreground">
              <th className="py-2 text-left">日期</th>
              <th className="text-right">IAP</th><th className="text-right">插屏</th>
              <th className="text-right">激励</th><th className="text-right">Banner</th>
              <th className="text-right">原生</th><th className="text-right">广告合计</th>
              <th className="text-right">总收入</th><th className="text-right">ARPU</th>
              <th className="text-right">ARPPU</th><th className="text-right">付费人数</th>
            </tr></thead>
            <tbody>
              {overviewData.map((row: Record<string,unknown>) => (
                <tr key={row.reportDate} className="border-b hover:bg-muted/50">
                  <td className="py-1.5">{row.reportDate}</td>
                  <td className="text-right">${row.iapRevenue.toFixed(2)}</td>
                  <td className="text-right">${row.adInterstitial.toFixed(2)}</td>
                  <td className="text-right">${row.adRewarded.toFixed(2)}</td>
                  <td className="text-right">${row.adBanner.toFixed(2)}</td>
                  <td className="text-right">${row.adNative.toFixed(2)}</td>
                  <td className="text-right text-indigo-600">${row.totalAdRevenue.toFixed(2)}</td>
                  <td className="text-right font-medium">${row.totalRevenue.toFixed(2)}</td>
                  <td className="text-right">${row.arpu.toFixed(4)}</td>
                  <td className="text-right">${row.arppu.toFixed(4)}</td>
                  <td className="text-right">{row.payingUsers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
