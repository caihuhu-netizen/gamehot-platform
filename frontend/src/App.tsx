import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { lazy, Suspense } from "react";
import FloatingAIBubble from "./components/FloatingAIBubble";
import { Loader2 } from "lucide-react";

// Eagerly loaded: lightweight pages and core navigation
import Home from "./pages/Home";
import Config from "./pages/Config";
import Permissions from "./pages/Permissions";
import GameProjects from "./pages/GameProjects";
const ConfigVersions = lazy(() => import("./pages/ConfigVersions"));
const SdkDocs = lazy(() => import("./pages/SdkDocs"));
const FeishuSync = lazy(() => import("./pages/FeishuSync"));
const Levels = lazy(() => import("./pages/Levels"));
const DecisionLogs = lazy(() => import("./pages/DecisionLogs"));

// Lazy loaded: heavy pages with recharts, Streamdown (mermaid/shiki), or complex UI
const Segments = lazy(() => import("./pages/Segments"));
const Probes = lazy(() => import("./pages/Probes"));
const Difficulty = lazy(() => import("./pages/Difficulty"));
const Monetize = lazy(() => import("./pages/Monetize"));
const Experiments = lazy(() => import("./pages/Experiments"));
const UserProfiles = lazy(() => import("./pages/UserProfiles"));
const Analytics = lazy(() => import("./pages/Analytics"));
const LoopDashboard = lazy(() => import("./pages/LoopDashboard"));
const TeIntegration = lazy(() => import("./pages/TeIntegration"));
const CohortRetention = lazy(() => import("./pages/CohortRetention"));
const Acquisition = lazy(() => import("./pages/Acquisition"));
const CostProfit = lazy(() => import("./pages/CostProfit"));
const AdRevenue = lazy(() => import("./pages/AdRevenue"));
const DailyReport = lazy(() => import("./pages/DailyReport"));
const PushCenter = lazy(() => import("./pages/PushCenter"));
const Audience = lazy(() => import("./pages/Audience"));
const AudienceTemplates = lazy(() => import("./pages/AudienceTemplates"));
const UserRecall = lazy(() => import("./pages/UserRecall"));
const IAPProducts = lazy(() => import("./pages/IAPProducts"));
const CustomReport = lazy(() => import("./pages/CustomReport"));
const EventAnalysis = lazy(() => import("./pages/EventAnalysis"));
const AnomalyMonitor = lazy(() => import("./pages/AnomalyMonitor"));
const ComparisonAnalysis = lazy(() => import("./pages/ComparisonAnalysis"));
const OpsTools = lazy(() => import("./pages/OpsTools"));
const RetentionWeekly = lazy(() => import("./pages/RetentionWeekly"));
const UserQualityDaily = lazy(() => import("./pages/UserQualityDaily"));
const MonetizeDaily = lazy(() => import("./pages/MonetizeDaily"));
const DailyOverview = lazy(() => import("./pages/DailyOverview"));
const PricingEngine = lazy(() => import("./pages/PricingEngine"));
const DataExport = lazy(() => import("./pages/DataExport"));

// Heavy Streamdown pages (pull in mermaid 2.2MB + shiki)
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const AlertRulesConfig = lazy(() => import("./pages/AlertRulesConfig"));
const AiDailyReport = lazy(() => import("./pages/AiDailyReport"));
const AiAssistant = lazy(() => import("./pages/AiAssistant"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const FeishuNotification = lazy(() => import("./pages/FeishuNotification"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const SchedulerCenter = lazy(() => import("./pages/SchedulerCenter"));
const VersionManagement = lazy(() => import("./pages/VersionManagement"));
const ChurnPrediction = lazy(() => import("./pages/ChurnPrediction"));
const JourneyBuilder = lazy(() => import("./pages/JourneyBuilder"));
const OptimizationSuggestions = lazy(() => import("./pages/OptimizationSuggestions"));
const EffectVerification = lazy(() => import("./pages/EffectVerification"));
const DataSyncCenter = lazy(() => import("./pages/DataSyncCenter"));
const AutoResponseApproval = lazy(() => import("./pages/AutoResponseApproval"));
const GlobalView = lazy(() => import("./pages/GlobalView"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
    </div>
  );
}

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <ErrorBoundary isPageLevel fallbackPath="/">
        <Suspense fallback={<PageLoader />}>
          <Switch>
          <Route path="/" component={Home} />
          <Route path="/segments" component={Segments} />
          <Route path="/probes" component={Probes} />
          <Route path="/difficulty" component={Difficulty} />
          <Route path="/monetize" component={Monetize} />
          <Route path="/experiments" component={Experiments} />
          <Route path="/user-profiles" component={UserProfiles} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/levels" component={Levels} />
          <Route path="/config" component={Config} />
          <Route path="/permissions" component={Permissions} />
          <Route path="/loop-engine" component={LoopDashboard} />
          <Route path="/game-projects" component={GameProjects} />
          <Route path="/config-versions" component={ConfigVersions} />
          <Route path="/sdk-docs" component={SdkDocs} />
          <Route path="/te-integration" component={TeIntegration} />
          <Route path="/cohort-retention" component={CohortRetention} />
          <Route path="/acquisition" component={Acquisition} />
          <Route path="/cost-profit" component={CostProfit} />
          <Route path="/ad-revenue" component={AdRevenue} />
          <Route path="/daily-report" component={DailyReport} />
          <Route path="/feishu-sync" component={FeishuSync} />
          <Route path="/push-center" component={PushCenter} />
          <Route path="/audience" component={Audience} />
          <Route path="/audience/templates" component={AudienceTemplates} />
          <Route path="/user-recall" component={UserRecall} />
          <Route path="/iap-products" component={IAPProducts} />
          <Route path="/custom-report" component={CustomReport} />
          <Route path="/event-analysis" component={EventAnalysis} />
          <Route path="/anomaly-monitor" component={AnomalyMonitor} />
          <Route path="/comparison-analysis" component={ComparisonAnalysis} />
          <Route path="/ops-tools" component={OpsTools} />
          <Route path="/retention-weekly" component={RetentionWeekly} />
          <Route path="/user-quality-daily" component={UserQualityDaily} />
          <Route path="/knowledge-base" component={KnowledgeBase} />
          <Route path="/alert-rules" component={AlertRulesConfig} />
          <Route path="/ai-daily-report" component={AiDailyReport} />
          <Route path="/daily-overview" component={DailyOverview} />
          <Route path="/decision-logs" component={DecisionLogs} />
          <Route path="/monetize-daily" component={MonetizeDaily} />
          <Route path="/ai-assistant" component={AiAssistant} />
          <Route path="/pricing-engine" component={PricingEngine} />
          <Route path="/data-export" component={DataExport} />
          <Route path="/audit-log" component={AuditLog} />
          <Route path="/feishu-notification" component={FeishuNotification} />
          <Route path="/api-docs" component={ApiDocs} />
          <Route path="/scheduler" component={SchedulerCenter} />
          <Route path="/version-management" component={VersionManagement} />
          <Route path="/churn-prediction" component={ChurnPrediction} />
          <Route path="/journey-builder" component={JourneyBuilder} />
          <Route path="/optimization-suggestions" component={OptimizationSuggestions} />
          <Route path="/effect-verification" component={EffectVerification} />
          <Route path="/data-sync" component={DataSyncCenter} />
          <Route path="/auto-response-approval" component={AutoResponseApproval} />
          <Route path="/global-view" component={GlobalView} />
          <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </ErrorBoundary>
      <FloatingAIBubble />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route component={DashboardRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
