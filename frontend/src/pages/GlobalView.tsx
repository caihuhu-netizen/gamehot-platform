import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Globe, RefreshCw, DollarSign, Users, TrendingUp, CreditCard,
  Loader2, ChevronUp, ChevronDown
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar
} from "recharts";

// ──────────────────────────────────────────────────────────────────────────────
// 货币 & 时区配置
// ──────────────────────────────────────────────────────────────────────────────
const CURRENCIES = ["USD", "CNY", "EUR", "JPY", "KRW", "SGD", "MYR", "THB", "VND", "IDR", "PHP", "BRL", "INR"];
const TIMEZONES = [
  { label: "UTC",           value: "UTC" },
  { label: "上海 (UTC+8)",  value: "Asia/Shanghai" },
  { label: "洛杉矶 (UTC-8)", value: "America/Los_Angeles" },
  { label: "伦敦 (UTC+0)",  value: "Europe/London" },
  { label: "东京 (UTC+9)",  value: "Asia/Tokyo" },
  { label: "新加坡 (UTC+8)", value: "Asia/Singapore" },
];

const REGION_LABELS: Record<string, string> = {
  NA:    "北美",
  EU:    "欧洲",
  SEA:   "东南亚",
  CN:    "中国",
  JP:    "日本",
  KR:    "韩国",
  OTHER: "其他",
};

const REGION_COLORS: Record<string, string> = {
  NA:    "#6366f1",
  EU:    "#22c55e",
  SEA:   "#f59e0b",
  CN:    "#ef4444",
  JP:    "#a855f7",
  KR:    "#3b82f6",
  OTHER: "#6b7280",
};

// ──────────────────────────────────────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────────────────────────────────────
function formatMoney(amountUsd: number, rates: Record<string, number>, currency: string): string {
  const rate = rates[currency] ?? 1;
  const converted = amountUsd * rate;
  const symbols: Record<string, string> = {
    USD: "$", CNY: "¥", EUR: "€", JPY: "¥", KRW: "₩",
    SGD: "S$", MYR: "RM", THB: "฿", VND: "₫", IDR: "Rp",
    PHP: "₱", BRL: "R$", INR: "₹",
  };
  const sym = symbols[currency] ?? currency + " ";
  if (Math.abs(converted) >= 1_000_000) return `${sym}${(converted / 1_000_000).toFixed(2)}M`;
  if (Math.abs(converted) >= 1_000)     return `${sym}${(converted / 1_000).toFixed(1)}K`;
  return `${sym}${converted.toFixed(2)}`;
}

function formatTz(utcDateStr: string, tz: string): string {
  try {
    const d = new Date(utcDateStr);
    return d.toLocaleString("zh-CN", { timeZone: tz, hour12: false, dateStyle: "short", timeStyle: "short" });
  } catch {
    return utcDateStr;
  }
}

