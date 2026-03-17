import {
  LayoutDashboard, Users, Layers, Target, TrendingUp, DollarSign,
  FlaskConical, Settings, UserSearch, BarChart3, Shield, Gamepad2,
  RefreshCw, Folder, History, BookOpen, Code, Database, CalendarDays,
  Lightbulb, Megaphone, PieChart, Tv, Sparkles, Bell, UserPlus,
  Undo2, ShoppingCart, FileBarChart, MousePointerClick, Activity,
  AlertTriangle, GitCompare, Wrench, ClipboardList, UserCheck, GitBranch,
  Rocket, ListChecks, FileCheck2, Zap, Bot, Brain, Download, FileSearch,
  Archive, CalendarClock, Table2, ShieldCheck, ShieldAlert,
  Globe, TrendingDown, Radio, Workflow, Radar, Siren,
  BadgeDollarSign, BarChart2, LineChart, Layers2, SendHorizontal,
  type LucideIcon,
} from "lucide-react";

export type MenuItem = { icon: LucideIcon; label: string; path: string; menuCode: string };
export type MenuGroup = { label: string; items: MenuItem[] };

export const groupI18nMap: Record<string, string> = {
  perf_monitor: "menu.perfMonitor", data_archive: "menu.dataArchive",
  inspection_report: "menu.inspectionReport",
  inspection: "menu.inspectionReport",
  data_sync: "menu.dataSync",
  arch_roadmap: "menu.archRoadmap",
};

