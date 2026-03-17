import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowUpRight } from "lucide-react";
import { fmtDate } from "@/lib/dateFormat";

interface KpiSnapshot {
  dau?: number;
  arpdau?: number;
  revenue?: number;
  retention_d1?: number;
}

interface DailyReport {
  reportDate: string | Date;
  status: string;
  kpiSnapshot?: KpiSnapshot;
  summary?: string;
}

interface DailyReportCardProps {
  report: DailyReport;
  onViewAll: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  DRAFT: "bg-amber-100 text-amber-700",
  GENERATING: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "已发布",
  DRAFT: "草稿",
  GENERATING: "生成中",
};

export function DailyReportCard({ report, onViewAll }: DailyReportCardProps) {
  return (
    <Card className="border-indigo-200/50 bg-gradient-to-r from-indigo-50/30 to-violet-50/30">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">最新日报摘要</h3>
              <p className="text-xs text-muted-foreground">
                {fmtDate(report.reportDate)}
                <Badge variant="secondary" className={`ml-2 text-[10px] px-1.5 py-0 ${STATUS_COLORS[report.status] || ''}`}>
                  {STATUS_LABELS[report.status] || report.status}
                </Badge>
              </p>
            </div>
          </div>
          <button onClick={onViewAll} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
            查看全部 <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/70 rounded-lg px-3 py-2">
            <p className="text-[10px] text-muted-foreground">DAU</p>
            <p className="text-lg font-bold text-blue-600">{Number(report.kpiSnapshot?.dau ?? 0).toLocaleString()}</p>
          </div>
          <div className="bg-white/70 rounded-lg px-3 py-2">
            <p className="text-[10px] text-muted-foreground">ARPDAU</p>
            <p className="text-lg font-bold text-emerald-600">${Number(report.kpiSnapshot?.arpdau ?? 0).toFixed(2)}</p>
          </div>
          <div className="bg-white/70 rounded-lg px-3 py-2">
            <p className="text-[10px] text-muted-foreground">当日收入</p>
            <p className="text-lg font-bold text-violet-600">${Number(report.kpiSnapshot?.revenue ?? 0).toLocaleString()}</p>
          </div>
          <div className="bg-white/70 rounded-lg px-3 py-2">
            <p className="text-[10px] text-muted-foreground">D1留存</p>
            <p className="text-lg font-bold text-amber-600">{Number(report.kpiSnapshot?.retention_d1 ?? 0).toFixed(1)}%</p>
          </div>
        </div>
        {report.summary && (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">{report.summary}</p>
        )}
      </CardContent>
    </Card>
  );
}
