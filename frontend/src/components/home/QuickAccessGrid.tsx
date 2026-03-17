import { Sparkles, CalendarDays, Shield, BookOpen, Megaphone } from "lucide-react";
import { LineChart as LineChartIcon } from "lucide-react";
import { useLocation } from "wouter";

const QUICK_ACCESS_ITEMS = [
  { icon: Sparkles, label: "AI 运营日报", desc: "产品优化洞察", path: "/ai-daily-report", color: "from-violet-500 to-purple-600" },
  { icon: CalendarDays, label: "每日总览", desc: "每日关键指标", path: "/daily-overview", color: "from-blue-500 to-cyan-600" },
  { icon: Shield, label: "异常监控", desc: "实时告警追踪", path: "/anomaly-monitor", color: "from-red-500 to-rose-600" },
  { icon: LineChartIcon, label: "数据分析", desc: "多维对比分析", path: "/comparison-analysis", color: "from-emerald-500 to-teal-600" },
  { icon: BookOpen, label: "知识库", desc: "运营经验沉淀", path: "/knowledge-base", color: "from-amber-500 to-orange-600" },
  { icon: Megaphone, label: "获客渠道", desc: "投放效果追踪", path: "/acquisition", color: "from-pink-500 to-fuchsia-600" },
];

export function QuickAccessGrid() {
  const [, setLocation] = useLocation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {QUICK_ACCESS_ITEMS.map((item) => (
        <button
          key={item.path}
          onClick={() => setLocation(item.path)}
          className="group relative overflow-hidden rounded-xl border bg-card p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
        >
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br ${item.color}`} />
          <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} text-white mb-2`}>
            <item.icon className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium leading-tight">{item.label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
        </button>
      ))}
    </div>
  );
}
