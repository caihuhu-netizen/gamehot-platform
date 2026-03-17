import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Server, Brain, Users, FlaskConical, DollarSign, Megaphone,
  BarChart3, Shield, Layers, ArrowRight, CheckCircle2, Clock,
  AlertTriangle, Zap, Network, Bot, Database, MessageSquare,
  CalendarClock, ChevronRight, ExternalLink, GitBranch,
  Unlink, Tag, Settings2, HeartPulse, ScrollText, FileCode2,
  Link2, Activity, RefreshCw, Cloud, Globe, Container, Cpu,
  HardDrive, Lock, Workflow, TrendingUp, CircleDot, } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ── Service definitions ──
interface ServiceDef {
  id: string;
  name: string;
  nameEn: string;
  icon: React.ElementType;
  priority: "P0" | "P1" | "P2";
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  descriptionEn: string;
  modules: string[];
  tables: number;
  agentRole: string;
  agentRoleEn: string;
  status: "planned" | "in-progress" | "ready";
  quarter: string;
}

const services: ServiceDef[] = [
  {
    id: "scheduler",
    name: "任务调度中心",
    nameEn: "Scheduler Service",
    icon: CalendarClock,
    priority: "P0",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "所有定时任务和异步任务的统一编排引擎，是 OpenClaw Agent 的心跳和节拍器",
    descriptionEn: "Unified orchestration engine for all scheduled and async tasks, the heartbeat of OpenClaw Agents",
    modules: ["scheduler", "scheduledTasks", "taskExecutionLogs"],
    tables: 2,
    agentRole: "任务编排Agent — 接收上层指令，按时间策略调度其他Agent执行",
    agentRoleEn: "Task Orchestration Agent — receives commands and schedules other Agents by time strategy",
    status: "in-progress",
    quarter: "2026 Q2",
  },
  {
    id: "intelligence",
    name: "智能分析引擎",
    nameEn: "Intelligence Engine",
    icon: Brain,
    priority: "P0",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    description: "所有 AI/ML 能力的统一服务，是 OpenClaw 的大脑",
    descriptionEn: "Unified AI/ML capability service, the brain of OpenClaw",
    modules: ["aiAssistant", "inspection", "productOptimization", "dailyReport", "alertEnhancement", "pricingEngine", "ltvPrediction"],
    tables: 14,
    agentRole: "分析Agent矩阵 — 包含巡检Agent、预测Agent、异常检测Agent、定价Agent",
    agentRoleEn: "Analysis Agent Matrix — Inspection, Prediction, Anomaly Detection, Pricing Agents",
    status: "planned",
    quarter: "2026 Q2",
  },
  {
    id: "growth",
    name: "用户增长中心",
    nameEn: "Growth Center",
    icon: Users,
    priority: "P1",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    description: "用户生命周期管理的核心服务，覆盖分层、推送、召回全链路",
    descriptionEn: "Core service for user lifecycle management, covering segmentation, push, and recall",
    modules: ["segmentConfig", "segmentTools", "pushCenter", "recallPlans", "audience", "userProfiles"],
    tables: 16,
    agentRole: "增长Agent — 根据用户行为数据自动调整分层策略、触发推送和召回",
    agentRoleEn: "Growth Agent — auto-adjusts segmentation, triggers push and recall based on user behavior",
    status: "planned",
    quarter: "2026 Q3",
  },
  {
    id: "experiment",
    name: "实验平台",
    nameEn: "Experiment Platform",
    icon: FlaskConical,
    priority: "P1",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    description: "A/B 实验的全生命周期管理，从设计到分析",
    descriptionEn: "Full lifecycle management of A/B experiments, from design to analysis",
    modules: ["experiments", "comparison", "eventAnalysis", "decisionLogs"],
    tables: 7,
    agentRole: "实验Agent — AI辅助实验设计、自动分析实验结果、推荐最优方案",
    agentRoleEn: "Experiment Agent — AI-assisted design, auto-analysis, and optimal variant recommendation",
    status: "planned",
    quarter: "2026 Q3",
  },
  {
    id: "monetization",
    name: "变现引擎",
    nameEn: "Monetization Engine",
    icon: DollarSign,
    priority: "P1",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    description: "游戏变现策略的统一管理，覆盖内购、广告、定价全链路",
    descriptionEn: "Unified monetization strategy management covering IAP, ads, and pricing",
    modules: ["monetize", "iapProducts", "adRevenue", "pricingEngine", "costProfit"],
    tables: 15,
    agentRole: "变现Agent — 根据用户分层和行为数据，自动调整变现策略和定价",
    agentRoleEn: "Monetization Agent — auto-adjusts monetization strategy and pricing based on user data",
    status: "planned",
    quarter: "2026 Q3",
  },
  {
    id: "attribution",
    name: "投放归因中心",
    nameEn: "Attribution Center",
    icon: Megaphone,
    priority: "P2",
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    description: "用户获取和投放效果的统一分析平台",
    descriptionEn: "Unified platform for user acquisition and campaign attribution analysis",
    modules: ["acquisition", "teIntegration", "campaigns"],
    tables: 10,
    agentRole: "投放Agent — 监控投放ROI，自动调整预算分配和渠道策略",
    agentRoleEn: "Attribution Agent — monitors ROI, auto-adjusts budget allocation and channel strategy",
    status: "planned",
    quarter: "2026 Q4",
  },
  {
    id: "data-platform",
    name: "数据平台",
    nameEn: "Data Platform",
    icon: BarChart3,
    priority: "P2",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    description: "数据分析、报表、导出的统一服务",
    descriptionEn: "Unified service for data analysis, reports, and exports",
    modules: ["analytics", "dashboard", "reports", "customReports", "dailyReport", "exportCenter", "loopEngine"],
    tables: 7,
    agentRole: "数据Agent — 自动生成日报周报、发现数据异常、回答数据查询",
    agentRoleEn: "Data Agent — auto-generates reports, discovers anomalies, answers data queries",
    status: "planned",
    quarter: "2026 Q4",
  },
  {
    id: "ops-security",
    name: "运维安全中心",
    nameEn: "Ops & Security",
    icon: Shield,
    priority: "P2",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    description: "系统运维、权限、审计、配置管理的统一服务",
    descriptionEn: "Unified service for system operations, permissions, audit, and configuration",
    modules: ["configVersions", "configRollback", "auditLog", "perfMonitor", "archiving", "permissions", "alerts", "opsTools", "feishuNotification"],
    tables: 15,
    agentRole: "运维Agent — 自动巡检系统健康度、处理告警、执行归档清理",
    agentRoleEn: "Ops Agent — auto-inspects system health, handles alerts, executes archiving",
    status: "planned",
    quarter: "2026 Q4",
  },
  {
    id: "game-config",
    name: "游戏配置中心",
    nameEn: "Game Config Service",
    icon: Layers,
    priority: "P1",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    description: "关卡配置、难度曲线、游戏项目、SDK 接入的独立服务（第一个拆分试点）",
    descriptionEn: "Independent service for levels, difficulty curves, game projects, and SDK access (first decomposition pilot)",
    modules: ["config", "levels", "gameProjects", "configVersions", "configRollback"],
    tables: 8,
    agentRole: "配置Agent — 管理关卡配置、难度曲线调优、SDK 版本发布",
    agentRoleEn: "Config Agent — manages level configs, difficulty curve tuning, SDK version publishing",
    status: "in-progress",
    quarter: "2026 Q1",
  },
];

// ── Phase timeline ──
interface Phase {
  id: string;
  name: string;
  nameEn: string;
  quarter: string;
  goal: string;
  goalEn: string;
  services: string[];
  milestone: string;
  milestoneEn: string;
  progress: number;
}

