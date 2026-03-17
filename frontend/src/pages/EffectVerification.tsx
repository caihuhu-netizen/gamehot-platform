import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileCheck2, Loader2, Sparkles, TrendingUp, TrendingDown, Minus,
  Calendar, BarChart3, ArrowRight, Rocket, AlertTriangle
} from "lucide-react";

const verdictLabels: Record<string, { label: string; icon: typeof TrendingUp; color: string; bg: string }> = {
  positive: { label: "正向", icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
  negative: { label: "负向", icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10" },
  neutral: { label: "中性", icon: Minus, color: "text-amber-500", bg: "bg-amber-500/10" },
  inconclusive: { label: "数据不足", icon: AlertTriangle, color: "text-muted-foreground", bg: "bg-muted" },
};

export default function EffectVerification() {
  const { currentGame } = useGame();
  const gameId = currentGame?.id ?? 0;
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const reports = trpc.productOptimization.effects.list.useQuery(
    { gameId, limit: 50 },
    { enabled: !!gameId }
  );

  const versions = trpc.productOptimization.versions.list.useQuery(
    { gameId, limit: 100 },
    { enabled: !!gameId }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-primary" /> 效果验证
          </h1>
          <p className="text-muted-foreground mt-1">验证每次产品更新的实际效果，用数据说话</p>
        </div>
        <Button onClick={() => setShowGenerate(true)} disabled={!gameId}>
          <Sparkles className="h-4 w-4 mr-2" />生成验证报告
        </Button>
      </div>

      {!gameId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">请先在顶部选择一个游戏项目</CardContent></Card>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(verdictLabels).map(([key, v]) => {
              const VIcon = v.icon;
              const count = reports.data?.filter((r: any) => r.verdict === key).length ?? 0;
              return (
                <Card key={key}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${v.bg}`}><VIcon className={`h-5 w-5 ${v.color}`} /></div>
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{v.label}验证</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Report List */}
          {reports.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary/60" /></div>
          ) : (reports.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileCheck2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">暂无验证报告</p>
                <p className="text-sm">选择两个版本生成效果验证报告，AI 将自动分析指标变化</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(reports.data ?? []).map((r: any) => {
                const v = verdictLabels[r.verdict] || verdictLabels.inconclusive;
                const VIcon = v.icon;
                return (
                  <Card key={r.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedReport(r)}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${v.bg}`}><VIcon className={`h-5 w-5 ${v.color}`} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{r.title || `版本效果报告 #${r.id}`}</h3>
                            <Badge className={`${v.bg} ${v.color}`} variant="secondary">{v.label}</Badge>
                            {r.confidenceScore && (
                              <Badge variant="outline">置信度 {(r.confidenceScore * 100).toFixed(0)}%</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Rocket className="h-3 w-3" />
                              v{r.baseVersionCode || "?"} → v{r.compareVersionCode || "?"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                            </span>
                          </div>
                          {r.summary && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.summary}</p>}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Generate Dialog */}
          <GenerateReportDialog
            open={showGenerate}
            onClose={() => setShowGenerate(false)}
            gameId={gameId}
            versions={versions.data ?? []}
            onSuccess={() => { setShowGenerate(false); reports.refetch(); }}
          />

          {/* Detail Dialog */}
          <ReportDetailDialog report={selectedReport} open={!!selectedReport} onClose={() => setSelectedReport(null)} />
        </>
      )}
    </div>
  );
}

function GenerateReportDialog({ open, onClose, gameId, versions, onSuccess }: {
  open: boolean; onClose: () => void; gameId: number; versions: Array<{ id: number; versionCode: string; [key: string]: unknown }>; onSuccess: () => void;
}) {
  const [baseVersionId, setBaseVersionId] = useState<string>("");
  const [compareVersionId, setCompareVersionId] = useState<string>("");

  const generate = trpc.productOptimization.effects.analyzeVersion.useMutation({
    onSuccess: () => { toast.success("效果验证报告已生成"); onSuccess(); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>生成效果验证报告</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">选择基准版本和对比版本，AI 将自动分析两个版本之间的核心指标变化并给出结论。</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">基准版本（旧）</label>
              <Select value={baseVersionId} onValueChange={setBaseVersionId}>
                <SelectTrigger><SelectValue placeholder="选择版本" /></SelectTrigger>
                <SelectContent>
                  {versions.map((v: any) => (
                    <SelectItem key={v.id} value={String(v.id)}>v{v.versionCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">对比版本（新）</label>
              <Select value={compareVersionId} onValueChange={setCompareVersionId}>
                <SelectTrigger><SelectValue placeholder="选择版本" /></SelectTrigger>
                <SelectContent>
                  {versions.map((v: any) => (
                    <SelectItem key={v.id} value={String(v.id)}>v{v.versionCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            onClick={() => {
              const baseV = versions.find((v: any) => String(v.id) === baseVersionId);
              const compV = versions.find((v: any) => String(v.id) === compareVersionId);
              const today = new Date().toISOString().slice(0, 10);
              const weekAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
              generate.mutate({
                gameId,
                versionId: Number(compareVersionId),
                baseVersionCode: baseV?.versionCode || "",
                compVersionCode: compV?.versionCode || "",
                baselineStartDate: weekAgo,
                baselineEndDate: today,
                comparisonStartDate: weekAgo,
                comparisonEndDate: today,
              });
            }}
            disabled={!baseVersionId || !compareVersionId || baseVersionId === compareVersionId || generate.isPending}
          >
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            生成报告
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReportDetailDialog({ report, open, onClose }: { report: any; open: boolean; onClose: () => void }) {
  if (!report) return null;
  const v = verdictLabels[report.verdict] || verdictLabels.inconclusive;
  const VIcon = v.icon;

  return (
    <Dialog open={open} onOpenChange={val => { if (!val) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <VIcon className={`h-5 w-5 ${v.color}`} />
            {report.title || `版本效果报告 #${report.id}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={`${v.bg} ${v.color}`} variant="secondary">{v.label}</Badge>
            {report.confidenceScore && <Badge variant="outline">置信度 {(report.confidenceScore * 100).toFixed(0)}%</Badge>}
            <span className="text-sm text-muted-foreground">
              v{report.baseVersionCode || "?"} → v{report.compareVersionCode || "?"}
            </span>
          </div>

          {report.summary && (
            <div>
              <h4 className="text-sm font-medium mb-1">总结</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.summary}</p>
            </div>
          )}

          {report.metricsComparison && (
            <div>
              <h4 className="text-sm font-medium mb-2">指标对比</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(report.metricsComparison).map(([key, val]: [string, any]) => (
                  <Card key={key}>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">{key}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{val?.before ?? "-"}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-semibold">{val?.after ?? "-"}</span>
                        {val?.change !== undefined && (
                          <Badge variant="outline" className={val.change > 0 ? "text-green-500" : val.change < 0 ? "text-red-500" : ""}>
                            {val.change > 0 ? "+" : ""}{typeof val.change === "number" ? val.change.toFixed(2) : val.change}%
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {report.analysis && (
            <div>
              <h4 className="text-sm font-medium mb-1">详细分析</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.analysis}</p>
            </div>
          )}

          {report.recommendations && (
            <div>
              <h4 className="text-sm font-medium mb-1">后续建议</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.recommendations}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
