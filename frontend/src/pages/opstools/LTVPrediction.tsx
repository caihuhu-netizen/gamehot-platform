import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Users, BarChart3 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Legend,
} from "recharts";
import { useState, useMemo } from "react";
import AiLtvPredictor from "./AiLtvPredictor";
import BacktestPanel from "./BacktestPanel";

const LAYER_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#3b82f6", "#a855f7"];

export default function LTVPrediction() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedLayers, setSelectedLayers] = useState<Set<string>>(new Set());

  const { data = [], isLoading } = trpc.opsTools.ltvPrediction.useQuery();
  const { data: compData } = trpc.opsTools.ltvSegmentComparison.useQuery(undefined, { enabled: selectedLayers.size > 0 });
  const { data: historyList = [] } = trpc.opsTools.ltvPredictionHistory.useQuery({ limit: 10 });

  type LayerInfo = { layerId: string; layerName: string; userCount: number; retentionData?: Array<{ day: number; rate: number }> };
  type CurvePoint = Record<string, unknown> & { dayLabel: string };
  type MilestoneRow = { layerId: string; layerName: string; userCount: number; d30: number; d60: number; d90: number; d180: number };
  const compLayers: LayerInfo[] = (compData as Record<string, unknown>)?.layers as LayerInfo[] || [];
  const compCurves: CurvePoint[] = (compData as Record<string, unknown>)?.curves as CurvePoint[] || [];
  const compMilestones: MilestoneRow[] = (compData as Record<string, unknown>)?.milestones as MilestoneRow[] || [];
  const retentionSource: LayerInfo[] = (compData as Record<string, unknown>)?.retentionCurves as LayerInfo[] || [];

  const toggleLayer = (lid: string) => {
    setSelectedLayers(prev => {
      const next = new Set(prev);
      next.has(lid) ? next.delete(lid) : next.add(lid);
      return next;
    });
  };

  const filteredCurves = useMemo(() => {
    if (!compCurves.length) return [];
    return compCurves.map((c: any) => {
      const point: any = { dayLabel: c.dayLabel };
      compLayers.filter((l: any) => selectedLayers.has(l.layerId)).forEach((l: any) => {
        point[l.layerId] = c[l.layerId] ?? 0;
      });
      return point;
    });
  }, [compCurves, compLayers, selectedLayers]);

  const retentionCurves = useMemo(() => {
    if (!retentionSource.length) return [];
    const days = [1, 3, 7, 14, 30, 60, 90];
    return days.map(d => {
      const point: any = { day: `D${d}` };
      retentionSource.forEach((layer: any) => {
        const dp = layer.retentionData?.find((r: any) => r.day === d);
        point[layer.layerId] = dp ? dp.rate : null;
      });
      return point;
    });
  }, [retentionSource]);

  const tabs = [
    { id: "overview", label: "LTV 总览", icon: BarChart3 },
    { id: "comparison", label: "分层对比", icon: TrendingUp },
    { id: "ai-predict", label: "AI 预测", icon: Users },
    { id: "backtest", label: "回溯验证", icon: TrendingUp },
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-2">
        {tabs.map(t => (
          <Button key={t.id} variant={activeTab === t.id ? "default" : "ghost"} size="sm" className="text-xs" onClick={() => setActiveTab(t.id)}>
            <t.icon className="h-3.5 w-3.5 mr-1.5" />{t.label}
          </Button>
        ))}
      </div>

      {activeTab === "comparison" && (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">选择层级进行 LTV 对比分析</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.map((layer: any, i: number) => {
                  const isSelected = selectedLayers.has(layer.layerId);
                  const color = LAYER_COLORS[i % LAYER_COLORS.length];
                  return (
                    <button key={layer.layerId} onClick={() => toggleLayer(layer.layerId)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${isSelected ? 'text-white shadow-md' : 'text-foreground hover:bg-muted'}`}
                      style={isSelected ? { backgroundColor: color, borderColor: color } : {}}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isSelected ? '#fff' : color }} />
                      {layer.layerName} ({layer.userCount.toLocaleString()}人)
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">分层 LTV 对比曲线 (D1→D180，基于真实付费数据)</CardTitle></CardHeader>
            <CardContent>
              {selectedLayers.size === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">请选择至少一个层级进行对比</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={filteredCurves}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="dayLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: "LTV ($)", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                    <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                    <Legend />
                    {compLayers.filter((l: any) => selectedLayers.has(l.layerId)).map((layer: any) => {
                      const colorIdx = compLayers.findIndex((cl: any) => cl.layerId === layer.layerId);
                      return (<Line key={layer.layerId} type="monotone" dataKey={layer.layerId} stroke={LAYER_COLORS[colorIdx % LAYER_COLORS.length]} name={`${layer.layerName} (${layer.userCount.toLocaleString()}人)`} strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 2 }} />);
                    })}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">关键里程碑 LTV 对比 (D30/D60/D90/D180)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="py-2 text-left">层级</th><th className="text-right">用户数</th><th className="text-right">D30 LTV</th><th className="text-right">D60 LTV</th><th className="text-right">D90 LTV</th><th className="text-right">D180 LTV</th><th className="text-right">D180/D30 倍率</th>
                </tr></thead>
                <tbody>
                  {compMilestones.filter((m: any) => selectedLayers.has(m.layerId)).map((row: any) => {
                    const colorIdx = compLayers.findIndex((cl: any) => cl.layerId === row.layerId);
                    const ratio = row.d30 > 0 ? (row.d180 / row.d30).toFixed(2) : '--';
                    return (
                      <tr key={row.layerId} className="border-b hover:bg-muted/50">
                        <td className="py-2 font-medium"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: LAYER_COLORS[colorIdx % LAYER_COLORS.length] }} />{row.layerName}</span></td>
                        <td className="text-right">{row.userCount.toLocaleString()}</td>
                        <td className="text-right font-medium">${Number(row.d30).toFixed(2)}</td>
                        <td className="text-right">${Number(row.d60).toFixed(2)}</td>
                        <td className="text-right">${Number(row.d90).toFixed(2)}</td>
                        <td className="text-right font-bold text-indigo-600">${Number(row.d180).toFixed(2)}</td>
                        <td className="text-right">{ratio}x</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">各层留存衰减曲线 (%)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={retentionCurves}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} label={{ value: "留存率 %", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  {retentionSource.map((layer: any, i: number) => (
                    <Area key={layer.layerId} type="monotone" dataKey={layer.layerId} stroke={LAYER_COLORS[i % LAYER_COLORS.length]} fill={LAYER_COLORS[i % LAYER_COLORS.length]} fillOpacity={0.1} name={`${layer.layerName} (${layer.userCount}人)`} strokeWidth={2} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "ai-predict" && (
        <AiLtvPredictor compLayers={compLayers} selectedLayers={selectedLayers} toggleLayer={toggleLayer} setSelectedLayers={setSelectedLayers} />
      )}

      {activeTab === "overview" && (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">各层 LTV 分布</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="layerName" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgLtv" fill="#6366f1" name="平均LTV" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="maxLtv" fill="#10b981" name="最大LTV" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">付费概率 vs 流失风险</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="layerName" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="avgPayProb" fill="#f59e0b" name="付费概率" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgChurnRisk" fill="#ef4444" name="流失风险" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">LTV 预测明细</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="py-2 text-left">层级</th><th className="text-right">用户数</th><th className="text-right">平均LTV</th><th className="text-right">最小LTV</th><th className="text-right">最大LTV</th><th className="text-right">付费概率</th><th className="text-right">流失风险</th>
                </tr></thead>
                <tbody>
                  {data.map((row: any) => (
                    <tr key={row.layerId} className="border-b hover:bg-muted/50">
                      <td className="py-1.5 font-medium">{row.layerName}</td>
                      <td className="text-right">{row.userCount.toLocaleString()}</td>
                      <td className="text-right font-medium">${row.avgLtv.toFixed(2)}</td>
                      <td className="text-right">${row.minLtv.toFixed(2)}</td>
                      <td className="text-right">${row.maxLtv.toFixed(2)}</td>
                      <td className="text-right">{(row.avgPayProb * 100).toFixed(1)}%</td>
                      <td className={`text-right ${row.avgChurnRisk > 0.5 ? 'text-red-600' : 'text-green-600'}`}>{(row.avgChurnRisk * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "backtest" && (<BacktestPanel historyList={historyList} />)}
    </div>
  );
}
