import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Brain, Sparkles, AlertTriangle, ChevronRight, Loader2, RefreshCw,
  BarChart3, FileBarChart,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from "recharts";
import { useState, useMemo, useEffect } from "react";

const LAYER_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#3b82f6", "#a855f7"];

export default function AiLtvPredictor({ compLayers, selectedLayers, toggleLayer, setSelectedLayers }: {
  compLayers: unknown[];
  selectedLayers: Set<string>;
  toggleLayer: (lid: string) => void;
  setSelectedLayers: (s: Set<string>) => void;
}) {
  const [aiResult, setAiResult] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const { data: cachedResult, isLoading: cacheLoading } = trpc.opsTools.ltvPredictionCached.useQuery({});
  const { data: historyList = [] } = trpc.opsTools.ltvPredictionHistory.useQuery({ limit: 10 });
  const { data: scheduleConfig, refetch: refetchSchedule } = trpc.opsTools.ltvScheduleConfig.useQuery();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (cachedResult && !aiResult) {
      setAiResult({ ...cachedResult, fromCache: true });
    }
  }, [cachedResult]);

  const aiMut = trpc.opsTools.ltvAiPredict.useMutation({
    onSuccess: (data) => {
      setAiResult(data);
      utils.opsTools.ltvPredictionCached.invalidate();
      utils.opsTools.ltvPredictionHistory.invalidate();
      if (data.fromCache) {
        toast.success("已加载缓存的预测结果");
      } else if (data.predictions?.length > 0) {
        toast.success("AI 预测分析完成，结果已缓存");
      } else {
        toast.info(String(data.summary || "暂无足够数据"));
      }
    },
    onError: (e) => toast.error(`预测失败: ${e.message}`),
  });

  const scheduleMut = trpc.opsTools.updateLtvSchedule.useMutation({
    onSuccess: () => {
      refetchSchedule();
      toast.success("定时任务配置已更新");
    },
    onError: (e) => toast.error(`更新失败: ${e.message}`),
  });

  const handlePredict = (forceRefresh = false) => {
    const layers = selectedLayers.size > 0 ? Array.from(selectedLayers) : undefined;
    aiMut.mutate({ selectedLayers: layers, forceRefresh });
  };

  const loadVersion = async (version: number) => {
    try {
      const data = await utils.opsTools.ltvPredictionVersion.fetch({ cacheKey: "all", version });
      if (data) {
        setAiResult({ ...data, fromCache: true });
        setShowHistory(false);
        toast.success(`已加载版本 v${version} 的预测结果`);
      }
    } catch (e) {
      toast.error("加载历史版本失败");
    }
  };

  const predictionCurveData = useMemo(() => {
    if (!aiResult?.predictions?.length) return [];
    const days = ["d30", "d60", "d90", "d180", "d365"];
    const dayLabels = ["D30", "D60", "D90", "D180", "D365"];
    return days.map((d, i) => {
      const point: any = { day: dayLabels[i] };
      aiResult.predictions.forEach((p: any) => {
        point[`${p.layerId}_pred`] = p[d]?.predicted ?? 0;
        point[`${p.layerId}_upper`] = p[d]?.upper ?? 0;
        point[`${p.layerId}_lower`] = p[d]?.lower ?? 0;
      });
      return point;
    });
  }, [aiResult]);

  return (
    <div className="space-y-4">
      {/* Trigger Card with Cache Status */}
      <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/30">
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
                <Brain className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI 智能 LTV 预测分析</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  基于各分层用户的行为特征，调用 LLM 分析预测未来 D30–D365 的 LTV 走势。预测结果自动缓存 24 小时，支持每日定时自动更新。
                </p>
                {aiResult?.fromCache && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                      缓存命中{aiResult.version ? ` · v${aiResult.version}` : ""}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      生成于 {new Date(aiResult.generatedAt).toLocaleString()}
                      {aiResult.expiresAt && ` · 过期于 ${new Date(aiResult.expiresAt).toLocaleString()}`}
                    </span>
                  </div>
                )}
                {selectedLayers.size > 0 && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">已选择 {selectedLayers.size} 个层级</p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button onClick={() => handlePredict(false)} disabled={aiMut.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white" size="sm">
                {aiMut.isPending ? (<><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />分析中...</>) : (<><Sparkles className="h-3.5 w-3.5 mr-1.5" />{cachedResult ? "加载预测" : "开始预测"}</>)}
              </Button>
              {cachedResult && (
                <Button variant="outline" size="sm" onClick={() => handlePredict(true)} disabled={aiMut.isPending} className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />强制刷新
                </Button>
              )}
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setShowHistory(!showHistory)}>历史版本</Button>
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setShowSchedule(!showSchedule)}>定时配置</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Panel */}
      {showHistory && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />预测历史版本</CardTitle></CardHeader>
          <CardContent>
            {(historyList as Record<string, unknown>[]).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">暂无历史记录</p>
            ) : (
              <div className="space-y-2">
                {(historyList as Record<string, unknown>[]).map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant={h.status === "valid" ? "default" : "secondary"} className="text-[10px]">v{h.version}</Badge>
                      <div>
                        <p className="text-xs font-medium">
                          {h.triggerType === "scheduled" ? "定时更新" : h.triggerType === "auto" ? "自动触发" : "手动触发"}
                          <span className={`ml-2 ${h.status === "valid" ? "text-emerald-600" : "text-muted-foreground"}`}>{h.status === "valid" ? "有效" : "已过期"}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{new Date(h.generatedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => loadVersion(h.version)}><ChevronRight className="h-3 w-3 mr-1" />查看</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedule Config Panel */}
      {showSchedule && scheduleConfig && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="h-4 w-4 text-blue-600" />定时自动预测配置</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">状态</p>
                <div className="flex items-center gap-2">
                  <Badge variant={scheduleConfig.enabled ? "default" : "secondary"} className="text-xs">{scheduleConfig.enabled ? "已启用" : "已禁用"}</Badge>
                  <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => scheduleMut.mutate({ enabled: !scheduleConfig.enabled })} disabled={scheduleMut.isPending}>
                    {scheduleConfig.enabled ? "禁用" : "启用"}
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">执行时间 (Cron)</p>
                <p className="text-sm font-mono">{scheduleConfig.cronExpression}</p>
                <p className="text-[10px] text-muted-foreground">每日 UTC 2:00 自动执行</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">上次执行</p>
                {scheduleConfig.lastRunAt ? (
                  <div>
                    <p className="text-sm">{new Date(scheduleConfig.lastRunAt).toLocaleString()}</p>
                    <Badge variant={scheduleConfig.lastRunStatus === "success" ? "default" : scheduleConfig.lastRunStatus === "failed" ? "destructive" : "secondary"} className="text-[10px] mt-0.5">
                      {scheduleConfig.lastRunStatus === "success" ? "成功" : scheduleConfig.lastRunStatus === "failed" ? "失败" : scheduleConfig.lastRunStatus || "未执行"}
                    </Badge>
                  </div>
                ) : (<p className="text-sm text-muted-foreground">尚未执行</p>)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">缓存保留</p>
                <p className="text-sm">{scheduleConfig.retentionDays} 天</p>
              </div>
            </div>
            {scheduleConfig.lastRunError && (
              <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600">{scheduleConfig.lastRunError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {aiMut.isPending && (
        <Card><CardContent className="py-16 text-center">
          <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">正在分析用户行为特征并调用 AI 预测模型...</p>
          <p className="text-xs text-muted-foreground mt-1">预计需要 10–20 秒，请稍候</p>
        </CardContent></Card>
      )}

      {/* Results */}
      {aiResult && !aiMut.isPending && (
        <>
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-600" />分析总结</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{aiResult.summary}</p>
              <p className="text-xs text-muted-foreground mt-2">生成时间: {new Date(aiResult.generatedAt).toLocaleString()}</p>
            </CardContent>
          </Card>

          {aiResult.predictions?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">AI 预测 LTV 曲线 (D30→D365，含置信区间)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={predictionCurveData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: "LTV ($)", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                    <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                    <Legend />
                    {aiResult.predictions.map((pred: any, i: number) => {
                      const colorIdx = compLayers.findIndex((cl: any) => cl.layerId === pred.layerId);
                      const color = LAYER_COLORS[(colorIdx >= 0 ? colorIdx : i) % LAYER_COLORS.length];
                      return [
                        <Area key={`${pred.layerId}_band`} type="monotone" dataKey={`${pred.layerId}_upper`} stroke="none" fill={color} fillOpacity={0.08} name={`${pred.layerName} 上界`} legendType="none" />,
                        <Line key={`${pred.layerId}_pred`} type="monotone" dataKey={`${pred.layerId}_pred`} stroke={color} strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name={`${pred.layerName} 预测`} />,
                        <Line key={`${pred.layerId}_lower`} type="monotone" dataKey={`${pred.layerId}_lower`} stroke={color} strokeWidth={1} strokeDasharray="4 4" dot={false} name={`${pred.layerName} 下界`} legendType="none" />,
                      ];
                    }).flat()}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {aiResult.predictions?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">分层 LTV 预测明细 (D30–D365)</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-muted-foreground">
                    <th className="py-2 text-left">层级</th><th className="text-right">D30</th><th className="text-right">D60</th><th className="text-right">D90</th><th className="text-right">D180</th><th className="text-right">D365</th><th className="text-left pl-4">运营建议</th>
                  </tr></thead>
                  <tbody>
                    {aiResult.predictions.map((pred: any, i: number) => {
                      const colorIdx = compLayers.findIndex((cl: any) => cl.layerId === pred.layerId);
                      const color = LAYER_COLORS[(colorIdx >= 0 ? colorIdx : i) % LAYER_COLORS.length];
                      return (
                        <tr key={pred.layerId} className="border-b hover:bg-muted/50">
                          <td className="py-2 font-medium"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />{pred.layerName}</span></td>
                          <td className="text-right"><span className="font-medium">${pred.d30?.predicted?.toFixed(2)}</span><span className="text-muted-foreground ml-1">({pred.d30?.lower?.toFixed(2)}–{pred.d30?.upper?.toFixed(2)})</span></td>
                          <td className="text-right"><span className="font-medium">${pred.d60?.predicted?.toFixed(2)}</span></td>
                          <td className="text-right"><span className="font-medium">${pred.d90?.predicted?.toFixed(2)}</span></td>
                          <td className="text-right"><span className="font-medium text-indigo-600">${pred.d180?.predicted?.toFixed(2)}</span></td>
                          <td className="text-right"><span className="font-bold text-emerald-600">${pred.d365?.predicted?.toFixed(2)}</span></td>
                          <td className="text-left pl-4 max-w-[300px]"><p className="text-xs text-muted-foreground line-clamp-2">{pred.advice}</p></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {aiResult.factors?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />关键行为因子分析（按重要性排序）</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiResult.factors.map((factor: any, i: number) => {
                    const isPositive = factor.direction === "正向" || factor.direction === "positive";
                    const barColor = isPositive ? "bg-emerald-500" : "bg-red-500";
                    const textColor = isPositive ? "text-emerald-600" : "text-red-600";
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-32 shrink-0">
                          <p className="text-xs font-medium truncate">{factor.factorName}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(factor.importance, 100)}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-8 text-right">{factor.importance}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge variant="outline" className={`text-[10px] ${textColor} border-current mb-1`}>{isPositive ? "↑ 正向" : "↓ 负向"}</Badge>
                          <p className="text-xs text-muted-foreground">{factor.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {aiResult.behaviorFeatures?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">各分层行为特征数据（AI 分析输入）</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-muted-foreground">
                    <th className="py-2 text-left">层级</th><th className="text-right">用户数</th><th className="text-right">人均付费</th><th className="text-right">付费率</th><th className="text-right">广告观看</th><th className="text-right">留存天数</th><th className="text-right">活跃度</th><th className="text-right">流失风险</th><th className="text-right">7日LTV</th><th className="text-right">30日LTV</th>
                  </tr></thead>
                  <tbody>
                    {aiResult.behaviorFeatures.map((f: any, i: number) => {
                      const colorIdx = compLayers.findIndex((cl: any) => cl.layerId === f.layerId);
                      const color = LAYER_COLORS[(colorIdx >= 0 ? colorIdx : i) % LAYER_COLORS.length];
                      return (
                        <tr key={f.layerId} className="border-b hover:bg-muted/50">
                          <td className="py-1.5 font-medium"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />{f.layerName}</span></td>
                          <td className="text-right">{f.userCount.toLocaleString()}</td>
                          <td className="text-right">${f.avgTotalPay.toFixed(2)}</td>
                          <td className="text-right">{f.payRatePct.toFixed(1)}%</td>
                          <td className="text-right">{f.avgAdWatch.toFixed(0)}</td>
                          <td className="text-right">{f.avgRetentionDays.toFixed(0)}天</td>
                          <td className="text-right">{(f.avgActivityScore * 100).toFixed(0)}%</td>
                          <td className={`text-right ${f.avgChurnRiskScore > 0.5 ? 'text-red-600' : 'text-green-600'}`}>{(f.avgChurnRiskScore * 100).toFixed(0)}%</td>
                          <td className="text-right">${f.avgLtv7d.toFixed(2)}</td>
                          <td className="text-right font-medium">${f.avgLtv30d.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!aiResult && !aiMut.isPending && !cacheLoading && (
        <Card><CardContent className="py-16 text-center">
          <Brain className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm text-muted-foreground">{cachedResult ? '点击"加载预测"查看缓存结果，或"强制刷新"生成新预测' : '点击"开始预测"按钮，基于用户行为特征生成 LTV 预测分析'}</p>
          <p className="text-xs text-muted-foreground mt-1">预测结果自动缓存 24 小时，支持历史版本回溯和每日定时更新</p>
        </CardContent></Card>
      )}

      {cacheLoading && !aiResult && (
        <Card><CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">正在检查缓存...</p>
        </CardContent></Card>
      )}
    </div>
  );
}
