import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, FileText, Send, Clock, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
function fmt(val: number) {
  const { currentGameId } = useGame(); return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

// ==================== 日报详情卡片 ====================
function ReportCard({ report }: { report: any }) {
  const [expanded, setExpanded] = useState(false);
  const sendMut = trpc.dailyReport.sendNotification.useMutation({
    onSuccess: () => toast.success("日报已推送"),
    onError: () => toast.error("推送失败"),
  });

  const kpi = report.kpiSnapshot;
  const highlights = report.highlights || [];
  const anomalies = report.anomalies || [];
  const recommendations = report.recommendations || [];

  const trendIcon = (t: string) => t === "up" ? <TrendingUp className="w-3 h-3 text-green-500" /> : t === "down" ? <TrendingDown className="w-3 h-3 text-red-500" /> : null;
  const severityColor = (s: string) => s === "high" ? "text-red-500 bg-red-50 dark:bg-red-950" : s === "medium" ? "text-orange-500 bg-orange-50 dark:bg-orange-950" : "text-yellow-600 bg-yellow-50 dark:bg-yellow-950";
  const priorityBadge = (p: string) => p === "high" ? "destructive" : p === "medium" ? "default" : "secondary";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">{new Date(report.reportDate).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}</CardTitle>
            <Badge variant={report.status === "SENT" ? "default" : "secondary"} className="text-[10px]">
              {report.status === "SENT" ? "已推送" : report.status === "GENERATED" ? "已生成" : report.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {report.status !== "SENT" && (
              <Button size="sm" variant="outline" onClick={() => sendMut.mutate({ id: report.id })} disabled={sendMut.isPending}>
                <Send className="w-3 h-3 mr-1" /> {sendMut.isPending ? "推送中..." : "推送通知"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 摘要 */}
        <p className="text-sm text-muted-foreground mb-3">{report.summary}</p>

        {/* KPI 快照 */}
        {kpi && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950 text-center">
              <div className="text-[10px] text-muted-foreground">总收入</div>
              <div className="text-sm font-bold text-green-600">{fmt(kpi.totalRevenue || 0)}</div>
            </div>
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950 text-center">
              <div className="text-[10px] text-muted-foreground">总成本</div>
              <div className="text-sm font-bold text-red-500">{fmt(kpi.totalCost || 0)}</div>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-center">
              <div className="text-[10px] text-muted-foreground">净利润</div>
              <div className={`text-sm font-bold ${(kpi.profit || 0) >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(kpi.profit || 0)}</div>
            </div>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-center">
              <div className="text-[10px] text-muted-foreground">利润率</div>
              <div className="text-sm font-bold">{(kpi.margin || 0).toFixed(1)}%</div>
            </div>
          </div>
        )}

        {expanded && (
          <div className="space-y-3 mt-3 border-t pt-3">
            {/* 亮点 */}
            {highlights.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><Sparkles className="w-3.5 h-3.5 text-yellow-500" /> 数据亮点</h4>
                <div className="grid grid-cols-2 gap-2">
                  {highlights.map((h: any, i: number) => (
                    <div key={i} className="p-2 rounded-lg border flex items-center gap-2">
                      {trendIcon(h.trend)}
                      <div>
                        <div className="text-xs text-muted-foreground">{h.title}</div>
                        <div className="text-sm font-medium">{h.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 异常 */}
            {anomalies.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> 数据异常</h4>
                <div className="space-y-1">
                  {anomalies.map((a: any, i: number) => (
                    <div key={i} className={`p-2 rounded-lg text-sm ${severityColor(a.severity)}`}>
                      <span className="font-medium">{a.metric}:</span> {a.description}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 建议 */}
            {recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><Lightbulb className="w-3.5 h-3.5 text-blue-500" /> 运营建议</h4>
                <div className="space-y-1">
                  {recommendations.map((r: any, i: number) => (
                    <div key={i} className="p-2 rounded-lg border flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.description}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={priorityBadge(r.priority) as "default" | "secondary" | "destructive" | "outline"} className="text-[10px]">{r.priority}</Badge>
                        <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 生成信息 */}
            <div className="text-[10px] text-muted-foreground flex items-center gap-2 pt-2 border-t">
              <Clock className="w-3 h-3" />
              生成耗时: {report.generationDurationMs ? `${(report.generationDurationMs / 1000).toFixed(1)}s` : "-"}
              {report.sentAt && <span> | 推送时间: {new Date(report.sentAt).toLocaleString()}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 主页面 ====================
export default function DailyReportPage() {
  const { currentGameId } = useGame();
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const { data: reports = [], isLoading } = trpc.dailyReport.list.useQuery({ limit: 30,
  gameId: currentGameId ?? undefined,
});
  const generateMut = trpc.dailyReport.generate.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "日报生成成功");
      utils.dailyReport.list.invalidate();
    },
    onError: (err) => toast.error(`生成失败: ${err.message}`),
  });
  const utils = trpc.useUtils();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> AI 运营日报
          </h2>
          <p className="text-sm text-muted-foreground">基于 LLM 自动汇总每日 KPI、检测异常、生成运营建议</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="w-40" />
          <Button onClick={() => generateMut.mutate({ reportDate })} disabled={generateMut.isPending}>
            {generateMut.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> 生成中...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-1" /> 生成日报</>
            )}
          </Button>
        </div>
      </div>

      {/* 日报列表 */}
      {isLoading ? (
        <div className="text-muted-foreground text-sm py-8 text-center">加载中...</div>
      ) : reports.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">暂无日报</p>
          <p className="text-sm mt-1">选择日期并点击"生成日报"，AI 将自动汇总当日运营数据</p>
          <p className="text-xs mt-2 text-muted-foreground/60">数据来源：IAP 收入 + 广告收入 + 获客成本 + 运营成本</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r: any) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