function nowInTz(tz: string): string {
  try {
    return new Date().toLocaleString("zh-CN", { timeZone: tz, hour12: false });
  } catch {
    return new Date().toLocaleString();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 子组件：统计卡片
// ──────────────────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color = "blue"
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    green:  "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
    amber:  "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  };
  const iconColors: Record<string, string> = {
    blue: "text-blue-600", green: "text-green-600", purple: "text-purple-600", amber: "text-amber-600",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] ?? colors.blue}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${iconColors[color] ?? iconColors.blue}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 子组件：地区卡片
// ──────────────────────────────────────────────────────────────────────────────
function RegionCard({
  region, userCount, revenueUsd, arpu, totalUsers, totalRevenue, rates, currency
}: {
  region: string;
  userCount: number;
  revenueUsd: number;
  arpu: number;
  totalUsers: number;
  totalRevenue: number;
  rates: Record<string, number>;
  currency: string;
}) {
  const userPct = totalUsers > 0 ? ((userCount / totalUsers) * 100).toFixed(1) : "0.0";
  const revPct  = totalRevenue > 0 ? ((revenueUsd / totalRevenue) * 100).toFixed(1) : "0.0";
  const label   = REGION_LABELS[region] ?? region;
  const color   = REGION_COLORS[region] ?? "#6b7280";

  return (
    <div className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-semibold text-sm">{label}</span>
        <span className="text-xs text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded">
          {region}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">用户数</div>
          <div className="font-medium">{userCount.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">{userPct}% 占比</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">收入</div>
          <div className="font-medium">{formatMoney(revenueUsd, rates, currency)}</div>
          <div className="text-xs text-muted-foreground">{revPct}% 占比</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t">
        <div className="text-xs text-muted-foreground">ARPU</div>
        <div className="text-sm font-medium">{formatMoney(arpu, rates, currency)}</div>
      </div>
      {/* 用户占比进度条 */}
      <div className="mt-2">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${userPct}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 主页面
// ──────────────────────────────────────────────────────────────────────────────
export default function GlobalView() {
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");

  const summaryQ        = trpc.globalView.summary.useQuery();
  const currencyRatesQ  = trpc.globalView.currencyRates.useQuery();
  const regionBreakdownQ = trpc.globalView.regionBreakdown.useQuery({ days: 30, currency: "USD" });
  const timezoneDataQ   = trpc.globalView.timezoneData.useQuery();
  const refreshMutation = trpc.globalView.refreshRates.useMutation();

  const rates: Record<string, number> = useMemo(() => {
    const raw = (currencyRatesQ.data as any)?.rates;
    if (!raw) return { USD: 1 };
    // raw 的值是 rate_to_usd，表示 1 USD = N 该货币
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      result[k] = typeof v === "number" ? v : Number(v);
    }
    return result;
  }, [currencyRatesQ.data]);

  const summary    = summaryQ.data as any;
  const regionData = regionBreakdownQ.data as any;
  const tzData     = timezoneDataQ.data as any;

  const regionStats: any[] = summary?.regionStats ?? [];
  const topCountries: any[] = summary?.topCountries ?? [];
  const totalRevenueUsd: number = summary?.totalRevenueUsd ?? 0;
  const globalDau: number = summary?.globalDau ?? 0;
  const totalUsers = regionStats.reduce((s: number, r: any) => s + (r.userCount ?? 0), 0);
  const totalRevenue = regionStats.reduce((s: number, r: any) => s + (r.revenueUsd ?? 0), 0);

  // ARPU
  const arpu = globalDau > 0 ? totalRevenueUsd / globalDau : 0;

  // 折线图数据（地区按 region 堆叠，这里用 regionBreakdown 的 regions 数据展示）
  const chartData = useMemo(() => {
    const regions: any[] = regionData?.regions ?? [];
    return regions.map((r: Record<string,unknown>) => ({
      name: REGION_LABELS[r.region] ?? r.region,
      region: r.region,
      用户数: r.userCount ?? 0,
      收入: parseFloat((((r.revenue ?? 0) * (rates[currency] ?? 1))).toFixed(2)),
    }));
  }, [regionData, rates, currency]);

  const isLoading = summaryQ.isLoading || currencyRatesQ.isLoading;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ── 标题行 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">全球视图</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              当前时间：{nowInTz(timezone)}（{TIMEZONES.find(t => t.value === timezone)?.label ?? timezone}）
            </p>
          </div>
        </div>

        {/* 控制栏 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 货币切换 */}
          <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
            >
              {CURRENCIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 时区切换 */}
          <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          {/* 刷新汇率 */}
          <button
            onClick={() => refreshMutation.mutate({})}
            disabled={refreshMutation.isPending}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
            {refreshMutation.isPending ? "更新中..." : "刷新汇率"}
          </button>
        </div>
      </div>

      {/* ── 全局 Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
          <span className="ml-3 text-muted-foreground">加载全球数据...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── 核心指标卡片 ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="全球活跃用户"
              value={globalDau.toLocaleString()}
              sub={`${regionStats.length} 个地区`}
              color="blue"
            />
            <StatCard
              icon={DollarSign}
              label={`总收入 (${currency})`}
              value={formatMoney(totalRevenueUsd, rates, currency)}
              sub="近30天付费+广告"
              color="green"
            />
            <StatCard
              icon={TrendingUp}
              label={`ARPU (${currency})`}
              value={formatMoney(arpu, rates, currency)}
              sub="总收入/活跃用户"
              color="purple"
            />
            <StatCard
              icon={CreditCard}
              label="付费收入 (USD)"
              value={formatMoney(summary?.totalPaymentUsd ?? 0, rates, currency)}
              sub="IAP 内购合计"
              color="amber"
            />
          </div>

          {/* ── 地区卡片 ── */}
          <div>
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" /> 地区分布
            </h2>
            {regionStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                暂无地区数据
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {regionStats.map((r: Record<string,unknown>) => (
                  <RegionCard
                    key={r.region}
                    region={r.region}
                    userCount={r.userCount ?? 0}
                    revenueUsd={r.revenueUsd ?? 0}
                    arpu={r.arpu ?? 0}
                    totalUsers={totalUsers}
                    totalRevenue={totalRevenue}
                    rates={rates}
                    currency={currency}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── 收入 & 用户 柱状图 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 各地区收入 */}
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold mb-4">各地区收入（{currency}）</h2>
              {chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  暂无数据
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => [formatMoney(v / (rates[currency] ?? 1), rates, currency), "收入"]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="收入" radius={[4, 4, 0, 0]}>
                      {chartData.map((d: any, i: number) => (
                        <rect key={d.region} fill={REGION_COLORS[d.region] ?? `hsl(${i * 60}, 65%, 55%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 各地区用户数 */}
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold mb-4">各地区用户数</h2>
              {chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  暂无数据
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [v.toLocaleString(), "用户数"]} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="用户数" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Top 10 国家表格 ── */}
          <div className="rounded-xl border bg-card">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold">Top 10 国家（按收入排序）</h2>
              <span className="text-xs text-muted-foreground">显示货币：{currency}</span>
            </div>
            {topCountries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">暂无数据</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8">#</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">国家</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">代码</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">收入 ({currency})</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">占比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCountries.map((c: any, i: number) => {
                      const revUsd = c.revenueUsd ?? 0;
                      const pct = totalRevenueUsd > 0 ? ((revUsd / totalRevenueUsd) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={c.countryCode} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium">{c.countryName ?? c.countryCode}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{c.countryCode}</td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {formatMoney(revUsd, rates, currency)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
                                />
                              </div>
                              <span className="text-muted-foreground w-10 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── 时区信息面板 ── */}
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" /> 各地区时区信息
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {(tzData?.regions ?? getDefaultTimezonesFallback()).map((r: Record<string,unknown>) => (
                <div key={r.code} className="text-center bg-muted/30 rounded-lg p-2">
                  <div className="font-medium text-xs">{r.name ?? r.code}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">{r.utcOffset}</div>
                  <div className="text-xs mt-1 text-primary/80 font-mono">
                    {r.timezone ? (() => {
                      try {
                        return new Date().toLocaleTimeString("zh-CN", {
                          timeZone: r.timezone, hour12: false, hour: "2-digit", minute: "2-digit"
                        });
                      } catch { return "--:--"; }
                    })() : "--:--"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 汇率面板 ── */}
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> 汇率参考（基准 USD）
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
              {Object.entries(rates).filter(([k]) => CURRENCIES.includes(k)).map(([code, rate]) => (
                <div
                  key={code}
                  className={`text-center p-2 rounded-lg cursor-pointer transition-colors ${
                    currency === code
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 hover:bg-muted/60"
                  }`}
                  onClick={() => setCurrency(code)}
                >
                  <div className="font-semibold text-sm">{code}</div>
                  <div className={`text-xs mt-0.5 ${currency === code ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {rate >= 1000 ? rate.toFixed(0) : rate.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              点击货币代码切换展示货币。汇率数据来自 currency_rates 表，可点击「刷新汇率」更新。
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function getDefaultTimezonesFallback() {
  return [
    { code: "NA",    name: "北美",   timezone: "America/New_York",   utcOffset: "UTC-5:00" },
    { code: "EU",    name: "欧洲",   timezone: "Europe/London",       utcOffset: "UTC+0:00" },
    { code: "SEA",   name: "东南亚", timezone: "Asia/Singapore",      utcOffset: "UTC+8:00" },
    { code: "CN",    name: "中国",   timezone: "Asia/Shanghai",       utcOffset: "UTC+8:00" },
    { code: "JP",    name: "日本",   timezone: "Asia/Tokyo",          utcOffset: "UTC+9:00" },
    { code: "KR",    name: "韩国",   timezone: "Asia/Seoul",          utcOffset: "UTC+9:00" },
    { code: "OTHER", name: "其他",   timezone: "UTC",                 utcOffset: "UTC+0:00" },
  ];
}
