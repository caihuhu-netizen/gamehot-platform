import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, AreaChart, Area, } from "recharts";
import { Users, TrendingUp, TrendingDown, Download, ShieldCheck, DollarSign, Activity } from "lucide-react";
import { useState, useMemo } from "react";
import { exportToCsv } from "@/lib/csvExport";
import { DateRangePicker, toDateParams } from "@/components/DateRangePicker";
import { subDays } from "date-fns";
const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#6366f1", "#8b5cf6"];

export default function UserQualityDaily() {
  const { currentGameId } = useGame();
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 29), to: new Date() });
  const dateParams = useMemo(() => toDateParams(dateRange), [dateRange]);
  const { data: rawData = [], isLoading } = trpc.reports.userQualityDaily.useQuery(dateParams);
  const data = useMemo(() => (rawData as unknown as unknown as Record<string, unknown>[]).map((d: Record<string,unknown>) => ({
    reportDate: d.report_date instanceof Date ? d.report_date.toISOString().split('T')[0] : String(d.report_date || ''),
    newUsers: Number(d.new_users || 0),
    lowValue: Number(d.low_value || 0),
    midValue: Number(d.mid_value || 0),
    highValue: Number(d.high_value || 0),
    avgPredictedLtv: Number(d.avg_predicted_ltv || 0),
    avgPayProbability: Number(d.avg_pay_probability || 0),
    avgChurnRisk: Number(d.avg_churn_risk || 0),
    avgActivityScore: Number(d.avg_activity_score || 0),
  })).reverse(), [rawData]);

  // Latest and previous for comparison
  const latest = data.length > 0 ? data[data.length - 1] : null;
  const prev = data.length > 1 ? data[data.length - 2] : null;
  const dod = (cur: number, pre: number) => pre === 0 ? 0 : ((cur - pre) / pre * 100);

  // Segment distribution pie for latest day
  const pieData = latest ? [
    { name: "低价值(L1-L3)", value: latest.lowValue, color: "#ef4444" },
    { name: "中价值(L4-L6)", value: latest.midValue, color: "#f59e0b" },
    { name: "高价值(L7-L10)", value: latest.highValue, color: "#10b981" },
  ].filter(d => d.value > 0) : [];

  // Stacked bar data for segment distribution over time
  const stackedData = data.slice(-14); // last 14 days

  const handleExport = () => {
    exportToCsv("用户质量日报", (data ?? []).map(d => ({
      "日期": d.reportDate,
      "新增用户": d.newUsers,
      "低价值用户": d.lowValue,
      "中价值用户": d.midValue,
      "高价值用户": d.highValue,
      "预测LTV($)": d.avgPredictedLtv,
      "付费概率": d.avgPayProbability,
      "流失风险": d.avgChurnRisk,
      "活跃评分": d.avgActivityScore,
    })));
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">用户质量日报</h1>
          <p className="text-muted-foreground text-sm mt-1">每日新增用户分层分布、预测LTV与付费概率趋势</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1" />导出CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "今日新增", value: latest.newUsers.toLocaleString(), change: prev ? dod(latest.newUsers, prev.newUsers) : null, icon: Users },
            { label: "预测LTV", value: `$${latest.avgPredictedLtv.toFixed(2)}`, change: prev ? dod(latest.avgPredictedLtv, prev.avgPredictedLtv) : null, icon: DollarSign },
            { label: "付费概率", value: `${(latest.avgPayProbability * 100).toFixed(1)}%`, change: prev ? dod(latest.avgPayProbability, prev.avgPayProbability) : null, icon: ShieldCheck },
            { label: "活跃评分", value: latest.avgActivityScore.toFixed(3), change: prev ? dod(latest.avgActivityScore, prev.avgActivityScore) : null, icon: Activity },
          ].map(m => (
            <Card key={m.label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold">{m.value}</p>
                {m.change !== null && (
                  <div className="flex items-center gap-1 mt-1">
                    {m.change >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${m.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {m.change >= 0 ? "+" : ""}{m.change.toFixed(1)}% 日环比
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data.length > 0 ? (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Segment distribution pie */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">最新一日用户分层分布</CardTitle></CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">暂无分层数据</p>
                )}
              </CardContent>
            </Card>

            {/* Segment distribution stacked bar over time */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">分层分布趋势（近14天）</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stackedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="reportDate" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="highValue" stackId="a" fill="#10b981" name="高价值(L7-10)" />
                    <Bar dataKey="midValue" stackId="a" fill="#f59e0b" name="中价值(L4-6)" />
                    <Bar dataKey="lowValue" stackId="a" fill="#ef4444" name="低价值(L1-3)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* LTV trend */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">预测LTV趋势</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="reportDate" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                    <Area type="monotone" dataKey="avgPredictedLtv" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} name="预测LTV($)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pay probability & churn risk trend */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">付费概率 & 流失风险趋势</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="reportDate" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgPayProbability" stroke="#10b981" name="付费概率" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="avgChurnRisk" stroke="#ef4444" name="流失风险" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="avgActivityScore" stroke="#6366f1" name="活跃评分" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Data table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">每日用户质量明细</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="py-2 text-left">日期</th>
                  <th className="text-right">新增</th>
                  <th className="text-right">低价值</th><th className="text-right">中价值</th><th className="text-right">高价值</th>
                  <th className="text-right">预测LTV</th><th className="text-right">付费概率</th>
                  <th className="text-right">流失风险</th><th className="text-right">活跃评分</th>
                </tr></thead>
                <tbody>
                  {[...data].reverse().map((row) => (
                    <tr key={row.reportDate} className="border-b hover:bg-muted/50">
                      <td className="py-1.5 font-medium">{row.reportDate}</td>
                      <td className="text-right">{row.newUsers}</td>
                      <td className="text-right"><Badge variant="outline" className="text-[10px] border-red-200 text-red-600">{row.lowValue}</Badge></td>
                      <td className="text-right"><Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600">{row.midValue}</Badge></td>
                      <td className="text-right"><Badge variant="outline" className="text-[10px] border-green-200 text-green-600">{row.highValue}</Badge></td>
                      <td className="text-right font-medium">${row.avgPredictedLtv.toFixed(2)}</td>
                      <td className="text-right">{(row.avgPayProbability * 100).toFixed(1)}%</td>
                      <td className="text-right">{(row.avgChurnRisk * 100).toFixed(1)}%</td>
                      <td className="text-right">{row.avgActivityScore.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>暂无用户质量日报数据</p>
          <p className="text-xs mt-1">数据将根据用户安装时间和分层标签自动计算</p>
        </CardContent></Card>
      )}
    </div>
  );
}