const phases: Phase[] = [
  {
    id: "phase1",
    name: "基础设施独立",
    nameEn: "Infrastructure Independence",
    quarter: "2026 Q2",
    goal: "将无业务耦合的基础设施服务率先独立，为后续拆分铺路",
    goalEn: "Extract infrastructure services with no business coupling first, paving the way for further decomposition",
    services: ["scheduler", "intelligence"],
    milestone: "调度中心和智能分析引擎可被外部系统通过 API 调用",
    milestoneEn: "Scheduler and Intelligence Engine accessible via external API calls",
    progress: 30,
  },
  {
    id: "phase2",
    name: "核心业务拆分",
    nameEn: "Core Business Decomposition",
    quarter: "2026 Q3",
    goal: "将核心业务域拆分为独立服务，实现业务解耦",
    goalEn: "Decompose core business domains into independent services for decoupling",
    services: ["growth", "experiment", "monetization"],
    milestone: "三大核心业务域独立运行，通过 API 互通",
    milestoneEn: "Three core business domains running independently, communicating via APIs",
    progress: 0,
  },
  {
    id: "phase3",
    name: "全面服务化 + OpenClaw",
    nameEn: "Full Microservices + OpenClaw",
    quarter: "2026 Q4",
    goal: "完成剩余服务拆分，接入 OpenClaw 编排层",
    goalEn: "Complete remaining service decomposition and integrate OpenClaw orchestration layer",
    services: ["attribution", "data-platform", "ops-security"],
    milestone: "全部服务独立运行，OpenClaw 可编排所有 Agent 协作完成复杂任务",
    milestoneEn: "All services running independently, OpenClaw orchestrating all Agents for complex tasks",
    progress: 0,
  },
];

