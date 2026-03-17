import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Activity, AlertTriangle, CheckCircle2, Clock, FileText, Loader2,
  RefreshCw, Send, Settings, Shield, Sparkles, TrendingUp, XCircle, } from "lucide-react";

const STATUS_CONFIG = {
  healthy: { label: "健康", labelEn: "Healthy", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  warning: { label: "警告", labelEn: "Warning", color: "text-amber-500", bg: "bg-amber-500/10", icon: AlertTriangle },
  critical: { label: "异常", labelEn: "Critical", color: "text-red-500", bg: "bg-red-500/10", icon: XCircle },
  unknown: { label: "未知", labelEn: "Unknown", color: "text-gray-400", bg: "bg-gray-400/10", icon: Activity },
};

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={6} className="text-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export default function InspectionReport() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const { currentGameId } = useGame();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [pushToFeishu, setPushToFeishu] = useState(false);

  const { data: reports, isLoading, refetch } = trpc.inspection.listReports.useQuery({
    gameId: currentGameId ?? undefined,
    limit: 30,
  });

  const { data: config } = trpc.inspection.getConfig.useQuery({
    gameId: currentGameId ?? undefined,
  });

  const runInspection = trpc.inspection.runInspection.useMutation({
    onSuccess: (data) => {
      toast.success(isEn ? "Inspection completed" : "巡检完成");
      setSelectedReport(data);
      refetch();
    },
    onError: (err) => {
      toast.error((isEn ? "Inspection failed: " : "巡检失败: ") + err.message);
    },
  });

  const updateConfig = trpc.inspection.updateConfig.useMutation({
    onSuccess: () => {
      toast.success(isEn ? "Config saved" : "配置已保存");
    },
  });

  const [configForm, setConfigForm] = useState({
    frequency: config?.frequency || "daily",
    pushEnabled: config?.pushEnabled || 0,
    pushChannel: config?.pushChannel || "feishu",
    pushTime: config?.pushTime || "09:00",
  });

  function handleRunInspection() {
    runInspection.mutate({
      gameId: currentGameId ?? undefined,
      pushToFeishu,
    });
  }

  function handleSaveConfig() {
    updateConfig.mutate({
      gameId: currentGameId ?? undefined,
      ...configForm,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {t("inspection.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("inspection.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={pushToFeishu} onCheckedChange={setPushToFeishu} />
            <span>{isEn ? "Push to Feishu" : "推送飞书"}</span>
          </label>
          <Button onClick={handleRunInspection} disabled={runInspection.isPending}>
            {runInspection.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("inspection.generating")}</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />{t("inspection.generateReport")}</>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-1.5" />
            {t("inspection.reportList")}
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-1.5" />
            {t("inspection.inspectionConfig")}
          </TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4 space-y-4">
          {/* Selected report detail */}
          {selectedReport && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{t("inspection.reportDetail")}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
                    {t("common.close")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Score + Status */}
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ScoreRing score={selectedReport.overallScore} />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const cfg = STATUS_CONFIG[selectedReport.overallStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;
                        const Icon = cfg.icon;
                        return (
                          <Badge className={`${cfg.bg} ${cfg.color} border-0 text-sm px-3 py-1`}>
                            <Icon className="h-4 w-4 mr-1" />
                            {isEn ? cfg.labelEn : cfg.label}
                          </Badge>
                        );
                      })()}
                    </div>
                    {/* Module scores */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(selectedReport.moduleScores || []).map((m: any) => {
                        const cfg = STATUS_CONFIG[m.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;
                        return (
                          <div key={m.module} className={`rounded-lg p-2 ${cfg.bg}`}>
                            <p className="text-xs text-muted-foreground">{m.name}</p>
                            <p className={`text-lg font-bold ${cfg.color}`}>{m.score}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Anomalies */}
                {selectedReport.anomalies?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      {t("inspection.anomalies")} ({selectedReport.anomalies.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedReport.anomalies.map((a: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{a.module}</p>
                            <p className="text-xs text-muted-foreground">{a.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Report Content */}
                {selectedReport.reportContent && (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <Streamdown>{selectedReport.reportContent}</Streamdown>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Report list */}
          <div className="grid gap-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : reports?.length ? (
              reports.map((report: any) => {
                const cfg = STATUS_CONFIG[report.overallStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;
                const Icon = cfg.icon;
                return (
                  <Card key={report.id} className="cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setSelectedReport(report)}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-full ${cfg.bg} flex items-center justify-center`}>
                          <span className={`text-lg font-bold ${cfg.color}`}>{report.overallScore}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{report.reportDate}</p>
                            <Badge variant="outline" className={`${cfg.color} text-xs`}>
                              <Icon className="h-3 w-3 mr-1" />
                              {isEn ? cfg.labelEn : cfg.label}
                            </Badge>
                            {report.pushStatus === "sent" && (
                              <Badge variant="outline" className="text-xs text-blue-500">
                                <Send className="h-3 w-3 mr-1" />
                                {isEn ? "Pushed" : "已推送"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {report.createdAt ? new Date(report.createdAt).toLocaleString() : ""}
                            {report.anomalies && Array.isArray(report.anomalies) && report.anomalies.length > 0 &&
                              ` · ${report.anomalies.length} ${isEn ? "anomalies" : "个异常"}`}
                          </p>
                        </div>
                        <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">{isEn ? "No inspection reports yet" : "暂无巡检报告"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{isEn ? "Click 'Run Inspection' to generate your first report" : "点击\"立即巡检\"生成第一份报告"}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("inspection.inspectionConfig")}</CardTitle>
              <CardDescription>
                {isEn ? "Configure automatic inspection frequency and push settings" : "配置自动巡检频率和推送设置"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("inspection.frequency")}</Label>
                  <Select value={configForm.frequency} onValueChange={(v) => setConfigForm(f => ({ ...f, frequency: v as "daily" | "weekly" | "monthly" }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t("inspection.daily")}</SelectItem>
                      <SelectItem value="weekly">{t("inspection.weekly")}</SelectItem>
                      <SelectItem value="monthly">{t("inspection.monthly")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isEn ? "Push Time" : "推送时间"}</Label>
                  <Input type="time" value={configForm.pushTime}
                    onChange={(e) => setConfigForm(f => ({ ...f, pushTime: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("inspection.pushChannel")}</Label>
                  <Select value={configForm.pushChannel} onValueChange={(v) => setConfigForm(f => ({ ...f, pushChannel: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feishu">{t("inspection.feishu")}</SelectItem>
                      <SelectItem value="email">{t("inspection.email")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={configForm.pushEnabled === 1}
                    onCheckedChange={(v) => setConfigForm(f => ({ ...f, pushEnabled: v ? 1 : 0 }))} />
                  <Label>{isEn ? "Enable Auto Push" : "启用自动推送"}</Label>
                </div>
              </div>
              <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
                {updateConfig.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {t("common.save")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
