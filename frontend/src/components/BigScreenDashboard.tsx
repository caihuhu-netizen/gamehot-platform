import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Maximize2, Minimize2, Play, Pause, RefreshCw, Settings2,
  Users, DollarSign, TrendingUp, Activity, ChevronLeft, ChevronRight,
  Clock, Zap, Target, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { fmtDate } from "@/lib/dateFormat";

const SEGMENT_COLORS: Record<string, string> = {
  L1: "#818cf8", L2: "#a78bfa", L3: "#c4b5fd",
  L4: "#ddd6fe", L5: "#e0e7ff", L6: "#f1f5f9",
};
const SEGMENT_LABELS: Record<string, string> = {
  L1: "鲸鱼", L2: "海豚", L3: "小鱼",
  L4: "观望", L5: "新用户", L6: "流失风险",
};

const PAGES = [
  { id: "kpi", label: "核心KPI" },
  { id: "trend", label: "收入趋势" },
  { id: "segments", label: "用户分层" },
  { id: "health", label: "闭环健康" },
];

const REFRESH_OPTIONS = [
  { value: "30", label: "30秒" },
  { value: "60", label: "1分钟" },
  { value: "300", label: "5分钟" },
  { value: "0", label: "关闭" },
];

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const end = value;
    const duration = 800;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplay(current);
      ref.current = current;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  const formatted = display >= 10000
    ? `${(display / 10000).toFixed(1)}万`
    : display >= 1000
    ? `${(display / 1000).toFixed(1)}k`
    : display.toFixed(display % 1 === 0 ? 0 : 2);

  return <span>{prefix}{formatted}{suffix}</span>;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span className="text-sm font-mono tabular-nums">
        {time.toLocaleTimeString("zh-CN", { hour12: false })}
      </span>
      <span className="text-xs">
        {time.toLocaleDateString("zh-CN", { month: "short", day: "numeric", weekday: "short" })}
      </span>
    </div>
  );
}