// ── Priority badge ──
function PriorityBadge({ priority }: { priority: string }) {
  const colorMap: Record<string, string> = {
    P0: "bg-red-100 text-red-700 border-red-200",
    P1: "bg-orange-100 text-orange-700 border-orange-200",
    P2: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${colorMap[priority] || ""}`}>
      {priority}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; labelEn: string; cls: string; icon: React.ElementType }> = {
    planned: { label: "规划中", labelEn: "Planned", cls: "bg-gray-100 text-gray-600", icon: Clock },
    "in-progress": { label: "开发中", labelEn: "In Progress", cls: "bg-blue-100 text-blue-600", icon: Zap },
    ready: { label: "已就绪", labelEn: "Ready", cls: "bg-green-100 text-green-600", icon: CheckCircle2 },
  };
  const s = map[status] || map.planned;
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={`text-xs ${s.cls} gap-1`}>
      <Icon className="h-3 w-3" />
      {s.label}
    </Badge>
  );
}

// ── Architecture diagram ──
function ArchitectureDiagram() {
  return (
    <div className="space-y-3">
      {/* OpenClaw Layer */}
      <div className="rounded-xl border-2 border-dashed border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="h-5 w-5 text-purple-600" />
          <span className="font-bold text-purple-700 text-sm">OpenClaw 智能体编排层</span>
          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-600 border-purple-200">Agent Orchestrator</Badge>
        </div>
        <p className="text-xs text-purple-600/70">多智能体协作 · 任务分解 · 经验升华 · 知识工程</p>
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
          <div className="w-px h-3 bg-border" />
          <span className="text-[10px]">MCP / A2A / REST</span>
          <div className="w-px h-3 bg-border" />
          <ChevronRight className="h-3 w-3 rotate-90" />
        </div>
      </div>

      {/* API Gateway */}
      <div className="rounded-lg border bg-slate-50 p-2 text-center">
        <span className="text-xs font-semibold text-slate-600">API Gateway (Kong / Traefik)</span>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {services.map((svc) => {
          const Icon = svc.icon;
          return (
            <div
              key={svc.id}
              className={`rounded-lg border ${svc.borderColor} ${svc.bgColor} p-2.5 text-center transition-all hover:shadow-md`}
            >
              <Icon className={`h-5 w-5 mx-auto mb-1 ${svc.color}`} />
              <div className="text-xs font-semibold truncate">{svc.name}</div>
              <div className="text-[10px] text-muted-foreground">{svc.tables} tables</div>
            </div>
          );
        })}
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
          <div className="w-px h-3 bg-border" />
          <ChevronRight className="h-3 w-3 rotate-90" />
        </div>
      </div>

      {/* Infrastructure */}
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-gray-500" />
          <span className="font-semibold text-gray-600 text-xs">共享基础设施层</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {["MySQL", "S3 Storage", "Redis / MQ", "ELK Logging", "Consul / etcd"].map((item) => (
            <Badge key={item} variant="outline" className="text-[10px] bg-white">
              {item}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Agent Collaboration Example ──
function AgentCollabExample() {
  const steps = [
    { agent: "数据Agent", action: "拉取本周留存数据和对比数据", icon: BarChart3, color: "text-cyan-600" },
    { agent: "分析Agent", action: "AI分析留存下降的可能原因", icon: Brain, color: "text-purple-600" },
    { agent: "增长Agent", action: "查询当前分层配置和推送策略", icon: Users, color: "text-green-600" },
    { agent: "实验Agent", action: "推荐A/B实验方案验证假设", icon: FlaskConical, color: "text-orange-600" },
    { agent: "调度Agent", action: "注册实验监控定时任务", icon: CalendarClock, color: "text-blue-600" },
    { agent: "汇总", action: "生成完整分析报告推送到飞书", icon: MessageSquare, color: "text-indigo-600" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Network className="h-4 w-4 text-purple-500" />
          Agent 协作示例
        </CardTitle>
        <p className="text-xs text-muted-foreground">用户请求："分析本周留存下降原因并制定改善方案"</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                  {i + 1}
                </div>
                <Icon className={`h-4 w-4 ${step.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold">{step.agent}</span>
                  <ArrowRight className="h-3 w-3 inline mx-1 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{step.action}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Service Preparation Tab ──
function ServicePreparationTab() {
  const healthQuery = trpc.healthCheck.checkAll.useQuery(undefined, {
    refetchInterval: 30000,
    retry: 1,
  });

  // Round 1: 6 items (already completed)
  const round1Items = [
    { id: "api-docs", title: "#1 API 契约文档化", icon: FileCode2, color: "text-green-600", bgColor: "bg-green-50", status: "done" as const, description: "tRPC 路由自动扫描 + 参数类型提取 + 在线测试", details: [{ label: "覆盖", value: "44 个路由模块" }] },
    { id: "decouple", title: "#2 模块间依赖解耦", icon: Unlink, color: "text-blue-600", bgColor: "bg-blue-50", status: "done" as const, description: "消除 router 直接 import → shared/masking.ts + db/dailyReportAggregation.ts", details: [{ label: "解耦", value: "3 组跨域依赖" }] },
    { id: "table-ownership", title: "#3 数据表归属标记", icon: Tag, color: "text-purple-600", bgColor: "bg-purple-50", status: "done" as const, description: "schema.ts 104 张表全部添加 @service 归属标记", details: [{ label: "覆盖", value: "9 域 + 1 基础设施" }] },
    { id: "config-external", title: "#4 配置外部化", icon: Settings2, color: "text-orange-600", bgColor: "bg-orange-50", status: "done" as const, description: "shared/serviceConfig.ts 集中管理飞书/LLM/限流配置", details: [{ label: "模块", value: "serviceConfig.ts" }] },
    { id: "health-check", title: "#5 健康检查端点", icon: HeartPulse, color: "text-red-600", bgColor: "bg-red-50", status: "done" as const, description: "9 个业务域独立健康探针 + healthCheck router", details: [{ label: "API", value: "checkAll / checkDomain" }] },
    { id: "event-log", title: "#6 事件日志标准化", icon: ScrollText, color: "text-cyan-600", bgColor: "bg-cyan-50", status: "done" as const, description: "CloudEvents 简化版 + 30+ 事件类型 + 域发射器", details: [{ label: "模块", value: "shared/eventLog.ts" }] },
  ];

  // Round 2: 14 items (newly completed)
  const round2Items = [
    { id: "contracts", title: "#7 服务间契约类型", icon: FileCode2, color: "text-indigo-600", bgColor: "bg-indigo-50", status: "done" as const, description: "9 个域契约类型文件 + barrel 导出", details: [{ label: "目录", value: "shared/contracts/" }], layer: 1 },
    { id: "tx-boundary", title: "#8 事务边界标记", icon: Database, color: "text-red-600", bgColor: "bg-red-50", status: "done" as const, description: "16 个关键事务点（8 个跨域需 Saga）+ withTransaction", details: [{ label: "模块", value: "shared/transactions.ts" }], layer: 1 },
    { id: "file-split", title: "#9 大文件拆分方案", icon: Layers, color: "text-amber-600", bgColor: "bg-amber-50", status: "done" as const, description: "7 个大文件 → 18 个子模块拆分方案", details: [{ label: "模块", value: "shared/moduleSplitGuide.ts" }], layer: 1 },
    { id: "error-codes", title: "#10 错误码标准化", icon: AlertTriangle, color: "text-rose-600", bgColor: "bg-rose-50", status: "done" as const, description: "60+ 业务错误码覆盖 9 域 + BizError 封装", details: [{ label: "模块", value: "shared/errorCodes.ts" }], layer: 1 },
    { id: "structured-log", title: "#11 结构化日志", icon: ScrollText, color: "text-teal-600", bgColor: "bg-teal-50", status: "done" as const, description: "JSON 日志 + 域预置 logger + timer + child logger", details: [{ label: "模块", value: "shared/logger.ts" }], layer: 2 },
    { id: "tracing", title: "#12 链路追踪", icon: GitBranch, color: "text-violet-600", bgColor: "bg-violet-50", status: "done" as const, description: "AsyncLocalStorage + tRPC middleware + HTTP header 透传", details: [{ label: "模块", value: "shared/tracing.ts" }], layer: 2 },
    { id: "slow-query", title: "#13 慢查询监控", icon: Clock, color: "text-yellow-600", bgColor: "bg-yellow-50", status: "done" as const, description: "trackQuery + 统计 API + Top-N 排行", details: [{ label: "模块", value: "shared/slowQueryMonitor.ts" }], layer: 2 },
    { id: "circuit-breaker", title: "#14 外部服务熔断", icon: Zap, color: "text-orange-600", bgColor: "bg-orange-50", status: "done" as const, description: "3 状态机 + 5 个预配置熔断器 (LLM/飞书/TE/S3/通知)", details: [{ label: "模块", value: "shared/circuitBreaker.ts" }], layer: 2 },
    { id: "feature-flags", title: "#15 Feature Flag", icon: Settings2, color: "text-sky-600", bgColor: "bg-sky-50", status: "done" as const, description: "4 种策略 + 服务迁移灰度标记", details: [{ label: "模块", value: "shared/featureFlags.ts" }], layer: 3 },
    { id: "idempotency", title: "#16 幂等性保护", icon: Shield, color: "text-emerald-600", bgColor: "bg-emerald-50", status: "done" as const, description: "withIdempotency + 9 个关键操作标记 + TTL 清理", details: [{ label: "模块", value: "shared/idempotency.ts" }], layer: 3 },
    { id: "task-queue", title: "#17 异步任务队列", icon: CalendarClock, color: "text-blue-600", bgColor: "bg-blue-50", status: "done" as const, description: "ITaskQueue 接口 + 优先级队列 + 死信队列 + 14 种任务", details: [{ label: "模块", value: "shared/taskQueue.ts" }], layer: 3 },
    { id: "rw-split", title: "#18 读写分离标记", icon: Database, color: "text-cyan-600", bgColor: "bg-cyan-50", status: "done" as const, description: "42 个 db 函数标注 (24 只读 + 18 读写)", details: [{ label: "模块", value: "shared/rwSeparation.ts" }], layer: 3 },
    { id: "api-version", title: "#19 API 版本化", icon: Tag, color: "text-fuchsia-600", bgColor: "bg-fuchsia-50", status: "done" as const, description: "30+ procedure 版本注册 + 废弃管理", details: [{ label: "模块", value: "shared/apiVersioning.ts" }], layer: 3 },
    { id: "e2e-test", title: "#20 集成测试框架", icon: CheckCircle2, color: "text-lime-600", bgColor: "bg-lime-50", status: "done" as const, description: "10 个 E2E 场景 (3P0+4P1+3P2) 覆盖 9 域 37 步骤", details: [{ label: "模块", value: "shared/integrationTestFramework.ts" }], layer: 3 },
  ];

  const preparationItems = [...round1Items, ...round2Items.map(i => ({ ...i, titleEn: "" }))];

  const doneCount = preparationItems.filter(i => i.status === "done").length;
  const totalCount = preparationItems.length;

  // Coupling matrix data
  const couplingData = [
    { table: "users", fanOut: 13, domains: "用户增长/智能分析/变现/归因/数据/运维/实验/配置" },
    { table: "userSegments", fanOut: 11, domains: "用户增长/智能分析/变现/实验/数据" },
    { table: "gameUsers", fanOut: 9, domains: "用户增长/智能分析/变现/归因" },
    { table: "userBehaviorStats", fanOut: 7, domains: "用户增长/智能分析/变现" },
    { table: "userPaymentRecords", fanOut: 6, domains: "变现/智能分析/数据" },
    { table: "levels", fanOut: 5, domains: "游戏配置/智能分析/实验" },
    { table: "abExperiments", fanOut: 5, domains: "实验/智能分析/数据" },
  ];

  // Cross-domain page data
  const crossDomainPages = [
    { page: "Home 仪表盘", domains: 5, list: "dashboard + costProfit + dailyReport + loopEngine + alerts" },
    { page: "Segments 分层", domains: 4, list: "segmentConfig + segmentTools + productOptimization + userProfiles" },
    { page: "UserProfiles", domains: 2, list: "analytics + userProfiles" },
    { page: "Permissions", domains: 2, list: "feishu + logs" },
  ];

  // Shared capability consumers
  const sharedCapabilities = [
    { name: "AI / LLM", consumers: ["aiAssistant", "analytics", "dailyReport", "opsTools", "pricingEngine", "productOptimization"], icon: Brain, color: "text-purple-600" },
    { name: "通知服务", consumers: ["alertEnhancement", "analytics", "archiving", "dailyReport", "inspection", "productOptimization", "teIntegration"], icon: Megaphone, color: "text-orange-600" },
    { name: "飞书集成", consumers: ["alerts", "apiDocs", "archiving", "dailyReport", "feishuNotification"], icon: MessageSquare, color: "text-blue-600" },
    { name: "S3 存储", consumers: ["exportCenter", "segmentTools"], icon: Database, color: "text-cyan-600" },
  ];

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold">服务化准备工作完成度</h3>
              <p className="text-xs text-muted-foreground">单体架构下的 20 项准备工作（两轮），为服务化拆分铺路</p>
            </div>
            <Badge className="bg-green-100 text-green-700 border-green-200 text-sm px-3 py-1">
              {doneCount}/{totalCount} 完成
            </Badge>
          </div>
          <Progress value={(doneCount / totalCount) * 100} className="h-3" />
        </CardContent>
      </Card>

      {/* Round 1: Foundation (6 items) */}
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">第一轮：基础准备（6 项）</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {round1Items.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.id} className="transition-all hover:shadow-md">
                <CardContent className="pt-4 pb-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${item.bgColor}`}>
                        <Icon className={`h-4 w-4 ${item.color}`} />
                      </div>
                      <span className="text-xs font-semibold">{item.title}</span>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-[10px] py-0">
                      <CheckCircle2 className="h-2.5 w-2.5" />完成
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Round 2: Advanced (14 items, grouped by layer) */}
      {[1, 2, 3].map((layer) => {
        const layerNames = { 1: "第一层：拆分质量", 2: "第二层：运行时可观测性", 3: "第三层：拆分后运维" } as Record<number, string>;
        const layerItems = round2Items.filter(i => i.layer === layer);
        return (
          <div key={layer} className="space-y-1">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">第二轮 · {layerNames[layer]}（{layerItems.length} 项）</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {layerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.id} className="transition-all hover:shadow-md">
                    <CardContent className="pt-4 pb-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${item.bgColor}`}>
                            <Icon className={`h-4 w-4 ${item.color}`} />
                          </div>
                          <span className="text-xs font-semibold">{item.title}</span>
                        </div>
                        <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-[10px] py-0">
                          <CheckCircle2 className="h-2.5 w-2.5" />完成
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{item.description}</p>
                      <div className="text-[10px] font-mono text-muted-foreground/70">{item.details[0]?.value}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Legacy grid - hidden, replaced by grouped layout above */}
      <div className="hidden grid grid-cols-1 md:grid-cols-2 gap-4">
        {preparationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id} className="transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${item.bgColor}`}>
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{item.title}</CardTitle>
                      {"titleEn" in item && (item as Record<string, unknown>).titleEn ? <p className="text-[10px] text-muted-foreground">{String((item as Record<string, unknown>).titleEn)}</p> : null}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    已完成
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">{item.description}</p>
                <div className="space-y-1">
                  {item.details.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      <span className="text-muted-foreground">{d.label}：</span>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Coupling Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Shared Table Fan-out */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4 text-red-500" />
              数据表耦合热点（模块扇出度）
            </CardTitle>
            <p className="text-xs text-muted-foreground">被多个业务域共享的核心表，服务化时需重点处理</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {couplingData.map((row) => (
                <div key={row.table} className="flex items-center gap-3">
                  <div className="w-36 text-xs font-mono font-semibold truncate">{row.table}</div>
                  <div className="flex-1">
                    <div className="h-4 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          row.fanOut >= 10 ? "bg-red-400" : row.fanOut >= 7 ? "bg-orange-400" : "bg-yellow-400"
                        }`}
                        style={{ width: `${(row.fanOut / 13) * 100}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{row.fanOut} 个模块</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cross-Domain Pages */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Network className="h-4 w-4 text-blue-500" />
              前端页面跨域调用
            </CardTitle>
            <p className="text-xs text-muted-foreground">单个页面调用多个业务域 API 的情况</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {crossDomainPages.map((p) => (
              <div key={p.page} className="rounded-lg border p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{p.page}</span>
                  <Badge variant="outline" className={`text-xs ${
                    p.domains >= 4 ? "bg-red-50 text-red-600 border-red-200" : "bg-yellow-50 text-yellow-600 border-yellow-200"
                  }`}>
                    {p.domains} 个域
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">{p.list}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Shared Capabilities */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-green-500" />
            共享能力消费关系（生产力协同链路）
          </CardTitle>
          <p className="text-xs text-muted-foreground">多个模块共享的基础能力，服务化时应抽取为独立服务</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sharedCapabilities.map((cap) => {
              const CapIcon = cap.icon;
              return (
                <div key={cap.name} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CapIcon className={`h-4 w-4 ${cap.color}`} />
                    <span className="text-xs font-semibold">{cap.name}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">{cap.consumers.length} 个消费者</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cap.consumers.map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px] py-0">{c}</Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Live Health Check */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              实时健康检查
            </CardTitle>
            {healthQuery.data && (
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${
                  healthQuery?.data?.overall === "healthy" ? "bg-green-100 text-green-700 border-green-200" :
                  healthQuery?.data?.overall === "degraded" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                  "bg-red-100 text-red-700 border-red-200"
                }`}>
                  {healthQuery?.data?.overall === "healthy" ? "全部健康" :
                   healthQuery?.data?.overall === "degraded" ? "部分降级" : "异常"}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {healthQuery?.data?.totalLatencyMs}ms
                </span>
                <button
                  onClick={() => healthQuery.refetch()}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title="刷新"
                >
                  <RefreshCw className={`h-3 w-3 text-muted-foreground ${healthQuery.isFetching ? "animate-spin" : ""}`} />
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {healthQuery.isLoading ? (
            <div className="text-xs text-muted-foreground text-center py-4">正在检查各业务域健康状态...</div>
          ) : healthQuery.error ? (
            <div className="text-xs text-red-500 text-center py-4">健康检查失败，请登录后重试</div>
          ) : healthQuery.data ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {healthQuery?.data?.domains.map((domain) => (
                <div key={domain.service} className={`rounded-lg border p-2.5 ${
                  domain.status === "healthy" ? "border-green-200 bg-green-50/50" :
                  domain.status === "degraded" ? "border-yellow-200 bg-yellow-50/50" :
                  "border-red-200 bg-red-50/50"
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{domain.serviceZh}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      domain.status === "healthy" ? "bg-green-500" :
                      domain.status === "degraded" ? "bg-yellow-500" : "bg-red-500"
                    }`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{domain.service}</span>
                    <span className="text-[10px] text-muted-foreground">{domain.latencyMs}ms</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Decomposition Pilot Status */}
      <Card className="border-teal-200 bg-gradient-to-r from-teal-50/50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-teal-600" />
            拆分试点：游戏配置中心 (Game Config Service)
            <Badge className="bg-teal-100 text-teal-700 border-teal-200 ml-2">In Progress</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">第一个完成服务化拆分的业务域，耦合度最低，外部依赖全部只读</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-teal-600">8</div>
              <div className="text-xs text-muted-foreground">数据表</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-teal-600">5</div>
              <div className="text-xs text-muted-foreground">Router</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-teal-600">7</div>
              <div className="text-xs text-muted-foreground">前端页面</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-teal-600">9</div>
              <div className="text-xs text-muted-foreground">服务测试</div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { step: "依赖边界分析", done: true, detail: "8表/5router/2db/7页面，外部依赖全部只读" },
              { step: "服务接口设计", done: true, detail: "IGameConfigService + LocalAdapter + RemoteAdapter预留" },
              { step: "跨域引用替换", done: true, detail: "globalSearch 通过服务接口访问 levels/gameProjects" },
              { step: "服务切换验证", done: true, detail: "ServiceFactory 支持运行时 Local→Remote 无缝切换" },
              { step: "独立部署验证", done: false, detail: "待实施：独立进程 + HTTP 通信适配器" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                {s.done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <span className={`text-xs font-medium ${s.done ? '' : 'text-muted-foreground'}`}>{s.step}</span>
                  <span className="text-xs text-muted-foreground ml-2">— {s.detail}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-white rounded-lg border">
            <div className="text-xs font-medium mb-2">拆分架构示意</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="px-2 py-1 bg-teal-100 text-teal-700 rounded font-mono">GameConfigService</div>
              <ArrowRight className="h-3 w-3" />
              <div className="px-2 py-1 bg-gray-100 rounded font-mono">IGameConfigService</div>
              <ArrowRight className="h-3 w-3" />
              <div className="flex gap-1">
                <div className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono text-[10px]">LocalAdapter (当前)</div>
                <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono text-[10px]">RemoteAdapter (预留)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Readiness data for services ──
const serviceReadiness: Record<string, { contract: number; decouple: number; testing: number; infra: number; data: number; overall: number }> = {
  gameConfig: { contract: 95, decouple: 90, testing: 88, infra: 92, data: 95, overall: 92 },
  scheduler: { contract: 90, decouple: 85, testing: 82, infra: 90, data: 88, overall: 88 },
  intelligence: { contract: 75, decouple: 60, testing: 65, infra: 70, data: 55, overall: 65 },
  growth: { contract: 80, decouple: 65, testing: 70, infra: 75, data: 60, overall: 70 },
  monetization: { contract: 78, decouple: 62, testing: 68, infra: 72, data: 58, overall: 68 },
  attribution: { contract: 72, decouple: 55, testing: 60, infra: 68, data: 50, overall: 61 },
  dataPlatform: { contract: 70, decouple: 50, testing: 55, infra: 65, data: 45, overall: 57 },
  ops: { contract: 68, decouple: 48, testing: 52, infra: 62, data: 42, overall: 54 },
  experiment: { contract: 65, decouple: 45, testing: 50, infra: 60, data: 40, overall: 52 },
};

// Service dependency edges
const dependencyEdges: { from: string; to: string; type: "sync" | "async" | "data" }[] = [
  { from: "scheduler", to: "intelligence", type: "async" },
  { from: "scheduler", to: "ops", type: "async" },
  { from: "scheduler", to: "dataPlatform", type: "async" },
  { from: "intelligence", to: "growth", type: "sync" },
  { from: "intelligence", to: "monetization", type: "sync" },
  { from: "intelligence", to: "dataPlatform", type: "data" },
  { from: "growth", to: "experiment", type: "sync" },
  { from: "growth", to: "attribution", type: "data" },
  { from: "monetization", to: "attribution", type: "data" },
  { from: "monetization", to: "dataPlatform", type: "data" },
  { from: "ops", to: "intelligence", type: "sync" },
  { from: "experiment", to: "dataPlatform", type: "data" },
  { from: "gameConfig", to: "intelligence", type: "data" },
  { from: "gameConfig", to: "growth", type: "data" },
];

// Coupling matrix (shared tables between services)
const couplingMatrix: { s1: string; s2: string; shared: number }[] = [
  { s1: "growth", s2: "intelligence", shared: 3 },
  { s1: "growth", s2: "monetization", shared: 2 },
  { s1: "growth", s2: "attribution", shared: 2 },
  { s1: "intelligence", s2: "dataPlatform", shared: 2 },
  { s1: "intelligence", s2: "ops", shared: 1 },
  { s1: "monetization", s2: "dataPlatform", shared: 2 },
  { s1: "monetization", s2: "attribution", shared: 1 },
  { s1: "experiment", s2: "growth", shared: 1 },
  { s1: "experiment", s2: "dataPlatform", shared: 1 },
  { s1: "gameConfig", s2: "intelligence", shared: 1 },
  { s1: "scheduler", s2: "ops", shared: 1 },
];

const serviceShortNames: Record<string, string> = {
  gameConfig: "配置", scheduler: "调度", intelligence: "智能", growth: "增长",
  monetization: "变现", attribution: "归因", dataPlatform: "数据", ops: "运维", experiment: "实验",
};

const serviceColors: Record<string, string> = {
  gameConfig: "#0d9488", scheduler: "#2563eb", intelligence: "#9333ea", growth: "#16a34a",
  monetization: "#eab308", attribution: "#ea580c", dataPlatform: "#0891b2", ops: "#dc2626", experiment: "#8b5cf6",
};

// ── Dependency Analysis Tab ──
function DependencyAnalysisTab() {
  const [hoveredService, setHoveredService] = useState<string | null>(null);
  const serviceIds = Object.keys(serviceReadiness);
  const overallReadiness = Math.round(serviceIds.reduce((sum, id) => sum + serviceReadiness[id].overall, 0) / serviceIds.length);

  // SVG topology positions (circular layout)
  const nodePositions = useMemo(() => {
    const cx = 300, cy = 220, r = 160;
    const ids = ["scheduler", "intelligence", "growth", "monetization", "gameConfig", "attribution", "dataPlatform", "ops", "experiment"];
    return Object.fromEntries(ids.map((id, i) => {
      const angle = (i / ids.length) * 2 * Math.PI - Math.PI / 2;
      return [id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }];
    }));
  }, []);

  return (
    <div className="space-y-4">
      {/* Readiness Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overall Gauge */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              拆分就绪度总评
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" stroke={overallReadiness >= 80 ? "#22c55e" : overallReadiness >= 60 ? "#eab308" : "#ef4444"}
                  strokeWidth="10" strokeDasharray={`${overallReadiness * 3.14} ${314 - overallReadiness * 3.14}`}
                  strokeLinecap="round" transform="rotate(-90 60 60)" className="transition-all duration-1000" />
                <text x="60" y="55" textAnchor="middle" className="text-2xl font-bold" fill="currentColor" fontSize="24">{overallReadiness}%</text>
                <text x="60" y="72" textAnchor="middle" fill="#6b7280" fontSize="10">整体就绪度</text>
              </svg>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-3 w-full">
              {[{ label: "契约", key: "contract" }, { label: "解耦", key: "decouple" }, { label: "测试", key: "testing" }, { label: "基建", key: "infra" }, { label: "数据", key: "data" }].map((dim) => {
                const avg = Math.round(serviceIds.reduce((s, id) => s + (serviceReadiness[id] as Record<string, number>)[dim.key], 0) / serviceIds.length);
                return (
                  <div key={dim.key} className="text-center">
                    <div className="text-xs font-bold" style={{ color: avg >= 80 ? "#22c55e" : avg >= 60 ? "#eab308" : "#ef4444" }}>{avg}%</div>
                    <div className="text-[10px] text-muted-foreground">{dim.label}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Service Readiness Ranking */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              服务拆分就绪度排名
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {serviceIds.sort((a, b) => serviceReadiness[b].overall - serviceReadiness[a].overall).map((id, idx) => {
                const r = serviceReadiness[id];
                const svc = services.find(s => s.id === id) || services.find(s => s.id === (id === "gameConfig" ? "gameConfig" : id));
                const name = svc?.name || serviceShortNames[id] || id;
                return (
                  <div key={id} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                      idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-amber-600" : "bg-gray-300"
                    }`}>{idx + 1}</div>
                    <div className="w-24 text-xs font-medium truncate">{name}</div>
                    <div className="flex-1">
                      <div className="h-5 rounded-full bg-muted overflow-hidden relative">
                        <div className="h-full rounded-full transition-all duration-700" style={{
                          width: `${r.overall}%`,
                          backgroundColor: serviceColors[id] || "#6b7280",
                        }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-difference">
                          {r.overall}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {["contract", "decouple", "testing", "infra", "data"].map((dim) => (
                        <div key={dim} className="w-8 text-center">
                          <div className="text-[9px] font-mono" style={{ color: (r as Record<string, number>)[dim] >= 80 ? "#22c55e" : (r as Record<string, number>)[dim] >= 60 ? "#eab308" : "#ef4444" }}>
                            {(r as Record<string, number>)[dim]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 pt-1 border-t">
                <div className="w-6" />
                <div className="w-24" />
                <div className="flex-1" />
                {["契约", "解耦", "测试", "基建", "数据"].map((l) => (
                  <div key={l} className="w-8 text-center text-[9px] text-muted-foreground">{l}</div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dependency Topology */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Network className="h-4 w-4 text-purple-500" />
            服务依赖拓扑图
          </CardTitle>
          <p className="text-xs text-muted-foreground">悬停服务查看关联依赖，线条粗细表示耦合度，颜色表示依赖类型</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-3">
            {[{ type: "同步调用", color: "#2563eb" }, { type: "异步消息", color: "#16a34a" }, { type: "数据共享", color: "#eab308" }].map((l) => (
              <div key={l.type} className="flex items-center gap-1.5 text-xs">
                <div className="w-4 h-0.5 rounded" style={{ backgroundColor: l.color }} />
                <span className="text-muted-foreground">{l.type}</span>
              </div>
            ))}
          </div>
          <svg viewBox="0 0 600 440" className="w-full max-w-2xl mx-auto" style={{ maxHeight: 440 }}>
            <defs>
              <marker id="arrow-sync" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#2563eb" /></marker>
              <marker id="arrow-async" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#16a34a" /></marker>
              <marker id="arrow-data" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#eab308" /></marker>
            </defs>
            {/* Edges */}
            {dependencyEdges.map((edge, i) => {
              const from = nodePositions[edge.from];
              const to = nodePositions[edge.to];
              if (!from || !to) return null;
              const dx = to.x - from.x, dy = to.y - from.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const nx = dx / dist, ny = dy / dist;
              const x1 = from.x + nx * 32, y1 = from.y + ny * 32;
              const x2 = to.x - nx * 32, y2 = to.y - ny * 32;
              const color = edge.type === "sync" ? "#2563eb" : edge.type === "async" ? "#16a34a" : "#eab308";
              const isHighlighted = !hoveredService || edge.from === hoveredService || edge.to === hoveredService;
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={color} strokeWidth={isHighlighted ? 2 : 0.5}
                  opacity={isHighlighted ? 0.8 : 0.15}
                  markerEnd={`url(#arrow-${edge.type})`}
                  strokeDasharray={edge.type === "async" ? "6,3" : edge.type === "data" ? "2,2" : "none"}
                  className="transition-all duration-300" />
              );
            })}
            {/* Nodes */}
            {Object.entries(nodePositions).map(([id, pos]) => {
              const readiness = serviceReadiness[id]?.overall || 0;
              const color = serviceColors[id] || "#6b7280";
              const isHighlighted = !hoveredService || hoveredService === id || dependencyEdges.some(e => (e.from === hoveredService && e.to === id) || (e.to === hoveredService && e.from === id));
              return (
                <g key={id} onMouseEnter={() => setHoveredService(id)} onMouseLeave={() => setHoveredService(null)}
                  className="cursor-pointer" opacity={isHighlighted ? 1 : 0.3}>
                  <circle cx={pos.x} cy={pos.y} r="28" fill="white" stroke="#e5e7eb" strokeWidth="2" />
                  <circle cx={pos.x} cy={pos.y} r="28" fill="none" stroke={color} strokeWidth="3"
                    strokeDasharray={`${readiness * 1.76} ${176 - readiness * 1.76}`}
                    strokeLinecap="round" transform={`rotate(-90 ${pos.x} ${pos.y})`}
                    className="transition-all duration-500" />
                  <text x={pos.x} y={pos.y - 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill={color}>{serviceShortNames[id]}</text>
                  <text x={pos.x} y={pos.y + 10} textAnchor="middle" fontSize="9" fill="#6b7280">{readiness}%</text>
                </g>
              );
            })}
          </svg>
        </CardContent>
      </Card>

      {/* Coupling Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-red-500" />
            模块耦合度热力矩阵
          </CardTitle>
          <p className="text-xs text-muted-foreground">数字表示两个服务间共享的数据表数量，颜色越深耦合越高</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-1.5 text-left font-medium text-muted-foreground w-16"></th>
                  {serviceIds.map((id) => (
                    <th key={id} className="p-1.5 text-center font-medium text-muted-foreground w-12">
                      <span className="writing-mode-vertical" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 10 }}>
                        {serviceShortNames[id]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {serviceIds.map((rowId) => (
                  <tr key={rowId}>
                    <td className="p-1.5 font-medium text-[10px]" style={{ color: serviceColors[rowId] }}>{serviceShortNames[rowId]}</td>
                    {serviceIds.map((colId) => {
                      if (rowId === colId) return <td key={colId} className="p-1 text-center"><div className="w-8 h-8 mx-auto rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">—</div></td>;
                      const edge = couplingMatrix.find(e => (e.s1 === rowId && e.s2 === colId) || (e.s1 === colId && e.s2 === rowId));
                      const val = edge?.shared || 0;
                      const bg = val === 0 ? "bg-gray-50" : val === 1 ? "bg-yellow-100" : val === 2 ? "bg-orange-200" : "bg-red-300";
                      const textColor = val === 0 ? "text-gray-300" : val >= 2 ? "text-red-800" : "text-orange-800";
                      return (
                        <td key={colId} className="p-1 text-center">
                          <div className={`w-8 h-8 mx-auto rounded ${bg} flex items-center justify-center text-[10px] font-bold ${textColor}`}>
                            {val}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-3 justify-center">
            {[{ label: "0 无耦合", bg: "bg-gray-50" }, { label: "1 低耦合", bg: "bg-yellow-100" }, { label: "2 中耦合", bg: "bg-orange-200" }, { label: "3 高耦合", bg: "bg-red-300" }].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className={`w-4 h-4 rounded ${l.bg}`} />
                {l.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Alibaba Cloud Deployment Tab ──
function CloudDeploymentTab() {
  const [selectedPlan, setSelectedPlan] = useState<"sae" | "ack">("sae");

  const plans = {
    sae: {
      name: "SAE 轻量版",
      subtitle: "Serverless 应用引擎",
      badge: "推荐方案",
      badgeColor: "bg-green-100 text-green-700 border-green-200",
      description: "免运维 Serverless 容器平台，无需管理 K8s 集群，按量计费，适合中小规模微服务",
      monthlyCost: "¥2,800 - 5,500",
      pros: ["零运维，无需管理 K8s", "按量计费，闲时不收费", "内置微服务治理", "分钟级弹性伸缩", "支持 Node.js 镜像部署"],
      cons: ["网络自定义能力较弱", "不支持 DaemonSet", "复杂调度策略受限"],
    },
    ack: {
      name: "ACK 专业版",
      subtitle: "容器服务 Kubernetes",
      badge: "企业级",
      badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
      description: "全托管 K8s 集群，完整的容器编排能力，适合大规模微服务和复杂调度场景",
      monthlyCost: "¥5,500 - 12,000",
      pros: ["完整 K8s 生态", "灵活的网络和存储策略", "支持 GPU/混合部署", "自定义调度策略", "多集群管理"],
      cons: ["需要 K8s 运维经验", "固定集群成本较高", "学习曲线较陡"],
    },
  };

  const aliyunProducts = [
    { category: "容器与计算", items: [
      { name: "SAE", desc: "Serverless 应用引擎", use: "9个微服务容器化部署", icon: Container, color: "text-green-600", plan: "sae" as const },
      { name: "ACK", desc: "容器服务 K8s", use: "K8s 集群编排与管理", icon: Container, color: "text-blue-600", plan: "ack" as const },
      { name: "ACR", desc: "容器镜像服务", use: "Docker 镜像存储与分发", icon: HardDrive, color: "text-purple-600", plan: "both" as const },
    ]},
    { category: "微服务治理", items: [
      { name: "MSE", desc: "微服务引擎", use: "Nacos 注册/配置 + Sentinel 流控", icon: Network, color: "text-orange-600", plan: "both" as const },
      { name: "MSE 云原生网关", desc: "API Gateway", use: "统一流量入口 + 路由 + 鉴权", icon: Globe, color: "text-cyan-600", plan: "both" as const },
    ]},
    { category: "数据存储", items: [
      { name: "RDS MySQL", desc: "云数据库", use: "9个服务独立 Schema 或独立实例", icon: Database, color: "text-blue-600", plan: "both" as const },
      { name: "Redis", desc: "云缓存", use: "会话/缓存/分布式锁/消息队列", icon: Zap, color: "text-red-600", plan: "both" as const },
      { name: "OSS", desc: "对象存储", use: "文件/图片/报表存储", icon: HardDrive, color: "text-green-600", plan: "both" as const },
    ]},
    { category: "可观测性", items: [
      { name: "ARMS", desc: "应用实时监控", use: "链路追踪 + 性能监控 + 告警", icon: Activity, color: "text-purple-600", plan: "both" as const },
      { name: "SLS", desc: "日志服务", use: "统一日志采集/查询/分析", icon: ScrollText, color: "text-teal-600", plan: "both" as const },
      { name: "Grafana", desc: "可视化服务", use: "监控大屏 + 业务仪表盘", icon: BarChart3, color: "text-orange-600", plan: "both" as const },
    ]},
    { category: "安全与合规", items: [
      { name: "WAF", desc: "Web 应用防火墙", use: "DDoS/SQL注入/XSS 防护", icon: Shield, color: "text-red-600", plan: "both" as const },
      { name: "RAM", desc: "访问控制", use: "细粒度权限管理 + 审计", icon: Lock, color: "text-gray-600", plan: "both" as const },
      { name: "SSL证书", desc: "证书服务", use: "HTTPS 证书管理", icon: Lock, color: "text-green-600", plan: "both" as const },
    ]},
    { category: "CI/CD", items: [
      { name: "云效", desc: "DevOps 平台", use: "代码仓库 + 流水线 + 制品库", icon: Workflow, color: "text-indigo-600", plan: "both" as const },
    ]},
  ];

  // Migration phases
  const migrationPhases = [
    {
      phase: 1, name: "基础设施搭建", quarter: "2026 Q2", duration: "4 周",
      tasks: ["VPC 网络规划（生产/测试环境隔离）", "RDS MySQL 实例创建 + Schema 迁移", "Redis 集群部署", "OSS Bucket 创建 + CDN 配置", "MSE Nacos 注册中心部署", "SLS 日志项目创建"],
    },
    {
      phase: 2, name: "试点服务上云", quarter: "2026 Q2-Q3", duration: "6 周",
      tasks: ["游戏配置中心 Docker 化 + SAE/ACK 部署", "任务调度中心独立部署", "API 网关配置 + 路由规则", "CI/CD 流水线搭建", "ARMS 链路追踪接入", "双写过渡期验证"],
    },
    {
      phase: 3, name: "核心服务迁移", quarter: "2026 Q3-Q4", duration: "10 周",
      tasks: ["智能分析引擎 + 用户增长中心部署", "变现引擎 + 归因分析中心部署", "数据平台 + 实验平台部署", "运维中心部署", "全链路压测 + 容灾演练", "旧系统下线 + DNS 切换"],
    },
    {
      phase: 4, name: "优化与合规", quarter: "2026 Q4", duration: "4 周",
      tasks: ["性能调优 + 弹性策略完善", "等保安全评估 + 审计合规", "WAF + DDoS 防护配置", "灾备方案 + 多可用区部署", "成本优化 + 资源利用率提升", "运维手册 + SOP 文档化"],
    },
  ];

  const plan = plans[selectedPlan];

  return (
    <div className="space-y-4">
      {/* Plan Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["sae", "ack"] as const).map((planKey) => {
          const p = plans[planKey];
          const isSelected = selectedPlan === planKey;
          return (
            <Card key={planKey}
              className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-sm"}`}
              onClick={() => setSelectedPlan(planKey)}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold">{p.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{p.subtitle}</p>
                  </div>
                  <Badge className={p.badgeColor}>{p.badge}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{p.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">月估算成本</span>
                  <span className="text-sm font-bold text-blue-600">{p.monthlyCost}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Plan Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cloud className="h-4 w-4 text-blue-500" />
            {plan.name} — 优劣势分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold text-green-600 mb-2 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />优势</h4>
              <div className="space-y-1.5">
                {plan.pros.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-600 mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />注意事项</h4>
              <div className="space-y-1.5">
                {plan.cons.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Selection Matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="h-4 w-4 text-orange-500" />
            阿里云产品选型矩阵
          </CardTitle>
          <p className="text-xs text-muted-foreground">GAMEHOT 微服务架构所需的全套阿里云产品</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {aliyunProducts.map((cat) => (
              <div key={cat.category}>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{cat.category}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {cat.items.filter(item => item.plan === "both" || item.plan === selectedPlan).map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.name} className="rounded-lg border p-3 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-4 w-4 ${item.color}`} />
                          <span className="text-xs font-bold">{item.name}</span>
                          <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{item.use}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Architecture Diagram */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Network className="h-4 w-4 text-purple-500" />
            阿里云部署架构图
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-slate-950 p-4 text-xs font-mono text-green-400 overflow-x-auto">
            <pre className="leading-relaxed">{`┌───────────────────────────────────────────────────────────────┐
│                    阿里云 VPC 网络                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  WAF + SLB → MSE 云原生网关 (API Gateway)               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                  │
│  ┌─────────────────────┬───────────────────┬───────────────┐  │
│  │  ${selectedPlan === "sae" ? "SAE 应用引擎" : "ACK K8s 集群"}     │                   │               │  │
│  │                     │                   │               │  │
│  │  ┌───────────────┐ │ ┌─────────────┐ │ ┌───────────┐ │  │
│  │  │ 游戏配置中心  │ │ │ 任务调度中心│ │ │ 智能分析  │ │  │
│  │  │ 用户增长中心  │ │ │ 变现引擎    │ │ │ 归因分析  │ │  │
│  │  │ 数据平台      │ │ │ 实验平台    │ │ │ 运维中心  │ │  │
│  │  └───────────────┘ │ └─────────────┘ │ └───────────┘ │  │
│  └─────────────────────┴───────────────────┴───────────────┘  │
│                           │                                  │
│  ┌─────────────┬─────────────┬─────────────┬───────────────┐  │
│  │ MSE Nacos   │ RDS MySQL   │ Redis       │ OSS + CDN      │  │
│  │ 注册/配置   │ 主库+只读   │ 缓存+队列  │ 文件存储       │  │
│  └─────────────┴─────────────┴─────────────┴───────────────┘  │
│                           │                                  │
│  ┌─────────────────────┬───────────────────┬───────────────┐  │
│  │ ARMS 链路追踪      │ SLS 日志服务     │ Grafana 监控  │  │
│  └─────────────────────┴───────────────────┴───────────────┘  │
└───────────────────────────────────────────────────────────────┘`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Migration Roadmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Workflow className="h-4 w-4 text-indigo-500" />
            迁移路径规划
          </CardTitle>
          <p className="text-xs text-muted-foreground">从 Manus 单体应用到阿里云微服务的 4 阶段迁移计划</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {migrationPhases.map((mp) => (
              <div key={mp.phase} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      mp.phase === 1 ? "bg-blue-500" : mp.phase === 2 ? "bg-green-500" : mp.phase === 3 ? "bg-orange-500" : "bg-purple-500"
                    }`}>{mp.phase}</div>
                    <div>
                      <div className="text-xs font-bold">{mp.name}</div>
                      <div className="text-[10px] text-muted-foreground">{mp.quarter} · {mp.duration}</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {mp.tasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <CircleDot className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{task}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Estimation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-yellow-500" />
            月度成本估算（{plan.name}）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium text-muted-foreground">产品</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">规格</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">月估算（¥）</th>
                </tr>
              </thead>
              <tbody>
                {(selectedPlan === "sae" ? [
                  { product: "SAE 应用引擎", spec: "9 实例 × 1C2G，按量计费", cost: "800-1,500" },
                  { product: "RDS MySQL", spec: "2C4G 主实例 + 只读副本", cost: "600-900" },
                  { product: "Redis", spec: "1G 标准版", cost: "200-300" },
                  { product: "MSE Nacos", spec: "专业版 1C2G", cost: "400-600" },
                  { product: "SLS + ARMS", spec: "按量计费", cost: "200-400" },
                  { product: "OSS + CDN", spec: "100G 存储 + 流量", cost: "100-200" },
                  { product: "WAF", spec: "基础版", cost: "500-600" },
                ] : [
                  { product: "ACK 托管集群", spec: "3 Worker (4C8G)", cost: "2,000-3,500" },
                  { product: "RDS MySQL", spec: "4C8G 主实例 + 只读副本", cost: "1,000-1,500" },
                  { product: "Redis", spec: "2G 集群版", cost: "400-600" },
                  { product: "MSE Nacos", spec: "专业版 2C4G", cost: "600-800" },
                  { product: "SLS + ARMS", spec: "按量计费", cost: "300-600" },
                  { product: "OSS + CDN", spec: "100G 存储 + 流量", cost: "100-200" },
                  { product: "WAF", spec: "基础版", cost: "500-600" },
                ]).map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-2 font-medium">{row.product}</td>
                    <td className="p-2 text-muted-foreground">{row.spec}</td>
                    <td className="p-2 text-right font-mono">{row.cost}</td>
                  </tr>
                ))}
                <tr className="border-t-2 font-bold">
                  <td className="p-2">合计</td>
                  <td className="p-2"></td>
                  <td className="p-2 text-right text-blue-600 font-mono">{plan.monthlyCost}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            * 以上为初期规模估算，实际费用取决于业务量、弹性策略和购买方式（包年可享 30-50% 折扣）。建议初期使用按量计费，稳定后切换包年。
          </p>
        </CardContent>
      </Card>

      {/* Compliance Note */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-800 mb-1">等保合规 & IT 审计就绪</h4>
              <p className="text-xs text-amber-700">
                阿里云已通过等保三级认证，配合 WAF + RAM + 审计日志 + 数据加密，可满足上市 IT 审计要求。
                建议在第 4 阶段引入专业等保评估机构进行完整评估。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ──
export default function ArchRoadmap() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  // Stats
  const totalTables = services.reduce((sum, s) => sum + s.tables, 0);
  const totalModules = services.reduce((sum, s) => sum + s.modules.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">架构演进路线图</h1>
        <p className="text-sm text-muted-foreground mt-1">
          从单体应用走向微服务架构，为 OpenClaw 多智能体系统构建基础设施层
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">9</div>
          <div className="text-xs text-muted-foreground">独立服务</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">{totalModules}</div>
          <div className="text-xs text-muted-foreground">业务模块</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{totalTables}</div>
          <div className="text-xs text-muted-foreground">数据表</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-orange-600">3</div>
          <div className="text-xs text-muted-foreground">拆分阶段</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">架构总览</TabsTrigger>
          <TabsTrigger value="preparation">服务化准备</TabsTrigger>
          <TabsTrigger value="services">服务清单</TabsTrigger>
          <TabsTrigger value="timeline">路线图</TabsTrigger>
          <TabsTrigger value="dependencies">依赖分析</TabsTrigger>
          <TabsTrigger value="cloud-deploy">云部署</TabsTrigger>
          <TabsTrigger value="openclaw">OpenClaw</TabsTrigger>
        </TabsList>

        {/* Tab 1: Architecture Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-500" />
                  目标架构
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ArchitectureDiagram />
              </CardContent>
            </Card>

            <div className="space-y-4">
              {/* Principles */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-green-500" />
                    拆分原则
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { title: "渐进式拆分", desc: "按业务价值和技术复杂度分批次拆分，每阶段确保系统稳定" },
                    { title: "领域驱动", desc: "以业务领域为边界划分服务，每个服务拥有自己的数据和逻辑" },
                    { title: "Agent 友好", desc: "每个服务可被 OpenClaw 通过 MCP/A2A/REST 协议调用" },
                    { title: "数据自治", desc: "每个服务管理自己的数据表，跨服务通过 API 访问" },
                  ].map((p, i) => (
                    <div key={i} className="flex gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold">{p.title}</div>
                        <div className="text-xs text-muted-foreground">{p.desc}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Current Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Server className="h-4 w-4 text-orange-500" />
                    当前状态
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">数据库表</span>
                    <Badge variant="outline">104 张</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">后端路由模块</span>
                    <Badge variant="outline">48 个</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">前端页面</span>
                    <Badge variant="outline">54 个</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">测试用例</span>
                    <Badge variant="outline">1,263 个</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">架构模式</span>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">单体应用</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Service Preparation */}
        <TabsContent value="preparation" className="space-y-4">
          <ServicePreparationTab />
        </TabsContent>

        {/* Tab 3: Service List */}
        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((svc) => {
              const Icon = svc.icon;
              return (
                <Card key={svc.id} className={`border ${svc.borderColor} transition-all hover:shadow-md`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${svc.bgColor}`}>
                          <Icon className={`h-5 w-5 ${svc.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{svc.name}</CardTitle>
                          <p className="text-[10px] text-muted-foreground">{svc.nameEn}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <PriorityBadge priority={svc.priority} />
                        <StatusBadge status={svc.status} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">{svc.description}</p>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        <span>{svc.tables} 张表</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-muted-foreground" />
                        <span>{svc.modules.length} 个模块</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3 text-muted-foreground" />
                        <span>{svc.quarter}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {svc.modules.map((m) => (
                        <Badge key={m} variant="secondary" className="text-[10px] py-0">
                          {m}
                        </Badge>
                      ))}
                    </div>

                    <div className="rounded-lg bg-muted/50 p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <Bot className="h-3 w-3 text-purple-500" />
                        <span className="text-[10px] font-semibold text-purple-600">Agent 角色</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{svc.agentRole}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 3: Timeline */}
        <TabsContent value="timeline" className="space-y-4">
          {phases.map((phase, idx) => (
            <Card key={phase.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      idx === 0 ? "bg-blue-500" : idx === 1 ? "bg-orange-500" : "bg-purple-500"
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{phase.name}</CardTitle>
                      <p className="text-[10px] text-muted-foreground">{phase.nameEn} · {phase.quarter}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs ${
                    phase.progress > 0 ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-gray-50 text-gray-500"
                  }`}>
                    {phase.progress}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{phase.goal}</p>

                <Progress value={phase.progress} className="h-2" />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {phase.services.map((svcId) => {
                    const svc = services.find((s) => s.id === svcId);
                    if (!svc) return null;
                    const Icon = svc.icon;
                    return (
                      <div key={svcId} className={`rounded-lg border ${svc.borderColor} ${svc.bgColor} p-2.5 flex items-center gap-2`}>
                        <Icon className={`h-4 w-4 ${svc.color} shrink-0`} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{svc.name}</div>
                          <div className="text-[10px] text-muted-foreground">{svc.modules.length} 模块 · {svc.tables} 表</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-lg bg-muted/50 p-2.5 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] font-semibold text-green-600">里程碑</div>
                    <p className="text-xs text-muted-foreground">{phase.milestone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Risk Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                风险与缓解
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { risk: "分布式事务一致性", impact: "跨服务操作可能部分失败", mitigation: "Saga 模式 + 补偿机制" },
                  { risk: "服务间调用延迟", impact: "链路变长导致响应变慢", mitigation: "关键路径缓存 + 异步化" },
                  { risk: "运维复杂度上升", impact: "多服务部署和监控成本增加", mitigation: "统一CI/CD + 容器化" },
                  { risk: "数据迁移风险", impact: "拆分数据库可能丢失数据", mitigation: "双写过渡期 + 校验脚本" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border p-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold">{item.risk}</div>
                      <div className="text-[10px] text-muted-foreground">{item.impact}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200 shrink-0">
                      {item.mitigation}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Dependencies Analysis */}
        <TabsContent value="dependencies" className="space-y-4">
          <DependencyAnalysisTab />
        </TabsContent>

        {/* Tab 6: Cloud Deployment */}
        <TabsContent value="cloud-deploy" className="space-y-4">
          <CloudDeploymentTab />
        </TabsContent>

        {/* Tab 7: OpenClaw */}
        <TabsContent value="openclaw" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Agent Registration Protocol */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-500" />
                  Agent 注册协议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-slate-950 p-3 text-xs font-mono text-green-400 overflow-x-auto">
                  <pre>{`{
  "agent_id": "scheduler-agent",
  "name": "任务调度Agent",
  "capabilities": [
    {
      "skill": "create_task",
      "protocol": "MCP",
      "endpoint": "/api/tasks"
    },
    {
      "skill": "trigger_task",
      "protocol": "MCP",
      "endpoint": "/api/tasks/:id/trigger"
    }
  ],
  "health_check": "/api/health",
  "priority": 1
}`}</pre>
                </div>
              </CardContent>
            </Card>

            {/* Agent Collaboration */}
            <AgentCollabExample />

            {/* Data Flow */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Network className="h-4 w-4 text-blue-500" />
                  事件驱动数据流
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="rounded-lg border bg-blue-50 border-blue-200 p-3 text-center shrink-0">
                    <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-xs font-semibold">用户行为事件</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 rotate-90 sm:rotate-0" />
                  <div className="rounded-lg border bg-amber-50 border-amber-200 p-3 text-center shrink-0">
                    <MessageSquare className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                    <div className="text-xs font-semibold">消息队列</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 rotate-90 sm:rotate-0" />
                  <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                    {[
                      { name: "用户增长中心", desc: "更新分层", icon: Users, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
                      { name: "变现引擎", desc: "更新变现状态", icon: DollarSign, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
                      { name: "数据平台", desc: "更新KPI聚合", icon: BarChart3, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200" },
                      { name: "智能分析引擎", desc: "异常检测", icon: Brain, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.name} className={`rounded-lg border ${item.border} ${item.bg} p-2 text-center`}>
                          <Icon className={`h-4 w-4 ${item.color} mx-auto mb-0.5`} />
                          <div className="text-[10px] font-semibold">{item.name}</div>
                          <div className="text-[9px] text-muted-foreground">{item.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tech Stack */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Server className="h-4 w-4 text-gray-500" />
                  技术选型建议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {[
                    { name: "API Gateway", value: "Kong / Traefik" },
                    { name: "消息队列", value: "RabbitMQ / Redis Streams" },
                    { name: "服务发现", value: "Consul / etcd" },
                    { name: "配置中心", value: "Nacos / Apollo" },
                    { name: "日志系统", value: "ELK / Loki" },
                    { name: "Agent协议", value: "MCP + A2A" },
                    { name: "容器编排", value: "Docker → K8s" },
                    { name: "监控", value: "Prometheus + Grafana" },
                  ].map((item) => (
                    <div key={item.name} className="rounded-lg border p-2.5">
                      <div className="text-[10px] text-muted-foreground">{item.name}</div>
                      <div className="text-xs font-semibold mt-0.5">{item.value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
