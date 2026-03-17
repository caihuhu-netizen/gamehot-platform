import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, Download, Table2, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DateRangePicker } from "@/components/DateRangePicker";
import { exportToCsv } from "@/lib/csvExport";

type SortField = "reportDate" | "dau" | "newUsers" | "avgInterstitialPerUser" | "avgRewardedPerUser" |
  "retentionD1" | "retentionD7" | "retentionD28" | "iapRevenue" | "adSpend" | "adRevenue" | "totalRevenue" | "roi" | "avgSessionMinutes";
type SortDir = "asc" | "desc";

// Fields that show day-over-day comparison
const DOD_FIELDS = ["dau", "newUsers", "retentionD1", "retentionD7", "retentionD28", "iapRevenue", "adRevenue", "totalRevenue", "roi", "avgSessionMinutes"] as const;
// Fields where decrease is bad (shown in red)
const POSITIVE_FIELDS = new Set(["dau", "newUsers", "retentionD1", "retentionD7", "retentionD28", "iapRevenue", "adRevenue", "totalRevenue", "roi", "avgSessionMinutes"]);

function calcDodPct(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function DodBadge({ pct, field }: { pct: number | null; field: string }) {
  if (pct === null) return null;
  const isPositive = POSITIVE_FIELDS.has(field);
  const isUp = pct > 0;
  const isNeutral = Math.abs(pct) < 0.5;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center text-[10px] text-muted-foreground ml-0.5">
        <Minus className="h-2.5 w-2.5" />
      </span>
    );
  }

  // For positive fields: up=green, down=red. For negative fields (like adSpend): up=red, down=green
  const isGood = isPositive ? isUp : !isUp;
  const colorClass = isGood ? "text-emerald-600" : "text-red-500";

  return (
    <span className={`inline-flex items-center text-[10px] font-medium ${colorClass} ml-0.5`}>
      {isUp ? <TrendingUp className="h-2.5 w-2.5 mr-px" /> : <TrendingDown className="h-2.5 w-2.5 mr-px" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function DailyOverview() {
  const { currentGameId } = useGame();
  const [dateRange, setDateRange] = useState(() => ({
    from: new Date(Date.now() - 30 * 86400000),
    to: new Date(),
  }));

  const startDate = useMemo(() => dateRange.from.toISOString().split("T")[0], [dateRange.from]);
  const endDate = useMemo(() => dateRange.to.toISOString().split("T")[0], [dateRange.to]);
  const [sortField, setSortField] = useState<SortField>("reportDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data, isLoading } = trpc.reports.adDailySummary.useQuery({
    startDate,
    endDate,
    gameId: currentGameId ?? undefined,
  });

  // Always sort by date first to build the DoD map, then apply user sort
  const dateOrderedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return [...data].sort((a: any, b: any) => {
      const aD = new Date(a.reportDate).getTime();
      const bD = new Date(b.reportDate).getTime();
      return aD - bD; // ascending by date
    });
  }, [data]);

  // Build day-over-day percentage map: dateStr -> { field -> pct }
  const dodMap = useMemo(() => {
    const map: Record<string, Record<string, number | null>> = {};
    for (let i = 0; i < dateOrderedData.length; i++) {
      const row = dateOrderedData[i];
      const dateStr = row.reportDate instanceof Date ? row.reportDate.toISOString().split("T")[0] : String(row.reportDate);
      const prev = i > 0 ? dateOrderedData[i - 1] : null;
      const dodEntry: Record<string, number | null> = {};
      for (const field of DOD_FIELDS) {
        if (prev) {
          dodEntry[field] = calcDodPct(parseFloat(String(row[field])) || 0, parseFloat(String(prev[field])) || 0);
        } else {
          dodEntry[field] = null;
        }
      }
      map[dateStr] = dodEntry;
    }
    return map;
  }, [dateOrderedData]);

  const sortedData = useMemo(() => {
    if (!dateOrderedData.length) return [];
    return [...dateOrderedData].sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === "reportDate") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [dateOrderedData, sortField, sortDir]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!sortedData.length) return null;
    const sum = (field: string) => sortedData.reduce((acc: number, row: any) => acc + (parseFloat(row[field]) || 0), 0);
    const avg = (field: string) => sum(field) / sortedData.length;
    const totalDays = sortedData.length;
    return {
      dau: Math.round(avg("dau")),
      newUsers: Math.round(sum("newUsers")),
      avgInterstitialPerUser: avg("avgInterstitialPerUser").toFixed(2),
      avgRewardedPerUser: avg("avgRewardedPerUser").toFixed(2),
      retentionD1: avg("retentionD1").toFixed(2),
      retentionD7: avg("retentionD7").toFixed(2),
      retentionD28: avg("retentionD28").toFixed(2),
      iapRevenue: sum("iapRevenue").toFixed(2),
      adSpend: sum("adSpend").toFixed(2),
      adRevenue: sum("adRevenue").toFixed(2),
      totalRevenue: sum("totalRevenue").toFixed(2),
      roi: ((sum("totalRevenue") / (sum("adSpend") || 1)) * 100).toFixed(2) + "%",
      avgSessionMinutes: avg("avgSessionMinutes").toFixed(2),
      totalDays,
    };
  }, [sortedData]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortableHeader({ field, label, tooltip }: { field: SortField; label: string; tooltip?: string }) {
    const isActive = sortField === field;
    const hasDod = (DOD_FIELDS as readonly string[]).includes(field);
    return (
      <TableHead
        className="cursor-pointer hover:bg-muted/50 select-none whitespace-nowrap text-xs"
        onClick={() => toggleSort(field)}
      >
        <div className="flex items-center gap-1">
          {label}
          {hasDod && <span className="text-[9px] text-muted-foreground/60">环比</span>}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>{tooltip}</TooltipContent>
            </Tooltip>
          )}
          <ArrowUpDown className={`h-3 w-3 ${isActive ? "text-primary" : "text-muted-foreground/40"}`} />
        </div>
      </TableHead>
    );
  }

  function handleExport() {
    if (!sortedData.length) return;
    const rows = sortedData.map((r: any) => {
      const dateStr = r.reportDate instanceof Date ? r.reportDate.toISOString().split("T")[0] : String(r.reportDate);
      const dod = dodMap[dateStr] || {};
      const fmtDod = (field: string) => dod[field] != null ? `${dod[field]! > 0 ? '+' : ''}${dod[field]!.toFixed(1)}%` : "";
      return {
        日期: dateStr,
        活跃: r.dau, "活跃环比": fmtDod("dau"),
        新增: r.newUsers, "新增环比": fmtDod("newUsers"),
        人均插屏: r.avgInterstitialPerUser,
        人均激励: r.avgRewardedPerUser,
        次留: r.retentionD1, "次留环比": fmtDod("retentionD1"),
        "7留": r.retentionD7, "7留环比": fmtDod("retentionD7"),
        "28留": r.retentionD28, "28留环比": fmtDod("retentionD28"),
        "内购($)": r.iapRevenue, "内购环比": fmtDod("iapRevenue"),
        "花费($)": r.adSpend,
        "广告收益($)": r.adRevenue, "广告收益环比": fmtDod("adRevenue"),
        "总收益($)": r.totalRevenue, "总收益环比": fmtDod("totalRevenue"),
        ROI: r.roi, "ROI环比": fmtDod("roi"),
        "日均总时长(min)": r.avgSessionMinutes, "时长环比": fmtDod("avgSessionMinutes"),
      };
    });
    exportToCsv(`每日数据总览_${startDate}_${endDate}`, rows);
  }

  function formatNum(val: any, decimals = 0) {
    const n = parseFloat(val);
    if (isNaN(n)) return "0";
    return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
  }

  function formatPct(val: any) {
    const n = parseFloat(val);
    if (isNaN(n) || n === 0) return "0";
    return n.toFixed(2);
  }

  function formatMoney(val: any) {
    const n = parseFloat(val);
    if (isNaN(n)) return "0";
    return n.toFixed(2);
  }

  function formatRoi(val: any) {
    const n = parseFloat(val);
    if (isNaN(n)) return "0%";
    return n.toFixed(2) + "%";
  }

  function CellWithDod({ value, field, dateStr, formatter }: { value: any; field: string; dateStr: string; formatter: (v: any) => string }) {
    const dod = dodMap[dateStr];
    const pct = dod ? dod[field] : null;
    return (
      <TableCell className="text-sm">
        <div className="flex items-center gap-0.5">
          <span>{formatter(value)}</span>
          <DodBadge pct={pct ?? null} field={field} />
        </div>
      </TableCell>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Table2 className="h-6 w-6 text-blue-500" />
            每日数据总览
          </h1>
          <p className="text-muted-foreground mt-1">每日关键运营指标汇总，支持排序和导出 · <span className="text-emerald-600">↑绿色</span>=环比上升 <span className="text-red-500">↓红色</span>=环比下降</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!sortedData.length}>
            <Download className="h-4 w-4 mr-1" /> 导出CSV
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : !sortedData.length ? (
            <div className="text-center py-12 text-muted-foreground">暂无数据</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <SortableHeader field="reportDate" label="日期" />
                    <SortableHeader field="dau" label="活跃" />
                    <SortableHeader field="newUsers" label="新增" />
                    <SortableHeader field="avgInterstitialPerUser" label="人均插屏" />
                    <SortableHeader field="avgRewardedPerUser" label="人均激励" />
                    <SortableHeader field="retentionD1" label="次留" />
                    <SortableHeader field="retentionD7" label="7留" />
                    <SortableHeader field="retentionD28" label="28留" />
                    <SortableHeader field="iapRevenue" label="内购($)" tooltip="内购收入" />
                    <SortableHeader field="adSpend" label="花费($)" tooltip="广告花费" />
                    <SortableHeader field="adRevenue" label="广告收益($)" tooltip="广告收益" />
                    <SortableHeader field="totalRevenue" label="总收益($)" tooltip="总收益 = 内购 + 广告收益" />
                    <SortableHeader field="roi" label="ROI" />
                    <SortableHeader field="avgSessionMinutes" label="日均总时长(min)" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((row: any, idx: number) => {
                    const dateStr = row.reportDate instanceof Date ? row.reportDate.toISOString().split("T")[0] : String(row.reportDate);
                    return (
                      <TableRow key={idx} className="hover:bg-muted/20">
                        <TableCell className="whitespace-nowrap text-sm font-medium">{dateStr}</TableCell>
                        <CellWithDod value={row.dau} field="dau" dateStr={dateStr} formatter={(v) => formatNum(v)} />
                        <CellWithDod value={row.newUsers} field="newUsers" dateStr={dateStr} formatter={(v) => formatNum(v)} />
                        <TableCell className="text-sm">{formatNum(row.avgInterstitialPerUser, 2)}</TableCell>
                        <TableCell className="text-sm">{formatNum(row.avgRewardedPerUser, 2)}</TableCell>
                        <CellWithDod value={row.retentionD1} field="retentionD1" dateStr={dateStr} formatter={formatPct} />
                        <CellWithDod value={row.retentionD7} field="retentionD7" dateStr={dateStr} formatter={formatPct} />
                        <CellWithDod value={row.retentionD28} field="retentionD28" dateStr={dateStr} formatter={formatPct} />
                        <CellWithDod value={row.iapRevenue} field="iapRevenue" dateStr={dateStr} formatter={formatMoney} />
                        <TableCell className="text-sm">{formatMoney(row.adSpend)}</TableCell>
                        <CellWithDod value={row.adRevenue} field="adRevenue" dateStr={dateStr} formatter={formatMoney} />
                        <CellWithDod value={row.totalRevenue} field="totalRevenue" dateStr={dateStr} formatter={formatMoney} />
                        <CellWithDod value={row.roi} field="roi" dateStr={dateStr} formatter={formatRoi} />
                        <CellWithDod value={row.avgSessionMinutes} field="avgSessionMinutes" dateStr={dateStr} formatter={(v) => formatNum(v, 2)} />
                      </TableRow>
                    );
                  })}

                  {/* Summary Row - Red highlighted */}
                  {totals && (
                    <TableRow className="border-t-2 border-red-300 bg-red-50 dark:bg-red-950/30 font-semibold">
                      <TableCell className="whitespace-nowrap text-sm text-red-600 dark:text-red-400">总计 ({totals.totalDays}天)</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{formatNum(totals.dau)}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{formatNum(totals.newUsers)}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{totals.avgInterstitialPerUser}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{totals.avgRewardedPerUser}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{totals.retentionD1}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{totals.retentionD7}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{totals.retentionD28}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{totals.iapRevenue}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{totals.adSpend}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{totals.adRevenue}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{totals.totalRevenue}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{totals.roi}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{totals.avgSessionMinutes}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info footer */}
      {totals && (
        <div className="text-xs text-muted-foreground text-right">
          共 {totals.totalDays} 天数据 | 活跃为日均值，新增/内购/花费/广告收益/总收益为累计值，留存/人均/ROI/时长为均值 | 环比=与前一天对比变化率
        </div>
      )}
    </div>
  );
}
