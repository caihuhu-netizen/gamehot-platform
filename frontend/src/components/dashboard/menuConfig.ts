import {
  LayoutDashboard, Users, Layers, Target, TrendingUp, DollarSign,
  FlaskConical, Settings, UserSearch, BarChart3, Shield, Gamepad2,
  RefreshCw, Folder, History, BookOpen, Code, Database, CalendarDays,
  Lightbulb, Megaphone, PieChart, Tv, Sparkles, Bell, UserPlus,
  Undo2, ShoppingCart, FileBarChart, MousePointerClick, Activity,
  AlertTriangle, GitCompare, Wrench, ClipboardList, UserCheck, GitBranch,
  Rocket, ListChecks, FileCheck2, Zap, Bot, Brain, Download, FileSearch,
  Archive, CalendarClock, Table2, ShieldCheck, ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { LayoutGrid, Globe } from "lucide-react";

// ==================== Types ====================
export type MenuItem = { icon: LucideIcon; label: string; path: string; menuCode: string };
export type MenuGroup = { label: string; items: MenuItem[] };

// ==================== Icon Map ====================
export const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Users, Layers, Target, TrendingUp, DollarSign,
  FlaskConical, Settings, UserSearch, BarChart3, Shield, Gamepad2,
  RefreshCw, Folder, History, BookOpen, Code, Database, CalendarDays,
  Lightbulb, Megaphone, PieChart, Tv, Sparkles, Bell, UserPlus,
  Undo2, ShoppingCart, FileBarChart, MousePointerClick, Activity,
  AlertTriangle, GitCompare, Wrench, ClipboardList, UserCheck, GitBranch,
  Rocket, ListChecks, FileCheck2, Zap,
};

// ==================== Menu I18n Mappings ====================
export const menuI18nMap: Record<string, string> = {
  global_view: "menu.globalView",
  dashboard: "menu.dashboard", daily_report: "menu.aiReport", daily_overview: "menu.dailyOverview",
  version_management: "menu.versionManagement", optimization_suggestions: "menu.optimizationSuggestions",
  effect_verification: "menu.effectVerification",
  segments: "menu.segments", loop_engine: "menu.loopEngine", probes: "menu.probes",
  difficulty: "menu.difficulty", cohort_retention: "menu.cohortRetention", levels: "menu.levels",
  user_profiles: "menu.userProfiles", audience: "menu.audience", audience_templates: "menu.audienceTemplates", user_recall: "menu.userRecall",
  push_center: "menu.pushCenter", monetize: "menu.monetize", iap_products: "menu.iapProducts",
  pricing_engine: "menu.pricingEngine", ad_revenue: "menu.adRevenue", experiments: "menu.experiments",
  analytics: "menu.analytics", ai_daily_report: "menu.aiDailyReport",
  ai_assistant: "menu.aiAssistant", knowledge_base: "menu.knowledgeBase",
  comparison_analysis: "menu.comparisonAnalysis", event_analysis: "menu.eventAnalysis",
  custom_report: "menu.customReport", data_export: "menu.dataExport", cost_profit: "menu.costProfit",
  acquisition: "menu.acquisitionChannels", anomaly_monitor: "menu.anomalyMonitor",
  alert_rules: "menu.alertRules", decision_logs: "menu.decisionLogs", ops_tools: "menu.opsTools",
  retention_weekly: "menu.retentionWeekly", user_quality_daily: "menu.userQualityDaily",
  monetize_daily: "menu.monetizeDaily", game_projects: "menu.gameProjects",
  config_versions: "menu.configVersions", sdk_docs: "menu.sdkDocs",
  te_integration: "menu.teIntegration", config: "menu.systemConfig",
  feishu_sync: "menu.feishuSync", feishu_notification: "menu.feishuNotification",
  permissions: "menu.permissions", audit_log: "menu.auditLog",
  perf_monitor: "menu.perfMonitor", data_archive: "menu.dataArchive",
  inspection_report: "menu.inspectionReport",
  inspection: "menu.inspectionReport",
  api_docs: "menu.apiDocs",
  scheduler: "menu.scheduler",
  arch_roadmap: "menu.archRoadmap",
  data_sync: "menu.dataSync",
  auto_response_approval: "menu.autoResponseApproval",
};

export const groupI18nMap: Record<string, string> = {
  "产品优化": "menu.productOptimization",
  "用户洞察": "menu.userInsight",
  "经营数据": "menu.businessData",
  "游戏配置": "menu.gameConfig",
  "平台管理": "menu.platformManagement",
};

