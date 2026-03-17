import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useMemo } from "react";
import { Search, UserSearch, ChevronRight, X,
  CreditCard, DollarSign, TrendingUp, RotateCcw,
  ShoppingCart, Gift, Tv, Sword, Crown,
  AlertTriangle, Filter, ArrowDown, CheckCircle2, Circle, } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, } from "recharts";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";

const SEGMENT_LABELS: Record<string, string> = {
  L1: "鲸鱼", L2: "海豚", L3: "小鱼", L4: "观望", L5: "新用户", L6: "流失风险",
};

const PAYMENT_TYPES = ["IAP", "SUBSCRIPTION", "AD_REWARD", "SPECIAL_OFFER", "BATTLE_PASS"] as const;

const PAYMENT_TYPE_CONFIG: Record<string, { label: string; color: string; bgLight: string; icon: typeof CreditCard }> = {
  IAP: { label: "内购", color: "bg-blue-500", bgLight: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: ShoppingCart },
  SUBSCRIPTION: { label: "订阅", color: "bg-purple-500", bgLight: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", icon: Crown },
  AD_REWARD: { label: "广告奖励", color: "bg-green-500", bgLight: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", icon: Tv },
  SPECIAL_OFFER: { label: "特惠", color: "bg-orange-500", bgLight: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", icon: Gift },
  BATTLE_PASS: { label: "通行证", color: "bg-red-500", bgLight: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: Sword },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  COMPLETED: { label: "已完成", variant: "default" },
  REFUNDED: { label: "已退款", variant: "destructive" },
  PENDING: { label: "处理中", variant: "secondary" },
  FAILED: { label: "失败", variant: "outline" },
};

const REFUND_RATE_THRESHOLD = 20; // Alert when refund rate > 20%

/* ======================== Mini Trend Chart ======================== */
function PaymentTrendChart({ userId }: { userId: string }) {
  const { currentGameId } = useGame();
  const { data: trend } = trpc.userProfiles.getPaymentTrend.useQuery(
    { userId, days: 30 },
    { enabled: !!userId }
  );

  // Fill in missing dates for the last 30 days
  const chartData = useMemo(() => {
    if (!trend || trend.length === 0) return [];
    const now = new Date();
    const days: { date: string; amount: number; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      const found = trend.find((t: any) => t.date === dateStr);
      days.push({
        date: dateStr.slice(5), // MM-DD
        amount: found ? Number(found.totalAmount) : 0,
        count: found ? Number(found.count) : 0,
      });
    }
    return days;
  }, [trend]);

  if (chartData.length === 0) return null;

  const totalInPeriod = chartData.reduce((s, d) => s + d.amount, 0);
  const totalTxns = chartData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-lg border p-2.5 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3 text-indigo-500" />
          近30天付费趋势
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            ${totalInPeriod.toFixed(2)}
          </span>
          <span className="text-[10px] text-muted-foreground ml-1">/ {totalTxns}笔</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            interval={6}
          />
          <YAxis hide domain={[0, "auto"]} />
          <RechartsTooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "金额"]}
            labelFormatter={(label) => `日期: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#6366f1"
            strokeWidth={1.5}
            fill="url(#trendGradient)"
            dot={false}
            activeDot={{ r: 3, fill: "#6366f1" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ======================== Refund Alert Banner ======================== */
function RefundAlertBanner({ refundRate, refundCount }: { refundRate: number; refundCount: number }) {
  if (refundRate <= REFUND_RATE_THRESHOLD) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-red-700 dark:text-red-400">退款率告警</p>
        <p className="text-[10px] text-red-600/80 dark:text-red-400/70">
          退款率 <span className="font-bold">{refundRate}%</span> 超过阈值 {REFUND_RATE_THRESHOLD}%（共 {refundCount} 笔退款），建议关注该用户行为
        </p>
      </div>
    </div>
  );
}

/* ======================== Type Filter Bar ======================== */
function TypeFilterBar({
  activeType,
  onTypeChange,
  byType,
}: {
  activeType: string | null;
  onTypeChange: (type: string | null) => void;
  byType: Array<{ paymentType: string; count: number; [key: string]: unknown }>;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Filter className="h-3 w-3" />
        类型筛选
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onTypeChange(null)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border ${
            activeType === null
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
          }`}
        >
          全部
        </button>
        {PAYMENT_TYPES.map((type) => {
          const cfg = PAYMENT_TYPE_CONFIG[type];
          const typeData = byType?.find((t: any) => t.paymentType === type);
          const count = typeData?.count ?? 0;
          const isActive = activeType === type;
          const Icon = cfg.icon;

          return (
            <button
              key={type}
              onClick={() => onTypeChange(isActive ? null : type)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border ${
                isActive
                  ? `${cfg.bgLight} border-current shadow-sm`
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
              } ${count === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
              disabled={count === 0}
            >
              <Icon className="h-2.5 w-2.5" />
              {cfg.label}
              {count > 0 && <span className="opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ======================== Payment Timeline ======================== */
function PaymentTimeline({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string | null>(null);

  const { data: payments, isLoading: paymentsLoading } = trpc.userProfiles.getPaymentRecords.useQuery(
    { userId, page, pageSize: 20, paymentType: filterType ?? undefined },
    { enabled: !!userId }
  );
  const { data: summary } = trpc.userProfiles.getPaymentSummary.useQuery(
    { userId },
    { enabled: !!userId }
  );

  // Reset page when filter changes
  const handleTypeChange = (type: string | null) => {
    setFilterType(type);
    setPage(1);
  };

  // Group payments by month
  const groupedPayments = useMemo(() => {
    if (!payments?.data) return [];
    const groups: Record<string, typeof payments.data> = {};
    for (const p of payments.data) {
      const date = new Date(p.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [payments?.data]);

  return (
    <div className="space-y-3">
      <CrossModuleLinks links={MODULE_LINKS.userProfiles} />
      {/* Refund Alert */}
      {summary && summary.refundRate > REFUND_RATE_THRESHOLD && (
        <RefundAlertBanner refundRate={summary.refundRate} refundCount={summary.refundCount} />
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border p-2.5 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
              <DollarSign className="h-3 w-3 text-blue-500" />
              总付费
            </div>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              ${Number(summary.totalAmount).toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground">{summary.totalCount} 笔交易</p>
          </div>
          <div className="rounded-lg border p-2.5 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
              <RotateCcw className="h-3 w-3 text-red-500" />
              退款
            </div>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              ${Number(summary.refundedAmount).toFixed(2)}
            </p>
            <div className="flex items-center gap-1">
              <p className="text-[10px] text-muted-foreground">{summary.refundCount} 笔退款</p>
              {summary.refundRate > 0 && (
                <Badge
                  variant={summary.refundRate > REFUND_RATE_THRESHOLD ? "destructive" : "secondary"}
                  className="text-[9px] h-3.5 px-1"
                >
                  {summary.refundRate}%
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mini Trend Chart */}
      <PaymentTrendChart userId={userId} />

      {/* Type Filter */}
      {summary?.byType && (
        <TypeFilterBar
          activeType={filterType}
          onTypeChange={handleTypeChange}
          byType={summary.byType}
        />
      )}

      {/* Timeline */}
      {paymentsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 w-20 bg-muted rounded mb-2" />
              <div className="h-14 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : groupedPayments.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-6 bottom-0 w-px bg-border" />

          {groupedPayments.map(([month, items]) => (
            <div key={month} className="mb-4">
              {/* Month header */}
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="w-[15px] h-[15px] rounded-full bg-primary flex items-center justify-center">
                  <div className="w-[7px] h-[7px] rounded-full bg-primary-foreground" />
                </div>
                <span className="text-xs font-semibold text-foreground">{month}</span>
                <span className="text-[10px] text-muted-foreground">
                  ({items.length}笔 / ${(items ?? []).filter((p: Record<string,unknown>) => p.status === "COMPLETED").reduce((s: number, p: any) => s + Number(p.amountUsd), 0).toFixed(2)})
                </span>
              </div>

              {/* Payment items */}
              <div className="ml-7 space-y-1.5">
                {(items ?? []).map((payment: Record<string,unknown>) => {
                  const typeCfg = PAYMENT_TYPE_CONFIG[payment.paymentType] || { label: payment.paymentType, color: "bg-gray-500", bgLight: "", icon: CreditCard };
                  const statusCfg = STATUS_CONFIG[payment.status] || { label: payment.status, variant: "outline" as const };
                  const Icon = typeCfg.icon;
                  const date = new Date(payment.createdAt);
                  const isRefunded = payment.status === "REFUNDED";

                  return (
                    <div
                      key={payment.id}
                      className={`group relative rounded-lg border p-2.5 transition-all hover:shadow-sm ${
                        isRefunded
                          ? "border-red-300 bg-red-50/80 dark:border-red-800/60 dark:bg-red-950/30"
                          : "hover:border-primary/30"
                      }`}
                    >
                      {/* Refund red stripe indicator */}
                      {isRefunded && (
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg bg-red-500" />
                      )}

                      <div className="flex items-start gap-2">
                        {/* Type icon */}
                        <div className={`mt-0.5 w-6 h-6 rounded-md ${isRefunded ? "bg-red-500" : typeCfg.color} flex items-center justify-center flex-shrink-0`}>
                          {isRefunded ? (
                            <RotateCcw className="h-3 w-3 text-white" />
                          ) : (
                            <Icon className="h-3 w-3 text-white" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs font-medium truncate ${isRefunded ? "line-through text-muted-foreground" : ""}`}>
                              {payment.productName}
                            </p>
                            <span className={`text-xs font-bold flex-shrink-0 ${
                              isRefunded ? "text-red-500" : Number(payment.amountUsd) === 0 ? "text-green-600" : "text-foreground"
                            }`}>
                              {isRefunded ? "-" : ""}${Number(payment.amountUsd).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">
                              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <Badge variant={statusCfg.variant} className="text-[9px] h-4 px-1">
                              {statusCfg.label}
                            </Badge>
                            {payment.levelAtPayment && (
                              <span className="text-[10px] text-muted-foreground">
                                📍{payment.levelAtPayment}
                              </span>
                            )}
                            {payment.segmentLayerAtPayment !== null && (
                              <span className="text-[10px] text-muted-foreground">
                                L{payment.segmentLayerAtPayment}
                              </span>
                            )}
                            {payment.platform && (
                              <span className="text-[10px] text-muted-foreground">
                                {payment.platform}
                              </span>
                            )}
                          </div>

                          {/* Refund reason */}
                          {isRefunded && payment.refundReason && (
                            <div className="mt-1.5 flex items-start gap-1 bg-red-100/80 dark:bg-red-900/30 rounded px-1.5 py-1">
                              <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" />
                              <p className="text-[10px] text-red-700 dark:text-red-300">
                                退款原因: {payment.refundReason}
                              </p>
                            </div>
                          )}
                          {isRefunded && payment.refundedAt && (
                            <p className="text-[10px] text-red-500/70 mt-0.5">
                              退款时间: {new Date(payment.refundedAt).toLocaleDateString()} {new Date(payment.refundedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {payments && payments.total > 20 && (
            <div className="flex items-center justify-between ml-7 mt-3 text-xs text-muted-foreground">
              <span>共 {payments.total} 条{filterType ? ` (${PAYMENT_TYPE_CONFIG[filterType]?.label || filterType})` : ""}</span>
              <div className="flex gap-1.5">
                <button
                  className="px-2 py-0.5 rounded border hover:bg-accent disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >上一页</button>
                <button
                  className="px-2 py-0.5 rounded border hover:bg-accent disabled:opacity-50"
                  disabled={page * 20 >= payments.total}
                  onClick={() => setPage(p => p + 1)}
                >下一页</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <CreditCard className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            {filterType ? `暂无${PAYMENT_TYPE_CONFIG[filterType]?.label || filterType}类型的付费记录` : "暂无付费记录"}
          </p>
          {filterType && (
            <button
              onClick={() => handleTypeChange(null)}
              className="text-xs text-primary hover:underline mt-1"
            >
              清除筛选
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ======================== User Payment Funnel ======================== */
const FUNNEL_STAGES = [
  { key: 0, label: '首次登录', color: '#6366f1', bgClass: 'from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20' },
  { key: 1, label: '首次付费', color: '#8b5cf6', bgClass: 'from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20' },
  { key: 2, label: '复购（2次+）', color: '#a855f7', bgClass: 'from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20' },
  { key: 3, label: '大额付费（$50+）', color: '#7c3aed', bgClass: 'from-fuchsia-50 to-fuchsia-100/50 dark:from-fuchsia-950/30 dark:to-fuchsia-900/20' },
  { key: 4, label: '鲸鱼（$200+）', color: '#10b981', bgClass: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20' },
];

function UserPaymentFunnel({ userId }: { userId: string }) {
  const { data: stage, isLoading } = trpc.analytics.userFunnelStage.useQuery(
    { userId },
    { enabled: !!userId }
  );

  if (isLoading) return <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">加载中...</div>;
  if (!stage) return <div className="text-center py-4 text-xs text-muted-foreground">暂无漏斗数据</div>;

  const currentStage = stage.currentStage;

  return (
    <div className="space-y-3">
      {/* Current Stage Summary */}
      <div className="rounded-lg border p-2.5 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">当前付费阶段</p>
            <p className="text-sm font-bold" style={{ color: FUNNEL_STAGES[currentStage]?.color }}>
              {FUNNEL_STAGES[currentStage]?.label}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">累计付费</p>
            <p className="text-sm font-bold">${stage.totalPayAmount.toFixed(2)}</p>
          </div>
        </div>
        {stage.daysToFirstPay !== null && (
          <p className="text-[10px] text-muted-foreground mt-1">
            安装到首付: <span className="font-semibold text-foreground">{stage.daysToFirstPay}天</span>
            {stage.firstPayTime && (
              <span className="ml-2">首付时间: {new Date(stage.firstPayTime).toLocaleDateString()}</span>
            )}
          </p>
        )}
      </div>

      {/* Funnel Steps */}
      <div className="space-y-0">
        {FUNNEL_STAGES.map((s, i) => {
          const isReached = i <= currentStage;
          const isCurrent = i === currentStage;
          return (
            <div key={s.key}>
              {i > 0 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDown className={`h-3 w-3 ${i <= currentStage ? 'text-indigo-400' : 'text-muted-foreground/30'}`} />
                </div>
              )}
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all ${
                  isCurrent
                    ? 'border-indigo-400 dark:border-indigo-600 bg-gradient-to-r ' + s.bgClass + ' shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-800'
                    : isReached
                    ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
                    : 'border-border bg-muted/20 opacity-50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCurrent ? 'bg-indigo-500' : isReached ? 'bg-green-500' : 'bg-muted'
                }`}>
                  {isReached ? (
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${
                    isCurrent ? 'text-indigo-700 dark:text-indigo-300' : isReached ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground'
                  }`}>
                    {s.label}
                  </p>
                </div>
                {isCurrent && (
                  <Badge variant="secondary" className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 border-0">
                    当前
                  </Badge>
                )}
                {isReached && !isCurrent && (
                  <Badge variant="secondary" className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0">
                    已达成
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Next Stage Hint */}
      {currentStage < FUNNEL_STAGES.length - 1 && (
        <div className="rounded-lg border border-dashed p-2 text-center">
          <p className="text-[10px] text-muted-foreground">
            距下一阶段 <span className="font-semibold text-foreground">{FUNNEL_STAGES[currentStage + 1]?.label}</span>
            {currentStage === 0 && ' — 需完成首次付费'}
            {currentStage === 1 && ` — 需再付费 ${Math.max(0, 2 - stage.totalPayCount)} 次`}
            {currentStage === 2 && ` — 需累计付费 $${Math.max(0, 50 - stage.totalPayAmount).toFixed(2)}`}
            {currentStage === 3 && ` — 需累计付费 $${Math.max(0, 200 - stage.totalPayAmount).toFixed(2)}`}
          </p>
        </div>
      )}
      {currentStage === FUNNEL_STAGES.length - 1 && (
        <div className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 text-center">
          <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">🎉 已达到最高付费阶段 — 鲸鱼用户</p>
        </div>
      )}
    </div>
  );
}

/* ======================== Main Page ======================== */
export default function UserProfiles() {
  const { currentGameId } = useGame();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState("profile");

  const { data: usersData, isLoading } = trpc.userProfiles.listGameUsers.useQuery({ page, pageSize: 20, search: search || undefined,
  gameId: currentGameId ?? undefined,
});
  const { data: profile } = trpc.userProfiles.getProfile.useQuery({ userId: selectedUserId! }, { enabled: !!selectedUserId });
  const { data: segmentHistory } = trpc.userProfiles.getSegmentHistory.useQuery({ userId: selectedUserId!, limit: 20 }, { enabled: !!selectedUserId });

  const radarData = profile?.segment ? [
    { dim: "付费意愿", value: Number(profile.segment.payScore) },
    { dim: "广告价值", value: Number(profile.segment.adScore) },
    { dim: "技能水平", value: Number(profile.segment.skillScore) },
    { dim: "流失风险", value: Number(profile.segment.churnRisk) },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">用户画像查询</h1>
        <p className="text-muted-foreground text-sm mt-1">查看用户详情、四维评分、探针记录、变现状态和实验分组</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">游戏用户列表</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="搜索用户ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户ID</TableHead>
                    <TableHead>设备类型</TableHead>
                    <TableHead>国家</TableHead>
                    <TableHead>付费次数</TableHead>
                    <TableHead>总付费</TableHead>
                    <TableHead>安装时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                      ))}</TableRow>
                    ))
                  ) : usersData?.data?.length ? (
                    usersData?.data?.map((user: Record<string,unknown>) => (
                      <TableRow key={user.id} className={selectedUserId === user.userId ? "bg-accent" : ""}>
                        <TableCell className="font-mono text-xs">{user.userId.substring(0, 16)}...</TableCell>
                        <TableCell className="text-sm">{user.deviceType || "-"}</TableCell>
                        <TableCell className="text-sm">{user.countryCode || "-"}</TableCell>
                        <TableCell className="text-sm">{user.totalPayCount || 0}</TableCell>
                        <TableCell className="text-sm">${Number(user.totalPayAmount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{user.installTime ? new Date(user.installTime).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedUserId(user.userId); setDetailTab("profile"); }}>
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">暂无游戏用户数据</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {usersData && usersData.total > 20 && (
                <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                  <span>共 {usersData.total} 条</span>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 rounded border hover:bg-accent disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
                    <button className="px-3 py-1 rounded border hover:bg-accent disabled:opacity-50" disabled={page * 20 >= usersData.total} onClick={() => setPage(p => p + 1)}>下一页</button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedUserId && profile ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">用户画像</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(null)}><X className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">用户ID:</span><p className="font-mono text-xs truncate">{profile.user?.userId}</p></div>
                  <div><span className="text-muted-foreground">分层:</span><p><Badge variant="secondary" className="text-xs">{SEGMENT_LABELS[profile.segment?.segmentLevel] || "未分层"}</Badge></p></div>
                  <div><span className="text-muted-foreground">广告观看:</span><p>{profile.user?.totalAdWatch || 0}次</p></div>
                  <div><span className="text-muted-foreground">总付费:</span><p>${Number(profile.user?.totalPayAmount || 0).toFixed(2)}</p></div>
                </div>

                {/* Tabs */}
                <Tabs value={detailTab} onValueChange={setDetailTab} className="w-full">
                  <TabsList className="w-full grid grid-cols-4 h-8">
                    <TabsTrigger value="profile" className="text-xs">画像</TabsTrigger>
                    <TabsTrigger value="payments" className="text-xs flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      付费记录
                    </TabsTrigger>
                    <TabsTrigger value="funnel" className="text-xs">付费漏斗</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs">变更历史</TabsTrigger>
                  </TabsList>

                  {/* Profile Tab */}
                  <TabsContent value="profile" className="mt-3">
                    {radarData.length > 0 && (
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    )}
                  </TabsContent>

                  {/* Payments Tab */}
                  <TabsContent value="payments" className="mt-3">
                    <PaymentTimeline userId={selectedUserId} />
                  </TabsContent>

                  {/* Funnel Tab */}
                  <TabsContent value="funnel" className="mt-3">
                    <UserPaymentFunnel userId={selectedUserId} />
                  </TabsContent>

                  {/* Segment History Tab */}
                  <TabsContent value="history" className="mt-3">
                    {segmentHistory?.length ? (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {segmentHistory.map((h: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs p-2 rounded border">
                            <Badge variant="outline" className="text-xs">{h.fromSegment || "N/A"}</Badge>
                            <span>→</span>
                            <Badge variant="secondary" className="text-xs">{h.toSegment}</Badge>
                            <span className="text-muted-foreground ml-auto">{h.createdAt ? new Date(h.createdAt).toLocaleDateString() : ""}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">暂无变更记录</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <UserSearch className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">选择一个用户查看详细画像</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
