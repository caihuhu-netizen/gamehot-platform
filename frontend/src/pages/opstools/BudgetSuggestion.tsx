import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useMemo } from "react";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

export default function BudgetSuggestion() {
  const { data: rawData = [], isLoading } = trpc.opsTools.budgetSuggestion.useQuery();
  const data = useMemo(() => (rawData as Record<string, unknown>[]).map((d: any) => ({
    channelName: d.channel_name || d.channelName,
    channelCode: d.channel_code || d.channelCode,
    totalSpend: Number(d.total_spend || 0),
    totalInstalls: Number(d.total_installs || 0),
    cpi: Number(d.cpi || 0),
    totalLtv: Number(d.total_ltv || 0),
    roi: Number(d.roi || 0),
  })), [rawData]);

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">加载中...</div>;
  if (data.length === 0) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">
      <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>暂无预算建议数据</p>
      <p className="text-xs mt-1">需要先配置渠道和录入成本数据</p>
    </CardContent></Card>
  );

  const pieData = data.filter(d => d.totalSpend > 0).map(d => ({
    name: d.channelName, value: d.totalSpend,
  }));

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">当前预算分配</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">渠道 ROI 对比</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="channelName" tick={{ fontSize: 10 }} width={80} />
                <Tooltip />
                <Bar dataKey="roi" fill="#10b981" name="ROI" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">优化建议</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.sort((a, b) => b.roi - a.roi).map((ch) => {
              const suggestion = ch.roi > 1.5 ? "建议增加预算" : ch.roi > 1 ? "维持当前预算" : ch.roi > 0.5 ? "建议减少预算" : "建议暂停投放";
              const color = ch.roi > 1.5 ? "text-green-600" : ch.roi > 1 ? "text-blue-600" : ch.roi > 0.5 ? "text-amber-600" : "text-red-600";
              const bg = ch.roi > 1.5 ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" : ch.roi > 1 ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800" : ch.roi > 0.5 ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800" : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
              return (
                <div key={ch.channelCode} className={`p-3 rounded-lg border ${bg} flex items-center justify-between`}>
                  <div>
                    <p className="text-sm font-medium">{ch.channelName}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>花费: ${ch.totalSpend.toFixed(2)}</span>
                      <span>CPI: ${ch.cpi.toFixed(2)}</span>
                      <span>安装: {ch.totalInstalls.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${color}`}>ROI: {ch.roi.toFixed(2)}x</p>
                    <p className={`text-xs ${color}`}>{suggestion}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
