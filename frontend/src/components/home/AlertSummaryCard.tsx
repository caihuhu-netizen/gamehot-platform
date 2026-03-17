import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, CircleAlert, ArrowUpRight } from "lucide-react";
import { fmtDateShort } from "@/lib/dateFormat";

interface AlertSummaryProps {
  alertSummary: {
    activeCount: number;
    criticalCount: number;
    typeBreakdown: Array<{ alert_type: string; count: number; critical: number }>;
    recentAlerts: Array<{
      id: number;
      severity: string;
      description?: string;
      metric_name?: string;
      alert_date: string | number;
      deviation_percent: number;
    }>;
  };
  onViewAll: () => void;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  revenue_drop: "↓ 收入下降",
  revenue_spike: "↑ 收入异常上升",
  retention_drop: "↓ 留存下降",
  cpi_spike: "↑ CPI异常",
  fill_rate_drop: "↓ 填充率下降",
};

export function AlertSummaryCard({ alertSummary, onViewAll }: AlertSummaryProps) {
  if (!alertSummary || (alertSummary.activeCount === 0 && alertSummary.criticalCount === 0)) {
    return null;
  }

  return (
    <Card className={alertSummary.criticalCount > 0 ? "border-red-300 bg-red-50/50" : "border-amber-300 bg-amber-50/50"}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${alertSummary.criticalCount > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">异常告警摘要</h3>
              <p className="text-xs text-muted-foreground">
                {alertSummary?.activeCount} 条活跃告警
                {alertSummary.criticalCount > 0 && <span className="text-red-600 font-medium"> · {alertSummary?.criticalCount} 条严重</span>}
              </p>
            </div>
          </div>
          <button onClick={onViewAll} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
            查看全部 <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        {alertSummary.typeBreakdown.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {alertSummary.typeBreakdown.map((t: { alert_type: string; count: number; critical: number }) => (
              <Badge key={t.alert_type} variant={Number(t.critical) > 0 ? "destructive" : "secondary"} className="text-xs">
                {ALERT_TYPE_LABELS[t.alert_type] || t.alert_type} {t.count}
              </Badge>
            ))}
          </div>
        )}

        {alertSummary.recentAlerts.length > 0 && (
          <div className="space-y-1.5">
            {alertSummary.recentAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="flex items-center gap-2 text-xs bg-white/70 rounded px-2.5 py-1.5">
                <CircleAlert className={`h-3.5 w-3.5 shrink-0 ${alert.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                <span className="truncate flex-1">{alert.description || alert.metric_name}</span>
                <span className="text-muted-foreground shrink-0">{fmtDateShort(alert.alert_date)}</span>
                <span className={`font-mono shrink-0 ${Number(alert.deviation_percent) < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                  {Number(alert.deviation_percent) > 0 ? '+' : ''}{Number(alert.deviation_percent).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
