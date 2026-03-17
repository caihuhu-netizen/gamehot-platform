import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Sparkles, Calendar, RefreshCw, FileText, Clock, ChevronRight } from "lucide-react";

export default function AiDailyReport() {
  const { currentGameId } = useGame();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const { data: reports, isLoading, refetch } = trpc.alerts.listReports.useQuery({ limit: 30,
  gameId: currentGameId ?? undefined,
});

  const generateMutation = trpc.alerts.generateReport.useMutation({
    onSuccess: (data) => {
      toast.success("AI日报生成成功");
      setSelectedReport(data);
      setGenerating(false);
      refetch();
    },
    onError: (err) => {
      toast.error("生成失败: " + err.message);
      setGenerating(false);
    },
  });

  function handleGenerate() {
    setGenerating(true);
    // gameId is passed via the mutation if the backend supports it
    const today = new Date().toISOString().split("T")[0];
    generateMutation.mutate({ reportDate: today });
  }

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch { return dateStr; }
  }

  const latestReport = selectedReport || (reports && reports.length > 0 ? reports[0] : null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            AI 运营日报
          </h1>
          <p className="text-muted-foreground mt-1">基于当日数据自动生成运营分析摘要，包含关键指标变化和异常说明</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> 生成中...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-1" /> 生成今日日报</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report List - Left sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <FileText className="h-4 w-4" /> 历史日报
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">加载中...</div>
              ) : !reports || reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>暂无日报</p>
                  <p className="text-xs mt-1">点击"生成今日日报"开始</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {(reports as Record<string, unknown>[]).map((report: any) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center justify-between group ${
                        latestReport?.id === report.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{formatDate(report.reportDate)}</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="pt-4 pb-3 px-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">累计日报</span>
                <span className="font-medium">{reports?.length || 0} 份</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">最新日期</span>
                <span className="font-medium">
                  {reports && reports.length > 0 ? formatDate((reports as Record<string, unknown>[])[0].reportDate as string) : "-"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">生成方式</span>
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-0.5" /> AI 自动
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Content - Main area */}
        <div className="lg:col-span-3">
          {latestReport ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {formatDate(latestReport?.reportDate)} 运营日报
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      生成时间: {new Date(latestReport?.createdAt).toLocaleString("zh-CN")}
                      <Badge variant="outline" className="text-xs ml-2">
                        <Sparkles className="h-3 w-3 mr-0.5" /> AI 生成
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Streamdown>{latestReport?.content || latestReport?.summary || "暂无内容"}</Streamdown>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-20 text-center">
                <Sparkles className="h-16 w-16 mx-auto text-amber-500/20 mb-4" />
                <h3 className="text-lg font-medium mb-2">还没有AI日报</h3>
                <p className="text-muted-foreground mb-4">点击右上角"生成今日日报"按钮，AI将自动分析当日运营数据并生成分析报告</p>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? (
                    <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> 生成中...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-1" /> 生成今日日报</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
