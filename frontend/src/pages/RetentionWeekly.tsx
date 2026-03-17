import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, AreaChart, Area, } from "recharts";
import { CalendarDays, TrendingUp, TrendingDown, Download, Users } from "lucide-react";
import { useState, useMemo } from "react";
import { exportToCsv } from "@/lib/csvExport";
import { DateRangePicker, toDateParams } from "@/components/DateRangePicker";
import { subDays } from "date-fns";
export default function RetentionWeekly() {
  const { currentGameId } = useGame();
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 89), to: new Date() });
  const dateParams = useMemo(() => toDateParams(dateRange), [dateRange]);
  const { data: rawData = [], isLoading } = trpc.reports.retentionWeekly.useQuery(dateParams);
  const data = useMemo(() => (rawData as unknown as unknown as Record<string, unknown>[]).map((d: Record<string,unknown>) => ({
    weekKey: d.week_key,
    weekStart: d.week_start,
    newUsers: Number(d.new_users || 0),
    d1Retained: Number(d.d1_retained || 0),
    d3Retained: Number(d.d3_retained || 0),
    d7Retained: Number(d.d7_retained || 0),
    d1Rate: Number(d.d1_rate || 0),
    d3Rate: Number(d.d3_rate || 0),
    d7Rate: Number(d.d7_rate || 0),
  })).reverse(), [rawData]);

  // Week-over-week comparison
  const latest = data.length > 0 ? data[data.length - 1] : null;
  const prev = data.length > 1 ? data[data.length - 2] : null;
  const wow = (cur: number, pre: number) => pre === 0 ? 0 : ((cur - pre) / pre * 100);

  // Funnel data from latest week
  const funnelData = latest ? [
    { stage: "新增用户", count: latest.newUsers, rate: 100 },
    { stage: "D1留存", count: latest.d1Retained, rate: latest.d1Rate },
    { stage: "D3留存", count: latest.d3Retained, rate: latest.d3Rate },
    { stage: "D7留存", count: latest.d7Retained, rate: latest.d7Rate },
  ] : [];

  const handleExport = () => {
    exportToCsv("留存周报", (data ?? []).map(d => ({
      "周起始日": d.weekStart,
      "新增用户": d.newUsers,
      "D1留存人数": d.d1Retained,
      "D3留存人数": d.d3Retained,
      "D7留存人数": d.d7Retained,
      "D1留存率%": d.d1Rate,
      "D3留存率%": d.d3Rate,
      "D7留存率%": d.d7Rate,
    })));
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">留存周报</h1>
          <p className="text-muted-foreground text-sm mt-1">每周新增用户 D1/D3/D7 留存趋势与环比分析</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1" />导出CSV
          </Button>
        </div>
      </div>

      {/* Week-over-week summary cards */}
      {latest && prev && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "本周新增", value: latest.newUsers.toLocaleString(), change: wow(latest.newUsers, prev.newUsers), icon: Users },
            { label: "D1留存率", value: `${latest.d1Rate}%`, change: wow(latest.d1Rate, prev.d1Rate), icon: CalendarDays },
            { label: "D3留存率", value: `${latest.d3Rate}%`, change: wow(latest.d3Rate, prev.d3Rate), icon: CalendarDays },
            { label: "D7留存率", value: `${latest.d7Rate}%`, change: wow(latest.d7Rate, prev.d7Rate), icon: CalendarDays },
          ].map(m => (
            <Card key={m.label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold">{m.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {m.change >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${m.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {m.change >= 0 ? "+" : ""}{m.change.toFixed(1)}% 周环比
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data.length > 0 ? (
        <>
          {/* Retention rate trend */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">留存率趋势（D1 / D3 / D7）</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="weekStart" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="d1Rate" stroke="#6366f1" name="D1留存%" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="d3Rate" stroke="#f59e0b" name="D3留存%" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="d7Rate" stroke="#10b981" name="D7留存%" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {/* New users + retained users stacked area */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">新增用户 & 留存人数</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="weekStart" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="newUsers" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} name="新增用户" strokeWidth={2} />
                    <Area type="monotone" dataKey="d1Retained" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} name="D1留存" strokeWidth={2} />
                    <Area type="monotone" dataKey="d7Retained" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="D7留存" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Retention funnel */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">最新一周留存漏斗</CardTitle></CardHeader>
              <CardContent>
                {funnelData.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    {funnelData.map((f, i) => (
                      <div key={f.stage}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{f.stage}</span>
                          <span className="text-muted-foreground">{f.count.toLocaleString()} ({f.rate}%)</span>
                        </div>
                        <div className="h-8 bg-muted rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md transition-all duration-500"
                            style={{
                              width: `${f.rate}%`,
                              backgroundColor: ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"][i],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">暂无数据</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">周度留存明细</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="py-2 text-left">周起始日</th>
                  <th className="text-right">新增用户</th>
                  <th className="text-right">D1留存</th><th className="text-right">D1率</th>
                  <th className="text-right">D3留存</th><th className="text-right">D3率</th>
                  <th className="text-right">D7留存</th><th className="text-right">D7率</th>
                </tr></thead>
                <tbody>
                  {[...data].reverse().map((row) => (
                    <tr key={row.weekKey} className="border-b hover:bg-muted/50">
                      <td className="py-1.5 font-medium">{row.weekStart}</td>
                      <td className="text-right">{row.newUsers.toLocaleString()}</td>
                      <td className="text-right">{row.d1Retained.toLocaleString()}</td>
                      <td className="text-right"><Badge variant="outline" className="text-[10px]">{row.d1Rate}%</Badge></td>
                      <td className="text-right">{row.d3Retained.toLocaleString()}</td>
                      <td className="text-right"><Badge variant="outline" className="text-[10px]">{row.d3Rate}%</Badge></td>
                      <td className="text-right">{row.d7Retained.toLocaleString()}</td>
                      <td className="text-right"><Badge variant="outline" className="text-[10px]">{row.d7Rate}%</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>暂无留存周报数据</p>
          <p className="text-xs mt-1">数据将根据用户安装时间自动计算</p>
        </CardContent></Card>
      )}
    </div>
  );
}
