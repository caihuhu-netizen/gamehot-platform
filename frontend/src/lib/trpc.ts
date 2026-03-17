/**
 * tRPC → REST API 适配层
 *
 * 用 JS Proxy 模拟 tRPC React Query 接口：
 *   trpc.dashboard.overview.useQuery(input)
 *   trpc.gameProjects.create.useMutation()
 *
 * 让所有页面组件零改动，底层走 REST API
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from './api';

// ==================== API 路由映射表 ====================
// 格式：'router.procedure' => { method, path, type }
// type: 'query' | 'mutation'

const ROUTE_MAP: Record<string, { method: string; path: string; type: 'query' | 'mutation' }> = {
  // ===== auth =====
  'feishu.getLoginUrl':           { method: 'GET',  path: '/api/auth/feishu/url',           type: 'query' },
  'auth.me':                      { method: 'GET',  path: '/api/auth/me',                    type: 'query' },
  'auth.logout':                  { method: 'POST', path: '/api/auth/logout',                type: 'mutation' },

  // ===== dashboard =====
  'dashboard.overview':           { method: 'GET',  path: '/api/data/dashboard/overview',    type: 'query' },
  'dashboard.stats':              { method: 'GET',  path: '/api/data/dashboard/stats',       type: 'query' },
  'dashboard.revenueTimeline':    { method: 'GET',  path: '/api/data/dashboard/revenue-timeline', type: 'query' },
  'dashboard.approvalDashboard':  { method: 'GET',  path: '/api/data/dashboard/approval-dashboard', type: 'query' },

  // ===== analytics =====
  'analytics.payingComparison':       { method: 'GET', path: '/api/data/analytics/paying-comparison',    type: 'query' },
  'analytics.retentionComparison':    { method: 'GET', path: '/api/data/analytics/retention-comparison', type: 'query' },
  'analytics.paymentAlerts':          { method: 'GET', path: '/api/data/analytics/payment-alerts',       type: 'query' },
  'analytics.paymentFunnel':          { method: 'GET', path: '/api/data/analytics/payment-funnel',       type: 'query' },
  'analytics.cohortRetention':        { method: 'GET', path: '/api/data/analytics/cohort-retention',     type: 'query' },
  'analytics.cohortLTV':              { method: 'GET', path: '/api/data/analytics/cohort-ltv',           type: 'query' },
  'analytics.lifecycleStages':        { method: 'GET', path: '/api/data/analytics/lifecycle-stages',     type: 'query' },
  'analytics.lifecycleBySegment':     { method: 'GET', path: '/api/data/analytics/lifecycle-by-segment', type: 'query' },
  'analytics.productInsights':        { method: 'GET', path: '/api/data/analytics/product-insights',     type: 'query' },
  'analytics.kpiDrillDown':           { method: 'GET', path: '/api/data/analytics/kpi-drill-down',       type: 'query' },
  'analytics.detectAnomalies':        { method: 'GET', path: '/api/data/analytics/detect-anomalies',     type: 'query' },
  'analytics.levelInsights':          { method: 'GET', path: '/api/data/analytics/level-insights',       type: 'query' },
  'analytics.generateLLMInsight':     { method: 'POST', path: '/api/data/analytics/generate-insight',    type: 'mutation' },
  'analytics.anomalyRootCause':       { method: 'POST', path: '/api/data/analytics/anomaly-root-cause',  type: 'mutation' },
  'analytics.sendPaymentAlert':       { method: 'POST', path: '/api/data/analytics/send-payment-alert',  type: 'mutation' },
  'analytics.createExperimentFromInsight':    { method: 'POST', path: '/api/data/analytics/create-experiment',     type: 'mutation' },
  'analytics.createMonetizeRuleFromInsight':  { method: 'POST', path: '/api/data/analytics/create-monetize-rule',  type: 'mutation' },

  // ===== acquisition =====
  'acquisition.listChannels':     { method: 'GET',    path: '/api/data/acquisition/channels',  type: 'query' },
  'acquisition.getChannel':       { method: 'GET',    path: '/api/data/acquisition/channels',  type: 'query' },
  'acquisition.createChannel':    { method: 'POST',   path: '/api/data/acquisition/channels',  type: 'mutation' },
  'acquisition.updateChannel':    { method: 'PUT',    path: '/api/data/acquisition/channels',  type: 'mutation' },
  'acquisition.deleteChannel':    { method: 'DELETE', path: '/api/data/acquisition/channels',  type: 'mutation' },
  'acquisition.listCosts':        { method: 'GET',    path: '/api/data/acquisition/costs',     type: 'query' },
  'acquisition.createCost':       { method: 'POST',   path: '/api/data/acquisition/costs',     type: 'mutation' },
  'acquisition.channelROI':       { method: 'GET',    path: '/api/data/acquisition/roi',       type: 'query' },

  // ===== costProfit =====
  'costProfit.listCategories':    { method: 'GET',  path: '/api/data/cost-profit/categories',     type: 'query' },
  'costProfit.createCategory':    { method: 'POST', path: '/api/data/cost-profit/categories',     type: 'mutation' },
  'costProfit.listEntries':       { method: 'GET',  path: '/api/data/cost-profit/entries',        type: 'query' },
  'costProfit.createEntry':       { method: 'POST', path: '/api/data/cost-profit/entries',        type: 'mutation' },
  'costProfit.getProfitAnalysis': { method: 'GET',  path: '/api/data/cost-profit/profit-analysis', type: 'query' },
  'costProfit.getProfitTrend':    { method: 'GET',  path: '/api/data/cost-profit/profit-trend',   type: 'query' },
  'costProfit.getCostBreakdown':  { method: 'GET',  path: '/api/data/cost-profit/cost-breakdown', type: 'query' },

  // ===== gameProjects =====
  'gameProjects.list':            { method: 'GET',    path: '/api/game/projects',     type: 'query' },
  'gameProjects.getById':         { method: 'GET',    path: '/api/game/projects',     type: 'query' },
  'gameProjects.create':          { method: 'POST',   path: '/api/game/projects',     type: 'mutation' },
  'gameProjects.update':          { method: 'PUT',    path: '/api/game/projects',     type: 'mutation' },
  'gameProjects.delete':          { method: 'DELETE', path: '/api/game/projects',     type: 'mutation' },

  // ===== levels =====
  'levels.list':                  { method: 'GET',  path: '/api/game/levels',              type: 'query' },
  'levels.getById':               { method: 'GET',  path: '/api/game/levels',              type: 'query' },
  'levels.create':                { method: 'POST', path: '/api/game/levels',              type: 'mutation' },
  'levels.batchUpdate':           { method: 'PUT',  path: '/api/game/levels/batch',        type: 'mutation' },
  'levels.difficultyDistribution':{ method: 'GET',  path: '/api/game/levels/difficulty-distribution', type: 'query' },

  // ===== experiments =====
  'experiments.list':             { method: 'GET',  path: '/api/game/experiments',          type: 'query' },
  'experiments.getById':          { method: 'GET',  path: '/api/game/experiments',          type: 'query' },
  'experiments.create':           { method: 'POST', path: '/api/game/experiments',          type: 'mutation' },
  'experiments.update':           { method: 'PUT',  path: '/api/game/experiments',          type: 'mutation' },
  'experiments.updateStatus':     { method: 'PUT',  path: '/api/game/experiments/status',   type: 'mutation' },
  'experiments.delete':           { method: 'DELETE', path: '/api/game/experiments',        type: 'mutation' },

  // ===== config =====
  'config.list':                  { method: 'GET',  path: '/api/game/configs',              type: 'query' },
  'config.getById':               { method: 'GET',  path: '/api/game/configs',              type: 'query' },
  'config.create':                { method: 'POST', path: '/api/game/configs',              type: 'mutation' },
  'config.update':                { method: 'PUT',  path: '/api/game/configs',              type: 'mutation' },
  'config.publish':               { method: 'POST', path: '/api/game/configs/publish',      type: 'mutation' },
  'config.rollback':              { method: 'POST', path: '/api/game/configs/rollback',     type: 'mutation' },
  'configVersions.list':          { method: 'GET',  path: '/api/game/configs/versions',     type: 'query' },
  'configVersions.rollback':      { method: 'POST', path: '/api/game/configs/versions/rollback', type: 'mutation' },

  // ===== segment =====
  'segment.list':                 { method: 'GET',  path: '/api/game/segments',             type: 'query' },
  'segment.getById':              { method: 'GET',  path: '/api/game/segments',             type: 'query' },
  'segment.create':               { method: 'POST', path: '/api/game/segments',             type: 'mutation' },
  'segment.update':               { method: 'PUT',  path: '/api/game/segments',             type: 'mutation' },
  'segment.delete':               { method: 'DELETE', path: '/api/game/segments',           type: 'mutation' },
  'segment.simulate':             { method: 'POST', path: '/api/game/segments/simulate',    type: 'mutation' },
  'segmentConfig.listTemplates':  { method: 'GET',  path: '/api/game/segments/templates',   type: 'query' },
  'segmentTools.estimateSize':    { method: 'POST', path: '/api/game/segments/tools/estimate', type: 'mutation' },

  // ===== monetize =====
  'monetize.listRules':           { method: 'GET',  path: '/api/game/monetize',             type: 'query' },
  'monetize.createRule':          { method: 'POST', path: '/api/game/monetize',             type: 'mutation' },
  'monetize.updateRule':          { method: 'PUT',  path: '/api/game/monetize',             type: 'mutation' },
  'monetize.toggleRule':          { method: 'PUT',  path: '/api/game/monetize/toggle',      type: 'mutation' },
  'iapProducts.list':             { method: 'GET',  path: '/api/game/monetize/iap-products', type: 'query' },
  'iapProducts.create':           { method: 'POST', path: '/api/game/monetize/iap-products', type: 'mutation' },
  'pricingEngine.listStrategies': { method: 'GET',  path: '/api/game/pricing',              type: 'query' },
  'pricingEngine.createStrategy': { method: 'POST', path: '/api/game/pricing',              type: 'mutation' },

  // ===== pushCenter =====
  'pushCenter.listTasks':         { method: 'GET',  path: '/api/ops/push',                  type: 'query' },
  'pushCenter.createTask':        { method: 'POST', path: '/api/ops/push',                  type: 'mutation' },
  'pushCenter.cancelTask':        { method: 'PUT',  path: '/api/ops/push/cancel',           type: 'mutation' },
  'pushTemplates.list':           { method: 'GET',  path: '/api/ops/push/templates',        type: 'query' },
  'pushTemplates.create':         { method: 'POST', path: '/api/ops/push/templates',        type: 'mutation' },

  // ===== recallPlans =====
  'recallPlans.list':             { method: 'GET',  path: '/api/ops/recall',                type: 'query' },
  'recallPlans.create':           { method: 'POST', path: '/api/ops/recall',                type: 'mutation' },
  'recallPlans.update':           { method: 'PUT',  path: '/api/ops/recall',                type: 'mutation' },

  // ===== alerts =====
  'alerts.list':                  { method: 'GET',  path: '/api/ops/alerts',                type: 'query' },
  'alerts.listRules':             { method: 'GET',  path: '/api/ops/alerts/rules',          type: 'query' },
  'alerts.createRule':            { method: 'POST', path: '/api/ops/alerts/rules',          type: 'mutation' },
  'alerts.acknowledge':           { method: 'PUT',  path: '/api/ops/alerts/acknowledge',    type: 'mutation' },
  'alerts.getDashboardAlertSummary': { method: 'GET', path: '/api/ops/alerts/summary',      type: 'query' },

  // ===== scheduler =====
  'scheduler.list':               { method: 'GET',  path: '/api/ops/scheduler',             type: 'query' },
  'scheduler.trigger':            { method: 'POST', path: '/api/ops/scheduler/trigger',     type: 'mutation' },

  // ===== audience =====
  'audience.list':                { method: 'GET',  path: '/api/ops/audience',              type: 'query' },
  'audience.create':              { method: 'POST', path: '/api/ops/audience',              type: 'mutation' },
  'audienceTemplates.list':       { method: 'GET',  path: '/api/ops/audience/templates',    type: 'query' },

  // ===== dailyReport =====
  'dailyReport.list':             { method: 'GET',  path: '/api/ops/daily-report',          type: 'query' },
  'dailyReport.getById':          { method: 'GET',  path: '/api/ops/daily-report',          type: 'query' },
  'dailyReport.generate':         { method: 'POST', path: '/api/ops/daily-report/generate', type: 'mutation' },

  // ===== feishu =====
  'feishu.sync':                  { method: 'POST', path: '/api/ops/feishu/sync',           type: 'mutation' },
  'feishu.listUsers':             { method: 'GET',  path: '/api/ops/feishu/users',          type: 'query' },
  'feishu.listDepts':             { method: 'GET',  path: '/api/ops/feishu/departments',    type: 'query' },
  'feishuNotification.list':      { method: 'GET',  path: '/api/ops/feishu/notifications',  type: 'query' },
  'feishuNotification.send':      { method: 'POST', path: '/api/ops/feishu/notifications/send', type: 'mutation' },

  // ===== aiAssistant =====
  'aiAssistant.listSessions':     { method: 'GET',  path: '/api/ai/assistant/sessions',     type: 'query' },
  'aiAssistant.getSession':       { method: 'GET',  path: '/api/ai/assistant/sessions',     type: 'query' },
  'aiAssistant.chat':             { method: 'POST', path: '/api/ai/assistant/chat',         type: 'mutation' },
  'aiAssistant.deleteSession':    { method: 'DELETE', path: '/api/ai/assistant/sessions',   type: 'mutation' },

  // ===== productOptimization =====
  'productOptimization.list':     { method: 'GET',  path: '/api/ai/optimization',           type: 'query' },
  'productOptimization.generate': { method: 'POST', path: '/api/ai/optimization/generate',  type: 'mutation' },
  'productOptimization.adopt':    { method: 'PUT',  path: '/api/ai/optimization/adopt',     type: 'mutation' },
  'productOptimization.dismiss':  { method: 'PUT',  path: '/api/ai/optimization/dismiss',   type: 'mutation' },

  // ===== knowledgeBase =====
  'knowledgeBase.list':           { method: 'GET',  path: '/api/ai/knowledge',              type: 'query' },
  'knowledgeBase.search':         { method: 'GET',  path: '/api/ai/knowledge/search',       type: 'query' },
  'knowledgeBase.create':         { method: 'POST', path: '/api/ai/knowledge',              type: 'mutation' },
  'knowledgeBase.update':         { method: 'PUT',  path: '/api/ai/knowledge',              type: 'mutation' },
  'knowledgeBase.delete':         { method: 'DELETE', path: '/api/ai/knowledge',            type: 'mutation' },

  // ===== decisionLogs =====
  'decisionLogs.list':            { method: 'GET',  path: '/api/ai/decisions',              type: 'query' },
  'decisionLogs.create':          { method: 'POST', path: '/api/ai/decisions',              type: 'mutation' },
  'decisionLogs.updateAction':    { method: 'PUT',  path: '/api/ai/decisions/action',       type: 'mutation' },

  // ===== customReports =====
  'customReports.list':           { method: 'GET',  path: '/api/ai/reports',                type: 'query' },
  'customReports.create':         { method: 'POST', path: '/api/ai/reports',                type: 'mutation' },
  'customReports.execute':        { method: 'POST', path: '/api/ai/reports/execute',        type: 'mutation' },

  // ===== exportCenter =====
  'exportCenter.create':          { method: 'POST', path: '/api/ai/export',                 type: 'mutation' },
  'exportCenter.getStatus':       { method: 'GET',  path: '/api/ai/export',                 type: 'query' },

  // ===== globalSearch =====
  'globalSearch.search':          { method: 'GET',  path: '/api/ai/search',                 type: 'query' },

  // ===== auditLog =====
  'auditLog.list':                { method: 'GET',  path: '/api/ai/audit',                  type: 'query' },

  // ===== userProfiles =====
  'userProfiles.list':            { method: 'GET',  path: '/api/ai/user-profiles',          type: 'query' },
  'userProfiles.getById':         { method: 'GET',  path: '/api/ai/user-profiles',          type: 'query' },

  // ===== perfMonitor =====
  'perfMonitor.getMetrics':       { method: 'GET',  path: '/api/ai/perf/metrics',           type: 'query' },
  'perfMonitor.getHealth':        { method: 'GET',  path: '/api/ai/perf/health',            type: 'query' },
};

// ==================== 工具函数 ====================

function buildPath(basePath: string, input: Record<string, unknown> | undefined): string {
  if (!input) return basePath;
  // 如果有 id，替换路径末尾或附加
  if (input.id) return `${basePath}/${input.id}`;
  return basePath;
}

function buildParams(input: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!input) return undefined;
  // 排除 id（已用于路径）
  const { id, ...params } = input;
  return Object.keys(params).length > 0 ? params : undefined;
}

async function callApi<T>(
  routeKey: string,
  input?: Record<string, unknown>
): Promise<T> {
  const route = ROUTE_MAP[routeKey];
  if (!route) {
    console.warn(`[trpc-adapter] 未映射的路由: ${routeKey}，返回空数据`);
    return [] as unknown as T;
  }

  const path = buildPath(route.path, input);

  switch (route.method) {
    case 'GET':
      return apiGet<T>(path, buildParams(input));
    case 'POST':
      return apiPost<T>(path, input);
    case 'PUT':
      return apiPut<T>(path, input);
    case 'PATCH':
      return apiPatch<T>(path, input);
    case 'DELETE':
      return apiDelete<T>(path, input);
    default:
      return apiGet<T>(path, buildParams(input));
  }
}

// ==================== Proxy 工厂 ====================
// 模拟 trpc.router.procedure.useQuery() / useMutation()

function createProcedureProxy(routeKey: string) {
  return {
    useQuery: (input?: unknown, options?: UseQueryOptions) => {
      return useQuery({
        queryKey: [routeKey, input],
        queryFn: () => callApi(routeKey, input as Record<string, unknown>),
        ...options,
      } as UseQueryOptions);
    },

    useMutation: (options?: UseMutationOptions) => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (variables: unknown) =>
          callApi(routeKey, variables as Record<string, unknown>),
        onSuccess: () => {
          // 自动使相关查询缓存失效
          const [router] = routeKey.split('.');
          queryClient.invalidateQueries({ queryKey: [routeKey] });
          // 同时使同一 router 下所有查询失效
          queryClient.invalidateQueries({ predicate: (q) => {
            const key = q.queryKey[0] as string;
            return key?.startsWith(router + '.');
          }});
        },
        ...options,
      } as UseMutationOptions);
    },

    // 支持 trpc.xxx.xxx.query() 直接调用（非 Hook）
    query: (input?: unknown) => callApi(routeKey, input as Record<string, unknown>),
    mutate: (input?: unknown) => callApi(routeKey, input as Record<string, unknown>),
  };
}

function createRouterProxy(routerName: string): Record<string, ReturnType<typeof createProcedureProxy>> {
  return new Proxy({} as Record<string, ReturnType<typeof createProcedureProxy>>, {
    get(_target, procedureName: string) {
      const routeKey = `${routerName}.${procedureName}`;
      return createProcedureProxy(routeKey);
    },
  });
}

// ==================== trpc 对象（兼容原 API）====================
export const trpc = new Proxy({} as Record<string, ReturnType<typeof createRouterProxy>>, {
  get(_target, routerName: string) {
    return createRouterProxy(routerName);
  },
}) as unknown as ReturnType<typeof createTRPCProxy>;

// 类型占位（避免 TS 报错）
function createTRPCProxy() {
  return {} as Record<string, Record<string, {
    useQuery: (input?: unknown, options?: unknown) => ReturnType<typeof useQuery>;
    useMutation: (options?: unknown) => ReturnType<typeof useMutation>;
    query: (input?: unknown) => Promise<unknown>;
    mutate: (input?: unknown) => Promise<unknown>;
  }>>;
}
