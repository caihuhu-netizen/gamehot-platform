import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useMemo } from "react";

export default function CampaignTracker() {
  const { data: campaigns = [], isLoading } = trpc.opsTools.listCampaigns.useQuery();
  const data = useMemo(() => (campaigns as Record<string, unknown>[]).map((c: any) => ({
    id: c.id,
    name: c.campaign_name || c.campaignName,
    type: c.campaign_type || c.campaignType,
    status: c.status,
    startDate: c.start_date || c.startDate,
    endDate: c.end_date || c.endDate,
    budget: Number(c.budget || 0),
    incrementalRevenue: Number(c.total_incremental_revenue || 0),
    incrementalUsers: Number(c.total_incremental_users || 0),
    incrementalPayers: Number(c.total_incremental_payers || 0),
  })), [campaigns]);

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">加载中...</div>;
  if (data.length === 0) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">
      <Target className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>暂无运营活动</p>
      <p className="text-xs mt-1">创建活动来追踪运营效果</p>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">活动效果对比</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="budget" fill="#ef4444" name="预算" />
                <Bar dataKey="incrementalRevenue" fill="#10b981" name="增量收入" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">增量用户 & 付费</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="incrementalUsers" fill="#6366f1" name="增量用户" />
                <Bar dataKey="incrementalPayers" fill="#f59e0b" name="增量付费" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">活动列表</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b text-muted-foreground">
              <th className="py-2 text-left">活动名称</th><th className="text-left">类型</th>
              <th className="text-left">状态</th><th className="text-left">开始</th><th className="text-left">结束</th>
              <th className="text-right">预算</th><th className="text-right">增量收入</th>
              <th className="text-right">增量用户</th><th className="text-right">ROI</th>
            </tr></thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/50">
                  <td className="py-1.5 font-medium">{row.name}</td>
                  <td><Badge variant="outline" className="text-[10px]">{row.type || "promotion"}</Badge></td>
                  <td><Badge variant={row.status === "active" ? "default" : row.status === "completed" ? "secondary" : "outline"} className="text-[10px]">{row.status}</Badge></td>
                  <td>{row.startDate}</td>
                  <td>{row.endDate}</td>
                  <td className="text-right">${row.budget.toFixed(2)}</td>
                  <td className="text-right text-green-600">${row.incrementalRevenue.toFixed(2)}</td>
                  <td className="text-right">{row.incrementalUsers.toLocaleString()}</td>
                  <td className={`text-right font-medium ${row.budget > 0 && row.incrementalRevenue / row.budget > 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.budget > 0 ? `${((row.incrementalRevenue / row.budget - 1) * 100).toFixed(1)}%` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