export const staticMenuGroups: MenuGroup[] = [
  {
    label: "增长总览",
    items: [
      { icon: LayoutDashboard, label: "经营仪表盘",   path: "/",                  menuCode: "dashboard" },
      { icon: Sparkles,        label: "AI 日报",      path: "/daily-report",      menuCode: "daily_report" },
      { icon: Globe,           label: "全球视图",      path: "/global-view",       menuCode: "global_view" },
      { icon: Table2,          label: "每日总览",      path: "/daily-overview",    menuCode: "daily_overview" },
    ],
  },
  {
    label: "产品优化",
    items: [
      { icon: Rocket,          label: "版本管理",      path: "/version-management",         menuCode: "version_management" },
      { icon: ListChecks,      label: "优化建议",      path: "/optimization-suggestions",   menuCode: "optimization_suggestions" },
      { icon: FileCheck2,      label: "效果验证",      path: "/effect-verification",        menuCode: "effect_verification" },
      { icon: FlaskConical,    label: "A/B 实验",      path: "/experiments",                menuCode: "experiments" },
      { icon: GitCompare,      label: "对比分析",      path: "/comparison-analysis",        menuCode: "comparison_analysis" },
    ],
  },
  {
    label: "用户洞察",
    items: [
      { icon: Layers2,         label: "用户分层",      path: "/segments",          menuCode: "segments" },
      { icon: UserSearch,      label: "用户画像",      path: "/user-profiles",     menuCode: "user_profiles" },
      { icon: UserPlus,        label: "用户分群",      path: "/audience",          menuCode: "audience" },
      { icon: ClipboardList,   label: "分群模板库",    path: "/audience/templates",menuCode: "audience_templates" },
      { icon: CalendarDays,    label: "Cohort 留存",   path: "/cohort-retention",  menuCode: "cohort_retention" },
      { icon: RefreshCw,       label: "闭环引擎",      path: "/loop-engine",       menuCode: "loop_engine" },
      { icon: MousePointerClick,label:"事件分析",      path: "/event-analysis",    menuCode: "event_analysis" },
      { icon: BarChart3,       label: "数据分析",      path: "/analytics",         menuCode: "analytics" },
    ],
  },
  {
    label: "经营数据",
    items: [
      { icon: Megaphone,       label: "投放管理",      path: "/acquisition",       menuCode: "acquisition" },
      { icon: BadgeDollarSign, label: "变现管理",      path: "/monetize",          menuCode: "monetize" },
      { icon: Tv,              label: "广告聚合",      path: "/ad-revenue",        menuCode: "ad_revenue" },
      { icon: ShoppingCart,    label: "内购商品",      path: "/iap-products",      menuCode: "iap_products" },
      { icon: TrendingUp,      label: "智能定价",      path: "/pricing-engine",    menuCode: "pricing_engine" },
      { icon: PieChart,        label: "成本利润",      path: "/cost-profit",       menuCode: "cost_profit" },
      { icon: FileBarChart,    label: "自定义报表",    path: "/custom-report",     menuCode: "custom_report" },
      { icon: Download,        label: "数据导出",      path: "/data-export",       menuCode: "data_export" },
    ],
  },
  {
    label: "运营中心",
    items: [
      { icon: GitBranch,       label: "用户旅程",      path: "/journey-builder",   menuCode: "journey_builder" },
      { icon: SendHorizontal,  label: "推送中心",      path: "/push-center",       menuCode: "push_center" },
      { icon: Undo2,           label: "用户召回",      path: "/user-recall",       menuCode: "user_recall" },
      { icon: ShieldAlert,     label: "流失预测",      path: "/churn-prediction",  menuCode: "churn_prediction" },
      { icon: Siren,           label: "异常监控",      path: "/anomaly-monitor",   menuCode: "anomaly_monitor" },
      { icon: CalendarClock,   label: "任务调度",      path: "/scheduler",         menuCode: "scheduler" },
      { icon: Wrench,          label: "运营工具箱",    path: "/ops-tools",         menuCode: "ops_tools" },
      { icon: ShieldCheck,     label: "审批中心",      path: "/auto-response-approval", menuCode: "auto_response_approval" },
    ],
  },
  {
    label: "游戏配置",
    items: [
      { icon: Layers,          label: "关卡管理",      path: "/levels",            menuCode: "levels" },
      { icon: Target,          label: "探针关卡",      path: "/probes",            menuCode: "probes" },
      { icon: Radio,           label: "难度调度",      path: "/difficulty",        menuCode: "difficulty" },
      { icon: History,         label: "配置版本",      path: "/config-versions",   menuCode: "config_versions" },
    ],
  },
  {
    label: "AI 智能体",
    items: [
      { icon: Bot,             label: "AI 增长顾问",   path: "/ai-assistant",      menuCode: "ai_assistant" },
      { icon: Brain,           label: "知识库",        path: "/knowledge-base",    menuCode: "knowledge_base" },
      { icon: FileBarChart,    label: "AI 日报",       path: "/ai-daily-report",   menuCode: "ai_daily_report" },
      { icon: Lightbulb,       label: "决策日志",      path: "/decision-logs",     menuCode: "decision_logs" },
    ],
  },
  {
    label: "平台设置",
    items: [
      { icon: Folder,          label: "游戏项目",      path: "/game-projects",     menuCode: "game_projects" },
      { icon: Database,        label: "数数科技集成",  path: "/te-integration",    menuCode: "te_integration" },
      { icon: Zap,             label: "数据同步中心",  path: "/data-sync",         menuCode: "data_sync" },
      { icon: Users,           label: "飞书集成",      path: "/feishu-sync",       menuCode: "feishu_sync" },
      { icon: Bell,            label: "飞书通知",      path: "/feishu-notification",menuCode: "feishu_notification" },
      { icon: AlertTriangle,   label: "告警规则",      path: "/alert-rules",       menuCode: "alert_rules" },
      { icon: Shield,          label: "权限管理",      path: "/permissions",       menuCode: "permissions" },
      { icon: FileSearch,      label: "审计日志",      path: "/audit-log",         menuCode: "audit_log" },
      { icon: Settings,        label: "系统配置",      path: "/config",            menuCode: "config" },
      { icon: BookOpen,        label: "SDK 文档",      path: "/sdk-docs",          menuCode: "sdk_docs" },
      { icon: Code,            label: "API 文档",      path: "/api-docs",          menuCode: "api_docs" },
    ],
  },
];

export const allMenuItems = staticMenuGroups.flatMap((g) => g.items);

// i18n map（保持兼容，直接用 label 作为 key）
export const menuI18nMap: Record<string, string> = Object.fromEntries(
  allMenuItems.map(item => [item.menuCode, item.label])
);
