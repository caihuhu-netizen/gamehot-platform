import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { DollarSign, Sparkles, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Lightbulb, CheckCircle2, Clock, Loader2,
  ArrowUpRight, ArrowDownRight, Shield, PlayCircle, BarChart3, } from "lucide-react";
import { toast } from "sonner";
export default function PricingEngine() {
  const { currentGameId } = useGame();
  const [productType, setProductType] = useState<"iap" | "subscription" | "ad_removal">("iap");
  const [isGenerating, setIsGenerating] = useState(false);
  const [latestAdvice, setLatestAdvice] = useState<any>(null);

  const [simAdjustments, setSimAdjustments] = useState<Record<string, number>>({});
  const [simResult, setSimResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // 获取分层特征
  const { data: features, isLoading: featuresLoading } = trpc.pricingEngine.getLayerFeatures.useQuery({ gameId: currentGameId ?? undefined });
  // 获取收入基线
  const { data: revenueBaseline, isLoading: baselineLoading } = trpc.pricingEngine.getRevenueBaseline.useQuery({ gameId: currentGameId ?? undefined });
  // 获取付费分布
  const { data: paymentDist } = trpc.pricingEngine.getPaymentDistribution.useQuery({ gameId: currentGameId ?? undefined });
  // 获取策略列表
  const { data: strategies, isLoading: strategiesLoading, refetch: refetchStrategies } = trpc.pricingEngine.listStrategies.useQuery({ gameId: currentGameId ?? undefined });
  // 获取推荐列表
  const { data: recommendations, refetch: refetchRecommendations } = trpc.pricingEngine.listRecommendations.useQuery({ gameId: currentGameId ?? undefined });

  // 生成定价建议
  const generateMutation = trpc.pricingEngine.generatePricingAdvice.useMutation({
    onSuccess: (data) => {
      setLatestAdvice(data.advice);
      refetchStrategies();
      refetchRecommendations();
      toast.success("AI 定价建议已生成");
    },
    onError: (err) => toast.error("生成失败: " + err.message),
    onSettled: () => setIsGenerating(false),
  });

  // 定价效果模拟
  const simulateMutation = trpc.pricingEngine.simulatePricing.useMutation({
    onSuccess: (data) => {
      setSimResult(data);
      toast.success("模拟完成");
    },
    onError: (err) => toast.error("模拟失败: " + err.message),
    onSettled: () => setIsSimulating(false),
  });

  const handleSimulate = () => {
    if (!revenueBaseline?.length) {
      toast.error("没有收入基线数据");
      return;
    }
    const adjustments = revenueBaseline.map((b: Record<string,unknown>) => ({
      layerLevel: b.segmentLevel || "L0",
      layerName: b.layerName || b.segmentLevel || "Unknown",
      priceChangePercent: simAdjustments[b.segmentLevel] || 0,
    })).filter((a: Record<string,unknown>) => a.priceChangePercent !== 0);
    if (!adjustments.length) {
      toast.error("请至少调整一个层级的价格");
      return;
    }
    setIsSimulating(true);
    simulateMutation.mutate({ adjustments });
  };

  // 更新策略状态
  const updateStatusMutation = trpc.pricingEngine.updateStrategyStatus.useMutation({
    onSuccess: () => {
      refetchStrategies();
      toast.success("策略状态已更新");
    },
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    generateMutation.mutate({ productType });
  };

  const strategyIcon = (s: string) => {
    if (s === "aggressive") return <TrendingUp className="h-3.5 w-3.5 text-red-500" />;
    if (s === "conservative") return <Shield className="h-3.5 w-3.5 text-blue-500" />;
    return <Minus className="h-3.5 w-3.5 text-yellow-500" />;
  };

  const strategyLabel = (s: string) => {
    if (s === "aggressive") return "激进";
    if (s === "conservative") return "保守";
    return "稳健";
  };

  const productTypeLabel: Record<string, string> = {
    iap: "内购道具",
    subscription: "订阅服务",
    ad_removal: "去广告",
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            智能定价引擎
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            基于用户分层数据，AI 自动生成个性化定价策略，最大化各层级 ARPU
          </p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            AI 定价生成
          </TabsTrigger>
          <TabsTrigger value="strategies">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            策略管理
          </TabsTrigger>
          <TabsTrigger value="simulate">
            <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
            效果模拟
          </TabsTrigger>
          <TabsTrigger value="data">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            数据基础
          </TabsTrigger>
        </TabsList>

        {/* AI 定价生成 Tab */}
        <TabsContent value="generate" className="space-y-4">
          {/* 配置区域 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">生成配置</CardTitle>
              <CardDescription>选择产品类型，AI 将基于各分层用户的付费行为数据生成个性化定价建议</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <label className="text-xs text-muted-foreground mb-1.5 block">产品类型</label>
                  <Select value={productType} onValueChange={(v: any) => setProductType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iap">内购道具</SelectItem>
                      <SelectItem value="subscription">订阅服务</SelectItem>
                      <SelectItem value="ad_removal">去广告</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-5">
                  <Button onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        AI 分析中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        生成定价建议
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 加载状态 */}
          {isGenerating && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm font-medium">AI 正在分析各分层用户付费数据...</p>
                <p className="text-xs text-muted-foreground mt-1">预计需要 10-20 秒，请耐心等待</p>
              </CardContent>
            </Card>
          )}

          {/* 定价建议结果 */}
          {latestAdvice && !isGenerating && (
            <div className="space-y-4">
              {/* 概述 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI 定价建议
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      置信度 {Math.round((latestAdvice.overallConfidence || 0) * 100)}%
                    </Badge>
                  </div>
                  <CardDescription>{latestAdvice.summary}</CardDescription>
                </CardHeader>
              </Card>

              {/* 分层定价推荐 */}
              <div className="grid gap-3">
                {latestAdvice.recommendations?.map((rec: any, i: number) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            L{rec.layerLevel}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{rec.layerName}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{rec.reasoning}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {strategyIcon(rec.strategy)}
                          <Badge variant="secondary" className="text-xs">
                            {strategyLabel(rec.strategy)}
                          </Badge>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-xs text-muted-foreground">当前均价</div>
                          <div className="text-sm font-medium mt-0.5">{rec.currentAvgPrice}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">建议价格</div>
                          <div className="text-sm font-bold text-primary mt-0.5">{rec.recommendedPrice}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">价格变化</div>
                          <div className={`text-sm font-medium mt-0.5 flex items-center justify-center gap-0.5 ${
                            rec.priceChangePercent?.startsWith("+") ? "text-green-600" : rec.priceChangePercent?.startsWith("-") ? "text-red-500" : ""
                          }`}>
                            {rec.priceChangePercent?.startsWith("+") ? <ArrowUpRight className="h-3 w-3" /> : rec.priceChangePercent?.startsWith("-") ? <ArrowDownRight className="h-3 w-3" /> : null}
                            {rec.priceChangePercent}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">预期收入影响</div>
                          <div className={`text-sm font-medium mt-0.5 ${
                            rec.expectedRevenueImpact?.startsWith("+") ? "text-green-600" : "text-red-500"
                          }`}>
                            {rec.expectedRevenueImpact}
                          </div>
                        </div>
                      </div>

                      {rec.pricePoints?.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">推荐价格档位:</span>
                          {rec.pricePoints.map((p: string, j: number) => (
                            <Badge key={j} variant="outline" className="text-xs">
                              ${p}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 关键洞察 & 风险提示 */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      关键洞察
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {latestAdvice.keyInsights?.map((insight: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      风险提示
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {latestAdvice.riskWarnings?.map((warning: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-orange-500 mt-0.5">⚠</span>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 策略管理 Tab */}
        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">策略列表</CardTitle>
              <CardDescription>管理已生成的定价策略，可激活、暂停或归档</CardDescription>
            </CardHeader>
            <CardContent>
              {!strategies?.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  暂无策略记录，请先在"AI 定价生成"中生成定价建议
                </div>
              ) : (
                <div className="space-y-3">
                  {(strategies ?? []).map((s: Record<string,unknown>) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(s.createdAt).toLocaleString("zh-CN")}
                            {s.confidenceScore && (
                              <Badge variant="outline" className="text-[10px] h-4">
                                置信度 {Math.round(Number(s.confidenceScore) * 100)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          s.status === "active" ? "default" :
                          s.status === "draft" ? "secondary" :
                          "outline"
                        }>
                          {s.status === "active" ? "已激活" : s.status === "draft" ? "草稿" : s.status === "paused" ? "已暂停" : "已归档"}
                        </Badge>
                        {s.status === "draft" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => updateStatusMutation.mutate({ id: s.id, status: "active" })}>
                            激活
                          </Button>
                        )}
                        {s.status === "active" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => updateStatusMutation.mutate({ id: s.id, status: "paused" })}>
                            暂停
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 效果模拟 Tab */}
        <TabsContent value="simulate" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-primary" />
                定价效果模拟
              </CardTitle>
              <CardDescription>调整各分层的价格变动百分比，AI 将预测收入变化曲线和用户流失风险</CardDescription>
            </CardHeader>
            <CardContent>
              {!revenueBaseline?.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm">暂无收入基线数据</div>
              ) : (
                <div className="space-y-4">
                  {revenueBaseline.map((b: Record<string,unknown>) => {
                    const level = b.segmentLevel;
                    const val = simAdjustments[level] || 0;
                    return (
                      <div key={level} className="flex items-center gap-4 p-3 rounded-lg border">
                        <div className="w-24 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{level}</Badge>
                          <span className="text-xs truncate">{b.layerName}</span>
                        </div>
                        <div className="flex-1">
                          <Slider
                            value={[val]}
                            min={-50}
                            max={50}
                            step={5}
                            onValueChange={([v]) => setSimAdjustments(prev => ({ ...prev, [level]: v }))}
                          />
                        </div>
                        <div className="w-20 flex items-center gap-1">
                          <Input
                            type="number"
                            value={val}
                            onChange={(e) => setSimAdjustments(prev => ({ ...prev, [level]: Number(e.target.value) }))}
                            className="h-8 text-xs text-center"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        <div className="w-28 text-right">
                          <div className="text-xs text-muted-foreground">当前收入</div>
                          <div className="text-sm font-medium">¥{Number(b.totalRevenue || 0).toFixed(0)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-end">
                    <Button onClick={handleSimulate} disabled={isSimulating}>
                      {isSimulating ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />模拟中...</>
                      ) : (
                        <><BarChart3 className="h-4 w-4 mr-2" />开始模拟</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 模拟结果 */}
          {isSimulating && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm font-medium">AI 正在分析价格弹性和收入影响...</p>
                <p className="text-xs text-muted-foreground mt-1">预计需要 10-20 秒</p>
              </CardContent>
            </Card>
          )}

          {simResult && !isSimulating && (
            <div className="space-y-4">
              {/* 概述 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">模拟结果</CardTitle>
                    <Badge variant={simResult.totalRevenueChange?.startsWith("+") ? "default" : "destructive"} className="text-sm">
                      总收入变化 {simResult.totalRevenueChange}
                    </Badge>
                  </div>
                  <CardDescription>{simResult.summary}</CardDescription>
                </CardHeader>
              </Card>

              {/* 分层结果 */}
              <div className="grid gap-3">
                {simResult.layerResults?.map((lr: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {lr.layerLevel}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{lr.layerName}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{lr.reasoning}</div>
                          </div>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-xs text-muted-foreground">价格变动</div>
                          <div className={`text-sm font-medium mt-0.5 ${lr.priceChangePercent > 0 ? "text-green-600" : lr.priceChangePercent < 0 ? "text-red-500" : ""}`}>
                            {lr.priceChangePercent > 0 ? "+" : ""}{lr.priceChangePercent}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">价格弹性</div>
                          <div className="text-sm font-medium mt-0.5">{lr.elasticity?.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">转化率变化</div>
                          <div className="text-sm font-medium mt-0.5">{lr.conversionRateChange}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">收入变化</div>
                          <div className={`text-sm font-bold mt-0.5 ${lr.revenueChange?.startsWith("+") ? "text-green-600" : "text-red-500"}`}>
                            {lr.revenueChange}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">流失风险:</span>
                        <Badge variant={lr.churnRisk === "low" ? "secondary" : lr.churnRisk === "high" ? "destructive" : "outline"} className="text-xs">
                          {lr.churnRisk === "low" ? "低" : lr.churnRisk === "high" ? "高" : "中"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 12个月收入预测曲线 */}
              {simResult.monthlyProjection?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      12个月收入预测曲线
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-muted-foreground/50 rounded" />
                          基线收入
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-primary rounded" />
                          预测收入
                        </div>
                      </div>
                      {simResult.monthlyProjection.map((mp: Record<string,unknown>) => {
                        const maxVal = Math.max(...simResult.monthlyProjection.map((p: Record<string,unknown>) => Math.max(p.baselineRevenue, p.projectedRevenue)));
                        const baseW = maxVal > 0 ? (mp.baselineRevenue / maxVal) * 100 : 0;
                        const projW = maxVal > 0 ? (mp.projectedRevenue / maxVal) * 100 : 0;
                        const diff = mp.projectedRevenue - mp.baselineRevenue;
                        return (
                          <div key={mp.month} className="flex items-center gap-3">
                            <div className="w-12 text-xs text-muted-foreground text-right">第{mp.month}月</div>
                            <div className="flex-1 space-y-0.5">
                              <div className="h-2 rounded-full bg-muted-foreground/20" style={{ width: `${baseW}%` }} />
                              <div className={`h-2 rounded-full ${diff >= 0 ? "bg-primary" : "bg-red-400"}`} style={{ width: `${projW}%` }} />
                            </div>
                            <div className="w-20 text-right">
                              <div className={`text-xs font-medium ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
                                {diff >= 0 ? "+" : ""}{diff.toFixed(0)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 风险评估 */}
              {simResult.riskAssessment && (
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        风险提示
                        <Badge variant={simResult.riskAssessment.overallRisk === "low" ? "secondary" : simResult.riskAssessment.overallRisk === "high" ? "destructive" : "outline"} className="text-xs">
                          {simResult.riskAssessment.overallRisk === "low" ? "低风险" : simResult.riskAssessment.overallRisk === "high" ? "高风险" : "中风险"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5">
                        {simResult.riskAssessment.warnings?.map((w: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-orange-500 mt-0.5">⚠</span>{w}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-green-500" />
                        机会点
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5">
                        {simResult.riskAssessment.opportunities?.map((o: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-green-500 mt-0.5">✓</span>{o}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* 数据基础 Tab */}
        <TabsContent value="data" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">各分层付费特征</CardTitle>
                <CardDescription>各层级用户的平均付费金额、付费率等核心指标</CardDescription>
              </CardHeader>
              <CardContent>
                {!features?.length ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">暂无数据</div>
                ) : (
                  <div className="space-y-2">
                    {features.map((f: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded border text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">L{f.layerLevel}</Badge>
                          <span>{f.layerName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>用户数: {f.userCount}</span>
                          <span>均付费: ¥{Number(f.avgPayment || 0).toFixed(1)}</span>
                          <span>付费率: {Number(f.payRate || 0).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">各分层付费分布</CardTitle>
                <CardDescription>各层级的付费金额区间分布</CardDescription>
              </CardHeader>
              <CardContent>
                {!paymentDist?.length ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">暂无数据</div>
                ) : (
                  <div className="space-y-2">
                    {paymentDist.map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded border text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">L{d.layerLevel}</Badge>
                          <span>{d.layerName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>总付费: ¥{Number(d.totalRevenue || 0).toFixed(0)}</span>
                          <span>笔数: {d.txCount}</span>
                          <span>均单价: ¥{Number(d.avgOrderValue || 0).toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