// ==================== KPI Page ====================
function KPIPage({ stats, enhanced }: { stats: any; enhanced: any }) {
  const totalUsers = stats?.totalUsers ?? 0;
  const totalRevenue = Number(stats?.totalRevenue ?? 0);
  const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;
  const healthScore = Number(enhanced?.loopHealth?.overallHealthScore ?? 0);

  const kpis = [
    { label: "总用户数", value: totalUsers, icon: Users, color: "#818cf8", prefix: "" },
    { label: "总收入", value: totalRevenue, icon: DollarSign, color: "#34d399", prefix: "$" },
    { label: "ARPU", value: arpu, icon: TrendingUp, color: "#fbbf24", prefix: "$" },
    { label: "闭环健康度", value: healthScore, icon: Activity, color: healthScore >= 75 ? "#34d399" : healthScore >= 50 ? "#fbbf24" : "#f87171", suffix: "%" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 h-full content-center">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="bg-card/80 backdrop-blur border-border/50 bigscreen-animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
            <CardContent className="p-4 lg:p-6 flex flex-col items-center justify-center text-center gap-3">
              <div className="h-12 w-12 lg:h-14 lg:w-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.color + "20" }}>
                <Icon className="h-6 w-6 lg:h-7 lg:w-7" style={{ color: kpi.color }} />
              </div>
              <div className="bigscreen-kpi-value" style={{ color: kpi.color }}>
                <AnimatedNumber value={kpi.value} prefix={kpi.prefix || ""} suffix={kpi.suffix || ""} />
              </div>
              <div className="bigscreen-kpi-label">{kpi.label}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ==================== Trend Page ====================
function TrendPage({ timeline }: { timeline: any[] }) {
  const data = (timeline || []).map((t: any) => ({
    date: fmtDate(t.statDate),
    revenue: Number(t.totalRevenue || 0),
    users: Number(t.uniqueUsers || 0),
  })).reverse();

  return (
    <div className="h-full flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">30天收入趋势</h2>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="bigRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bigUserGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }}
            />
            <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#818cf8" fill="url(#bigRevGrad)" strokeWidth={2} name="收入" />
            <Area yAxisId="right" type="monotone" dataKey="users" stroke="#34d399" fill="url(#bigUserGrad)" strokeWidth={2} name="用户数" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== Segments Page ====================
function SegmentsPage({ stats }: { stats: any }) {
  const segmentData = stats?.segmentDistribution?.map((s: any) => ({
    name: SEGMENT_LABELS[s.segmentLevel] || s.segmentLevel,
    value: Number(s.count),
    level: s.segmentLevel,
  })) || [];

  return (
    <div className="h-full flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">用户分层分布</h2>
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segmentData}
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="70%"
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: "rgba(255,255,255,0.3)" }}
            >
              {segmentData.map((entry: any) => (
                <Cell key={entry.level} fill={SEGMENT_COLORS[entry.level] || "#6366f1"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== Health Page ====================
function HealthPage({ enhanced }: { enhanced: any }) {
  const loopHealth = enhanced?.loopHealth;
  const radarData = loopHealth ? [
    { dimension: "分层覆盖", value: Number(loopHealth.segmentCoverage) * 100 },
    { dimension: "标签精度", value: Number(loopHealth.labelAccuracy) * 100 },
    { dimension: "难度适配", value: Number(loopHealth.difficultyAdaptRate) * 100 },
    { dimension: "埋点覆盖", value: Number(loopHealth.eventTrackingRate) * 100 },
    { dimension: "触发精准", value: Number(loopHealth.triggerPrecision) * 100 },
    { dimension: "实验覆盖", value: loopHealth.activeExperiments > 0 ? Math.min(Number(loopHealth.experimentsWithSignificance) / Number(loopHealth.activeExperiments) * 100, 100) : 0 },
  ] : [];

  return (
    <div className="h-full flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">闭环健康雷达</h2>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.15)" />
            <PolarAngleAxis dataKey="dimension" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
            <Radar name="健康度" dataKey="value" stroke="#818cf8" fill="#818cf8" fillOpacity={0.3} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== Main BigScreen Component ====================
export default function BigScreenDashboard({ onExit }: { onExit: () => void }) {
  const { currentGameId, currentGame } = useGame();
  const [currentPage, setCurrentPage] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState("60");
  const [showSettings, setShowSettings] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Data queries
  const { data: stats, refetch: refetchStats } = trpc.dashboard.stats.useQuery(undefined, {
    refetchInterval: refreshInterval !== "0" ? Number(refreshInterval) * 1000 : false,
  });
  const { data: timeline, refetch: refetchTimeline } = trpc.dashboard.revenueTimeline.useQuery({ days: 30 }, {
    refetchInterval: refreshInterval !== "0" ? Number(refreshInterval) * 1000 : false,
  });
  const { data: enhanced, refetch: refetchEnhanced } = trpc.loopEngine.enhancedDashboard.useQuery(undefined, {
    refetchInterval: refreshInterval !== "0" ? Number(refreshInterval) * 1000 : false,
  });

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn("Fullscreen not supported");
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Auto-play carousel
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setCurrentPage((p) => (p + 1) % PAGES.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  // Manual refresh
  const handleRefresh = () => {
    refetchStats();
    refetchTimeline();
    refetchEnhanced();
    setLastRefresh(new Date());
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setCurrentPage((p) => (p + 1) % PAGES.length);
      else if (e.key === "ArrowLeft") setCurrentPage((p) => (p - 1 + PAGES.length) % PAGES.length);
      else if (e.key === " ") { e.preventDefault(); setAutoPlay((a) => !a); }
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onExit]);

  return (
    <div
      ref={containerRef}
      className="bigscreen-mode fixed inset-0 z-[100] bg-background text-foreground flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg tracking-tight">GAMEHOT CDP</span>
          {currentGame && (
            <Badge variant="outline" className="text-xs border-border/50">
              {currentGame.gameName}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <LiveClock />
          <span className="text-xs text-muted-foreground">
            更新: {lastRefresh.toLocaleTimeString("zh-CN", { hour12: false })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleRefresh} className="h-8">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAutoPlay(!autoPlay)} className="h-8">
            {autoPlay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSettings(!showSettings)} className="h-8">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={toggleFullscreen} className="h-8">
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="outline" onClick={onExit} className="h-8 text-xs">
            退出大屏
          </Button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="flex items-center gap-4 px-6 py-2 border-b border-border/30 bg-card/50">
          <span className="text-xs text-muted-foreground">自动刷新:</span>
          <Select value={refreshInterval} onValueChange={setRefreshInterval}>
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REFRESH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">轮播间隔: 10秒</span>
        </div>
      )}

      {/* Page content */}
      <div className="flex-1 min-h-0 p-4 lg:p-8">
        {currentPage === 0 && <KPIPage stats={stats} enhanced={enhanced} />}
        {currentPage === 1 && <TrendPage timeline={timeline || []} />}
        {currentPage === 2 && <SegmentsPage stats={stats} />}
        {currentPage === 3 && <HealthPage enhanced={enhanced} />}
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-center gap-4 px-6 py-3 border-t border-border/30">
        <Button size="sm" variant="ghost" onClick={() => setCurrentPage((p) => (p - 1 + PAGES.length) % PAGES.length)} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {PAGES.map((page, i) => (
          <button
            key={page.id}
            onClick={() => { setCurrentPage(i); setAutoPlay(false); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              i === currentPage
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {page.label}
          </button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setCurrentPage((p) => (p + 1) % PAGES.length)} className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {autoPlay && (
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary animate-pulse">
            自动轮播中
          </Badge>
        )}
      </div>
    </div>
  );
}