// ==================== Static Menu Groups (5 Navigation Groups) ====================
export const staticMenuGroups: MenuGroup[] = [
  {
    label: "产品优化",
    items: [
      { icon: LayoutDashboard, label: "经营仪表盘", path: "/", menuCode: "dashboard" },
      { icon: Sparkles, label: "AI 日报", path: "/daily-report", menuCode: "daily_report" },
      { icon: Rocket, label: "版本管理", path: "/version-management", menuCode: "version_management" },
      { icon: ListChecks, label: "优化建议", path: "/optimization-suggestions", menuCode: "optimization_suggestions" },
      { icon: FileCheck2, label: "效果验证", path: "/effect-verification", menuCode: "effect_verification" },
      { icon: FlaskConical, label: "A/B 实验", path: "/experiments", menuCode: "experiments" },
      { icon: GitCompare, label: "对比分析", path: "/comparison-analysis", menuCode: "comparison_analysis" },
    ],
  },
  {
    label: "用户洞察",
    items: [
      { icon: Users, label: "用户分层", path: "/segments", menuCode: "segments" },
      { icon: UserSearch, label: "用户画像", path: "/user-profiles", menuCode: "user_profiles" },
      { icon: UserPlus, label: "用户分群", path: "/audience", menuCode: "audience" },
      { icon: LayoutGrid, label: "分群模板库", path: "/audience/templates", menuCode: "audience_templates" },
      { icon: CalendarDays, label: "Cohort留存", path: "/cohort-retention", menuCode: "cohort_retention" },
      { icon: RefreshCw, label: "闭环引擎", path: "/loop-engine", menuCode: "loop_engine" },
      { icon: MousePointerClick, label: "事件分析", path: "/event-analysis", menuCode: "event_analysis" },
      { icon: BarChart3, label: "数据分析", path: "/analytics", menuCode: "analytics" },
    ],
  },
  {
    label: "经营数据",
    items: [
      { icon: Table2, label: "每日总览", path: "/daily-overview", menuCode: "daily_overview" },
      { icon: Globe, label: "全球视图", path: "/global-view", menuCode: "global_view" },
      { icon: Megaphone, label: "投放管理", path: "/acquisition", menuCode: "acquisition" },
      { icon: DollarSign, label: "变现管理", path: "/monetize", menuCode: "monetize" },
      { icon: Tv, label: "广告聚合", path: "/ad-revenue", menuCode: "ad_revenue" },
      { icon: ShoppingCart, label: "内购商品", path: "/iap-products", menuCode: "iap_products" },
      { icon: DollarSign, label: "智能定价", path: "/pricing-engine", menuCode: "pricing_engine" },
      { icon: PieChart, label: "成本利润", path: "/cost-profit", menuCode: "cost_profit" },
      { icon: AlertTriangle, label: "异常监控", path: "/anomaly-monitor", menuCode: "anomaly_monitor" },
      { icon: ShieldCheck, label: "审批中心", path: "/auto-response-approval", menuCode: "auto_response_approval" },
      { icon: Wrench, label: "运营工具箱", path: "/ops-tools", menuCode: "ops_tools" },
      { icon: FileBarChart, label: "自定义报表", path: "/custom-report", menuCode: "custom_report" },
      { icon: Download, label: "数据导出", path: "/data-export", menuCode: "data_export" },
    ],
  },
  {
    label: "游戏配置",
    items: [
      { icon: Layers, label: "关卡管理", path: "/levels", menuCode: "levels" },
      { icon: Target, label: "探针关卡", path: "/probes", menuCode: "probes" },
      { icon: TrendingUp, label: "难度调度", path: "/difficulty", menuCode: "difficulty" },
      { icon: Undo2, label: "用户召回", path: "/user-recall", menuCode: "user_recall" },
      { icon: ShieldAlert, label: "流失预测", path: "/churn-prediction", menuCode: "churn_prediction" },
      { icon: Bell, label: "推送中心", path: "/push-center", menuCode: "push_center" },
      { icon: GitBranch, label: "用户旅程", path: "/journey-builder", menuCode: "journey_builder" },
      { icon: History, label: "配置版本", path: "/config-versions", menuCode: "config_versions" },
      { icon: Settings, label: "系统配置", path: "/config", menuCode: "config" },
    ],
  },
  {
    label: "平台管理",
    items: [
      { icon: Folder, label: "游戏项目", path: "/game-projects", menuCode: "game_projects" },
      { icon: Zap, label: "数据同步中心", path: "/data-sync", menuCode: "data_sync" },
      { icon: Bot, label: "AI 产品顾问", path: "/ai-assistant", menuCode: "ai_assistant" },
      { icon: Brain, label: "知识库", path: "/knowledge-base", menuCode: "knowledge_base" },
      { icon: Database, label: "数数科技集成", path: "/te-integration", menuCode: "te_integration" },
      { icon: Users, label: "飞书集成", path: "/feishu-sync", menuCode: "feishu_sync" },
      { icon: Bell, label: "飞书通知", path: "/feishu-notification", menuCode: "feishu_notification" },
      { icon: Shield, label: "权限管理", path: "/permissions", menuCode: "permissions" },
      { icon: FileSearch, label: "审计日志", path: "/audit-log", menuCode: "audit_log" },
      { icon: BookOpen, label: "SDK文档", path: "/sdk-docs", menuCode: "sdk_docs" },
      { icon: FileSearch, label: "API文档中心", path: "/api-docs", menuCode: "api_docs" },
      { icon: CalendarClock, label: "任务调度", path: "/scheduler", menuCode: "scheduler" },
    ],
  },
];

export const allMenuItems = staticMenuGroups.flatMap((g) => g.items);
