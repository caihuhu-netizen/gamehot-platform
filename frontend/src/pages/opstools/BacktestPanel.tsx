import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  TrendingUp, Sparkles, Loader2, Shield, XCircle, FileBarChart,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { useState, useMemo } from "react";

const LAYER_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#3b82f6", "#a855f7"];

export default function BacktestPanel({ historyList }: { historyList: any[] }) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [selectedWindow, setSelectedWindow] = useState("D30");
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: reports = [], isLoading: reportsLoading } = trpc.opsTools.backtestReports.useQuery({ verificationWindow: selectedWindow, limit: 20 });
  const { data: trend = [] } = trpc.opsTools.backtestTrend.useQuery({ verificationWindow: selectedWindow, limit: 10 });
  const { data: reportDetail } = trpc.opsTools.backtestReportDetail.useQuery({ id: showDetail! }, { enabled: showDetail !== null });

  const runMut = trpc.opsTools.runBacktest.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`回溯验证完成，已生成 ${data.reports?.length || 0} 个窗口的报告`);
        utils.opsTools.backtestReports.invalidate();
        utils.opsTools.backtestTrend.invalidate();
      } else {
        toast.error(data.error || "回溯失败");
      }
    },
    onError: (e) => toast.error(`回溯失败: ${e.message}`),
  });

  const handleRunBacktest = () => {
    if (!selectedVersion) { toast.error("请先选择一个预测版本"); return; }
    runMut.mutate({ predictionVersion: selectedVersion, verificationWindows: ["D30", "D60", "D90", "D180", "D365"] });
  };

  const WINDOWS = ["D30", "D60", "D90", "D180", "D365"];
  const getMapeColor = (mape: number) => mape <= 10 ? "text-emerald-600" : mape <= 20 ? "text-amber-600" : mape <= 30 ? "text-orange-600" : "text-red-600";
  const getMapeLabel = (mape: number) => mape <= 10 ? "优秀" : mape <= 20 ? "良好" : mape <= 30 ? "一般" : "偏差";

  const trendData = useMemo(() => (trend as Record<string, unknown>[]).map((t: any) => ({
    date: new Date(t.reportDate).toLocaleDateString(),
    mape: Number(t.overallMape || 0),
    mae: Number(t.overallMae || 0),
    rSquared: Number(t.overallRSquared || 0),
  })).reverse(), [trend]);

  const detail = reportDetail ? (typeof reportDetail === 'object' ? reportDetail : null) : null;
  const detailLayers = detail ? (typeof (detail as Record<string, unknown>).layerDetails === 'string' ? JSON.parse((detail as Record<string, unknown>).layerDetails as string) : (detail as Record<string, unknown>).layerDetails || []) : [];
  const detailSuggestions = detail ? (typeof (detail as Record<string, unknown>).optimizationSuggestions === 'string' ? JSON.parse((detail as Record<string, unknown>).optimizationSuggestions as string) : (detail as Record<string, unknown>).optimizationSuggestions || []) : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs text-muted-foreground mb-1">选择预测版本进行回溯</p>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm" value={selectedVersion || ""} onChange={(e) => setSelectedVersion(e.target.value ? Number(e.target.value) : null)}>
                <option value="">请选择预测版本...</option>
                {historyList.map((h: any) => (<option key={h.version} value={h.version}>v{h.version} - {new Date(h.generatedAt).toLocaleString()} ({h.triggerType === "scheduled" ? "定时" : "手动"})</option>))}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">验证窗口</p>
              <div className="flex gap-1">
                {WINDOWS.map(w => (<Button key={w} variant={selectedWindow === w ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setSelectedWindow(w)}>{w}</Button>))}
              </div>
            </div>
            <div className="self-end">
              <Button onClick={handleRunBacktest} disabled={runMut.isPending || !selectedVersion} className="bg-violet-600 hover:bg-violet-700 text-white" size="sm">
                {runMut.isPending ? (<><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />回溯中...</>) : (<><Shield className="h-3.5 w-3.5 mr-1.5" />执行回溯验证</>)}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {trendData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-violet-600" />预测准确度趋势 ({selectedWindow})</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="mape" tick={{ fontSize: 11 }} label={{ value: "MAPE (%)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <YAxis yAxisId="r2" orientation="right" tick={{ fontSize: 11 }} domain={[-1, 1]} label={{ value: "R²", angle: 90, position: "insideRight", style: { fontSize: 10 } }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="mape" type="monotone" dataKey="mape" stroke="#ef4444" name="MAPE (%)" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="mape" type="monotone" dataKey="mae" stroke="#f59e0b" name="MAE ($)" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="r2" type="monotone" dataKey="rSquared" stroke="#10b981" name="R²" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileBarChart className="h-4 w-4 text-violet-600" />回溯报告列表 ({selectedWindow})</CardTitle></CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="py-8 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-violet-500" /></div>
          ) : (reports as Record<string, unknown>[]).length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无回溯报告</p>
              <p className="text-xs mt-1">请选择一个预测版本并执行回溯验证</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left">
                  <th className="py-2 pr-3 font-medium">日期</th><th className="py-2 pr-3 font-medium text-right">MAPE</th><th className="py-2 pr-3 font-medium text-right">MAE</th><th className="py-2 pr-3 font-medium text-right">R²</th><th className="py-2 pr-3 font-medium text-right">偏差</th><th className="py-2 pr-3 font-medium text-center">评级</th><th className="py-2 font-medium text-right">操作</th>
                </tr></thead>
                <tbody>
                  {(reports as Record<string, unknown>[]).map((r: any) => (
                    <tr key={r.id} className="border-b border-dashed hover:bg-muted/30">
                      <td className="py-2 pr-3"><p className="text-xs">{new Date(r.reportDate).toLocaleDateString()}</p><p className="text-[10px] text-muted-foreground">v{r.predictionVersion} · {r.triggerType === "scheduled" ? "定时" : "手动"}</p></td>
                      <td className={`py-2 pr-3 text-right font-mono ${getMapeColor(r.overallMape)}`}>{Number(r.overallMape).toFixed(1)}%</td>
                      <td className="py-2 pr-3 text-right font-mono">${Number(r.overallMae).toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right font-mono">{Number(r.overallRSquared).toFixed(3)}</td>
                      <td className="py-2 pr-3 text-right font-mono"><span className={Number(r.overallBias) > 0 ? "text-red-500" : "text-blue-500"}>{Number(r.overallBias) > 0 ? "+" : ""}${Number(r.overallBias).toFixed(2)}</span></td>
                      <td className="py-2 pr-3 text-center"><Badge variant={Number(r.overallMape) <= 10 ? "default" : Number(r.overallMape) <= 20 ? "secondary" : "destructive"} className="text-[10px]">{getMapeLabel(Number(r.overallMape))}</Badge></td>
                      <td className="py-2 text-right"><Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowDetail(r.id)}>详情</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showDetail && detail && (
        <Card className="border-violet-200 dark:border-violet-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><FileBarChart className="h-4 w-4 text-violet-600" />回溯报告详情 - {String((detail as Record<string, unknown>).verificationWindow)}</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowDetail(null)}><XCircle className="h-3.5 w-3.5 mr-1" />关闭</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground">整体 MAPE</p>
                <p className={`text-lg font-bold ${getMapeColor(Number((detail as Record<string, unknown>).overallMape))}`}>{Number((detail as Record<string, unknown>).overallMape).toFixed(1)}%</p>
                <Badge variant={Number((detail as Record<string, unknown>).overallMape) <= 10 ? "default" : Number((detail as Record<string, unknown>).overallMape) <= 20 ? "secondary" : "destructive"} className="text-[10px] mt-1">{getMapeLabel(Number((detail as Record<string, unknown>).overallMape))}</Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground">整体 MAE</p>
                <p className="text-lg font-bold">${Number((detail as Record<string, unknown>).overallMae).toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground">R² 决定系数</p>
                <p className="text-lg font-bold">{Number((detail as Record<string, unknown>).overallRSquared).toFixed(4)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground">平均偏差</p>
                <p className={`text-lg font-bold ${Number((detail as Record<string, unknown>).overallBias) > 0 ? "text-red-500" : "text-blue-500"}`}>{Number((detail as Record<string, unknown>).overallBias) > 0 ? "+" : ""}${Number((detail as Record<string, unknown>).overallBias).toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">{Number((detail as Record<string, unknown>).overallBias) > 0 ? "高估" : "低估"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground">评估用户数</p>
                <p className="text-lg font-bold">{((detail as Record<string, unknown>).totalUsersEvaluated || 0).toLocaleString()}</p>
              </div>
            </div>

            {detailLayers.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">分层预测 vs 实际对比</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={detailLayers}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="layerName" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="predicted" fill="#6366f1" name="预测 LTV" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="actual" fill="#10b981" name="实际 LTV" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {detailLayers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-left">
                    <th className="py-1.5 pr-2 font-medium">层级</th><th className="py-1.5 pr-2 font-medium text-right">预测 LTV</th><th className="py-1.5 pr-2 font-medium text-right">实际 LTV</th><th className="py-1.5 pr-2 font-medium text-right">偏差</th><th className="py-1.5 pr-2 font-medium text-right">MAPE</th><th className="py-1.5 pr-2 font-medium text-right">准确度</th><th className="py-1.5 pr-2 font-medium text-center">方向</th><th className="py-1.5 font-medium text-right">用户数</th>
                  </tr></thead>
                  <tbody>
                    {detailLayers.map((l: any, i: number) => (
                      <tr key={i} className="border-b border-dashed">
                        <td className="py-1.5 pr-2 font-medium">{l.layerName}</td>
                        <td className="py-1.5 pr-2 text-right font-mono">${l.predicted}</td>
                        <td className="py-1.5 pr-2 text-right font-mono">${l.actual}</td>
                        <td className={`py-1.5 pr-2 text-right font-mono ${l.error > 0 ? "text-red-500" : "text-blue-500"}`}>{l.error > 0 ? "+" : ""}${l.error}</td>
                        <td className={`py-1.5 pr-2 text-right font-mono ${getMapeColor(l.mape)}`}>{l.mape}%</td>
                        <td className="py-1.5 pr-2 text-right font-mono">{l.accuracy}%</td>
                        <td className="py-1.5 pr-2 text-center"><Badge variant={l.bias === "准确" ? "default" : "secondary"} className="text-[10px]">{l.bias}</Badge></td>
                        <td className="py-1.5 text-right">{(l.userCount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {detailSuggestions.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-600" />AI 优化建议</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {detailSuggestions.map((s: any, i: number) => (
                      <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="shrink-0"><Badge variant={s.priority === "high" ? "destructive" : s.priority === "medium" ? "secondary" : "outline"} className="text-[10px]">{s.priority === "high" ? "高" : s.priority === "medium" ? "中" : "低"}</Badge></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{s.suggestion}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">影响: {s.impact}</p>
                          <p className="text-[10px] text-muted-foreground">目标层级: {s.targetLayers}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
