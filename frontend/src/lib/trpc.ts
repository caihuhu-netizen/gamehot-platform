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

  // ===== globalView =====
  'globalView.summary':           { method: 'GET',  path: '/api/ai/global-view/summary',          type: 'query' },
  'globalView.currencyRates':     { method: 'GET',  path: '/api/ai/global-view/currency-rates',    type: 'query' },
  'globalView.regionBreakdown':   { method: 'GET',  path: '/api/ai/global-view/region-breakdown',  type: 'query' },
  'globalView.timezoneData':      { method: 'GET',  path: '/api/ai/global-view/timezone-data',     type: 'query' },
  'globalView.refreshRates':      { method: 'POST', path: '/api/ai/global-view/refresh-rates',     type: 'mutation' },

  // ===== auditLog =====
  'auditLog.list':                { method: 'GET',  path: '/api/ai/audit',                  type: 'query' },

  // ===== userProfiles =====
  'userProfiles.list':            { method: 'GET',  path: '/api/ai/user-profiles',          type: 'query' },
  'userProfiles.getById':         { method: 'GET',  path: '/api/ai/user-profiles',          type: 'query' },

  // ===== perfMonitor =====
  'perfMonitor.getMetrics':       { method: 'GET',  path: '/api/ai/perf/metrics',           type: 'query' },
  'perfMonitor.getHealth':        { method: 'GET',  path: '/api/ai/perf/health',            type: 'query' },

  // ===== 补全路由（自动生成）=====
  'acquisition.getCostSummary': { method: 'GET', path: '/api/data/acquisition/get-cost-summary', type: 'query' },
  'acquisition.getROI': { method: 'GET', path: '/api/data/acquisition/get-roi', type: 'query' },
  'adRevenue.createNetwork': { method: 'POST', path: '/api/data/ad-revenue/create-network', type: 'mutation' },
  'adRevenue.createPlacement': { method: 'POST', path: '/api/data/ad-revenue/create-placement', type: 'mutation' },
  'adRevenue.deleteNetwork': { method: 'DELETE', path: '/api/data/ad-revenue/delete-network', type: 'mutation' },
  'adRevenue.getRevenueSummary': { method: 'GET', path: '/api/data/ad-revenue/get-revenue-summary', type: 'query' },
  'adRevenue.getTotalRevenue': { method: 'GET', path: '/api/data/ad-revenue/get-total-revenue', type: 'query' },
  'adRevenue.listNetworks': { method: 'GET', path: '/api/data/ad-revenue/list-networks', type: 'query' },
  'adRevenue.listPlacements': { method: 'GET', path: '/api/data/ad-revenue/list-placements', type: 'query' },
  'ai.chat': { method: 'GET', path: '/api/ai/ai/chat', type: 'query' },
  'alertEnhancement.createAggregationRule': { method: 'POST', path: '/api/ops/alert-enhancement/create-aggregation-rule', type: 'mutation' },
  'alertEnhancement.createEscalationRule': { method: 'POST', path: '/api/ops/alert-enhancement/create-escalation-rule', type: 'mutation' },
  'alertEnhancement.createMaskingRule': { method: 'POST', path: '/api/ops/alert-enhancement/create-masking-rule', type: 'mutation' },
  'alertEnhancement.createSilenceRule': { method: 'POST', path: '/api/ops/alert-enhancement/create-silence-rule', type: 'mutation' },
  'alertEnhancement.deleteAggregationRule': { method: 'DELETE', path: '/api/ops/alert-enhancement/delete-aggregation-rule', type: 'mutation' },
  'alertEnhancement.deleteEscalationRule': { method: 'DELETE', path: '/api/ops/alert-enhancement/delete-escalation-rule', type: 'mutation' },
  'alertEnhancement.deleteMaskingRule': { method: 'DELETE', path: '/api/ops/alert-enhancement/delete-masking-rule', type: 'mutation' },
  'alertEnhancement.deleteSilenceRule': { method: 'DELETE', path: '/api/ops/alert-enhancement/delete-silence-rule', type: 'mutation' },
  'alertEnhancement.flushDigests': { method: 'POST', path: '/api/ops/alert-enhancement/flush-digests', type: 'mutation' },
  'alertEnhancement.listAggregationRules': { method: 'GET', path: '/api/ops/alert-enhancement/list-aggregation-rules', type: 'query' },
  'alertEnhancement.listEscalationRules': { method: 'GET', path: '/api/ops/alert-enhancement/list-escalation-rules', type: 'query' },
  'alertEnhancement.listMaskingRules': { method: 'GET', path: '/api/ops/alert-enhancement/list-masking-rules', type: 'query' },
  'alertEnhancement.listSilenceRules': { method: 'GET', path: '/api/ops/alert-enhancement/list-silence-rules', type: 'query' },
  'alertEnhancement.previewMasking': { method: 'POST', path: '/api/ops/alert-enhancement/preview-masking', type: 'mutation' },
  'alertEnhancement.runEscalation': { method: 'POST', path: '/api/ops/alert-enhancement/run-escalation', type: 'mutation' },
  'alertEnhancement.updateAggregationRule': { method: 'PUT', path: '/api/ops/alert-enhancement/update-aggregation-rule', type: 'mutation' },
  'alertEnhancement.updateEscalationRule': { method: 'PUT', path: '/api/ops/alert-enhancement/update-escalation-rule', type: 'mutation' },
  'alertEnhancement.updateMaskingRule': { method: 'PUT', path: '/api/ops/alert-enhancement/update-masking-rule', type: 'mutation' },
  'alertEnhancement.updateSilenceRule': { method: 'PUT', path: '/api/ops/alert-enhancement/update-silence-rule', type: 'mutation' },
  'alerts.dashboardSummary': { method: 'GET', path: '/api/ops/alerts/dashboard-summary', type: 'query' },
  'alerts.deleteRule': { method: 'DELETE', path: '/api/ops/alerts/delete-rule', type: 'mutation' },
  'alerts.generateReport': { method: 'POST', path: '/api/ops/alerts/generate-report', type: 'mutation' },
  'alerts.listReports': { method: 'GET', path: '/api/ops/alerts/list-reports', type: 'query' },
  'alerts.resolve': { method: 'POST', path: '/api/ops/alerts/resolve', type: 'mutation' },
  'alerts.runDetection': { method: 'POST', path: '/api/ops/alerts/run-detection', type: 'mutation' },
  'alerts.stats': { method: 'GET', path: '/api/ops/alerts/stats', type: 'query' },
  'alerts.updateRule': { method: 'PUT', path: '/api/ops/alerts/update-rule', type: 'mutation' },
  'analytics.userFunnelStage': { method: 'POST', path: '/api/analytics/user-funnel-stage', type: 'mutation' },
  'apiDocs.getAll': { method: 'GET', path: '/api/ai/api-docs/get-all', type: 'query' },
  'appsflyer.getConfigStatus': { method: 'GET', path: '/api/data/appsflyer/get-config-status', type: 'query' },
  'appsflyer.getReportTypes': { method: 'GET', path: '/api/data/appsflyer/get-report-types', type: 'query' },
  'appsflyer.listSyncLogs': { method: 'GET', path: '/api/data/appsflyer/list-sync-logs', type: 'query' },
  'appsflyer.syncAdRevenue': { method: 'POST', path: '/api/data/appsflyer/sync-ad-revenue', type: 'mutation' },
  'appsflyer.syncCosts': { method: 'POST', path: '/api/data/appsflyer/sync-costs', type: 'mutation' },
  'appsflyer.syncInAppEvents': { method: 'POST', path: '/api/data/appsflyer/sync-in-app-events', type: 'mutation' },
  'appsflyer.syncInstalls': { method: 'POST', path: '/api/data/appsflyer/sync-installs', type: 'mutation' },
  'archiving.createCapacityRule': { method: 'POST', path: '/api/ops/archiving/create-capacity-rule', type: 'mutation' },
  'archiving.createPolicy': { method: 'POST', path: '/api/ops/archiving/create-policy', type: 'mutation' },
  'archiving.deleteCapacityRule': { method: 'DELETE', path: '/api/ops/archiving/delete-capacity-rule', type: 'mutation' },
  'archiving.deletePolicy': { method: 'DELETE', path: '/api/ops/archiving/delete-policy', type: 'mutation' },
  'archiving.executeAll': { method: 'POST', path: '/api/ops/archiving/execute-all', type: 'mutation' },
  'archiving.executePolicy': { method: 'POST', path: '/api/ops/archiving/execute-policy', type: 'mutation' },
  'archiving.getAllTableStats': { method: 'GET', path: '/api/ops/archiving/get-all-table-stats', type: 'query' },
  'archiving.getArchivableTables': { method: 'GET', path: '/api/ops/archiving/get-archivable-tables', type: 'query' },
  'archiving.getBackupTables': { method: 'GET', path: '/api/ops/archiving/get-backup-tables', type: 'query' },
  'archiving.getCapacityRules': { method: 'GET', path: '/api/ops/archiving/get-capacity-rules', type: 'query' },
  'archiving.getLogs': { method: 'GET', path: '/api/ops/archiving/get-logs', type: 'query' },
  'archiving.getPolicies': { method: 'GET', path: '/api/ops/archiving/get-policies', type: 'query' },
  'archiving.purgeBackupData': { method: 'POST', path: '/api/ops/archiving/purge-backup-data', type: 'mutation' },
  'archiving.restoreData': { method: 'POST', path: '/api/ops/archiving/restore-data', type: 'mutation' },
  'archiving.runCapacityCheck': { method: 'POST', path: '/api/ops/archiving/run-capacity-check', type: 'mutation' },
  'archiving.toggleCapacityRule': { method: 'PUT', path: '/api/ops/archiving/toggle-capacity-rule', type: 'mutation' },
  'archiving.togglePolicy': { method: 'PUT', path: '/api/ops/archiving/toggle-policy', type: 'mutation' },
  'audience.calculateCount': { method: 'GET', path: '/api/ops/audience/calculate-count', type: 'query' },
  'audience.delete': { method: 'DELETE', path: '/api/ops/audience/delete', type: 'mutation' },
  'audience.getFieldRegistry': { method: 'GET', path: '/api/ops/audience/get-field-registry', type: 'query' },
  'audience.getOperators': { method: 'GET', path: '/api/ops/audience/get-operators', type: 'query' },
  'audience.preview': { method: 'POST', path: '/api/ops/audience/preview', type: 'mutation' },
  'audienceTemplates.categories': { method: 'GET', path: '/api/ops/audience-templates/categories', type: 'query' },
  'audienceTemplates.createAudience': { method: 'POST', path: '/api/ops/audience-templates/create-audience', type: 'mutation' },
  'audienceTemplates.previewCount': { method: 'POST', path: '/api/ops/audience-templates/preview-count', type: 'mutation' },
  'audience.update': { method: 'PUT', path: '/api/ops/audience/update', type: 'mutation' },
  'auditLog.stats': { method: 'GET', path: '/api/ai/audit-log/stats', type: 'query' },
  'autoResponseApproval.createLevelConfig': { method: 'POST', path: '/api/ops/auto-response-approval/create-level-config', type: 'mutation' },
  'autoResponseApproval.createPolicy': { method: 'POST', path: '/api/ops/auto-response-approval/create-policy', type: 'mutation' },
  'autoResponseApproval.deleteLevelConfig': { method: 'DELETE', path: '/api/ops/auto-response-approval/delete-level-config', type: 'mutation' },
  'autoResponseApproval.deletePolicy': { method: 'DELETE', path: '/api/ops/auto-response-approval/delete-policy', type: 'mutation' },
  'autoResponseApproval.exportApprovals': { method: 'POST', path: '/api/ops/auto-response-approval/export-approvals', type: 'mutation' },
  'autoResponseApproval.exportSLAStats': { method: 'POST', path: '/api/ops/auto-response-approval/export-sla-stats', type: 'mutation' },
  'autoResponseApproval.getApprovalStats': { method: 'GET', path: '/api/ops/auto-response-approval/get-approval-stats', type: 'query' },
  'autoResponseApproval.getEffectTrackingStats': { method: 'GET', path: '/api/ops/auto-response-approval/get-effect-tracking-stats', type: 'query' },
  'autoResponseApproval.listApprovals': { method: 'GET', path: '/api/ops/auto-response-approval/list-approvals', type: 'query' },
  'autoResponseApproval.listEffectTracking': { method: 'GET', path: '/api/ops/auto-response-approval/list-effect-tracking', type: 'query' },
  'autoResponseApproval.listLevelConfigs': { method: 'GET', path: '/api/ops/auto-response-approval/list-level-configs', type: 'query' },
  'autoResponseApproval.listPolicies': { method: 'GET', path: '/api/ops/auto-response-approval/list-policies', type: 'query' },
  'autoResponseApproval.notifyPendingApprovals': { method: 'POST', path: '/api/ops/auto-response-approval/notify-pending-approvals', type: 'mutation' },
  'autoResponseApproval.processTimeouts': { method: 'POST', path: '/api/ops/auto-response-approval/process-timeouts', type: 'mutation' },
  'autoResponseApproval.review': { method: 'POST', path: '/api/ops/auto-response-approval/review', type: 'mutation' },
  'autoResponseApproval.updateLevelConfig': { method: 'PUT', path: '/api/ops/auto-response-approval/update-level-config', type: 'mutation' },
  'autoResponseApproval.updatePolicy': { method: 'PUT', path: '/api/ops/auto-response-approval/update-policy', type: 'mutation' },
  'comparison.countryComparison': { method: 'GET', path: '/api/data/comparison/country-comparison', type: 'query' },
  'comparison.creativeComparison': { method: 'GET', path: '/api/data/comparison/creative-comparison', type: 'query' },
  'comparison.listVersions': { method: 'GET', path: '/api/data/comparison/list-versions', type: 'query' },
  'comparison.segmentComparison': { method: 'GET', path: '/api/data/comparison/segment-comparison', type: 'query' },
  'comparison.versionComparison': { method: 'GET', path: '/api/data/comparison/version-comparison', type: 'query' },
  'config.createItem': { method: 'POST', path: '/api/game/config/create-item', type: 'mutation' },
  'config.createRegionGroup': { method: 'POST', path: '/api/game/config/create-region-group', type: 'mutation' },
  'config.listCountries': { method: 'GET', path: '/api/game/config/list-countries', type: 'query' },
  'config.listItems': { method: 'GET', path: '/api/game/config/list-items', type: 'query' },
  'config.listRegionGroups': { method: 'GET', path: '/api/game/config/list-region-groups', type: 'query' },
  'configRollback.createTrigger': { method: 'POST', path: '/api/game/config-rollback/create-trigger', type: 'mutation' },
  'configRollback.deleteTrigger': { method: 'DELETE', path: '/api/game/config-rollback/delete-trigger', type: 'mutation' },
  'configRollback.listAuditLogs': { method: 'GET', path: '/api/game/config-rollback/list-audit-logs', type: 'query' },
  'configRollback.listTriggers': { method: 'GET', path: '/api/game/config-rollback/list-triggers', type: 'query' },
  'configRollback.rollbackWithAudit': { method: 'POST', path: '/api/game/config-rollback/rollback-with-audit', type: 'mutation' },
  'configRollback.updateTrigger': { method: 'PUT', path: '/api/game/config-rollback/update-trigger', type: 'mutation' },
  'configVersions.compare': { method: 'GET', path: '/api/game/config-versions/compare', type: 'query' },
  'configVersions.createSnapshot': { method: 'POST', path: '/api/game/config-versions/create-snapshot', type: 'mutation' },
  'configVersions.publish': { method: 'POST', path: '/api/game/config-versions/publish', type: 'mutation' },
  'costProfit.deleteEntry': { method: 'DELETE', path: '/api/cost-profit/delete-entry', type: 'mutation' },
  'customReports.adHocQuery': { method: 'GET', path: '/api/ai/custom-reports/ad-hoc-query', type: 'query' },
  'customReports.delete': { method: 'DELETE', path: '/api/ai/custom-reports/delete', type: 'mutation' },
  'customReports.schema': { method: 'GET', path: '/api/ai/custom-reports/schema', type: 'query' },
  'dailyReport.sendNotification': { method: 'POST', path: '/api/ops/daily-report/send-notification', type: 'mutation' },
  'decisionLogs.stats': { method: 'GET', path: '/api/ai/decision-logs/stats', type: 'query' },
  'decisionLogs.updateEffect': { method: 'PUT', path: '/api/ai/decision-logs/update-effect', type: 'mutation' },
  'eventAnalysis.createConfig': { method: 'POST', path: '/api/game/event-analysis/create-config', type: 'mutation' },
  'eventAnalysis.createEvent': { method: 'POST', path: '/api/game/event-analysis/create-event', type: 'mutation' },
  'eventAnalysis.deleteConfig': { method: 'DELETE', path: '/api/game/event-analysis/delete-config', type: 'mutation' },
  'eventAnalysis.deleteEvent': { method: 'DELETE', path: '/api/game/event-analysis/delete-event', type: 'mutation' },
  'eventAnalysis.executeAnalysis': { method: 'POST', path: '/api/game/event-analysis/execute-analysis', type: 'mutation' },
  'eventAnalysis.funnelAnalysis': { method: 'GET', path: '/api/game/event-analysis/funnel-analysis', type: 'query' },
  'eventAnalysis.listConfigs': { method: 'GET', path: '/api/game/event-analysis/list-configs', type: 'query' },
  'eventAnalysis.listEvents': { method: 'GET', path: '/api/game/event-analysis/list-events', type: 'query' },
  'eventAnalysis.retentionAnalysis': { method: 'GET', path: '/api/game/event-analysis/retention-analysis', type: 'query' },
  'eventAnalysis.stats': { method: 'GET', path: '/api/game/event-analysis/stats', type: 'query' },
  'experiments.checkAllRunning': { method: 'POST', path: '/api/game/experiments/check-all-running', type: 'mutation' },
  'experiments.checkGraduation': { method: 'POST', path: '/api/game/experiments/check-graduation', type: 'mutation' },
  'experiments.createVariant': { method: 'POST', path: '/api/game/experiments/create-variant', type: 'mutation' },
  'experiments.getAnalysis': { method: 'GET', path: '/api/game/experiments/get-analysis', type: 'query' },
  'experiments.graduate': { method: 'POST', path: '/api/game/experiments/graduate', type: 'mutation' },
  'experiments.transition': { method: 'POST', path: '/api/game/experiments/transition', type: 'mutation' },
  'exportCenter.createExport': { method: 'POST', path: '/api/ai/export-center/create-export', type: 'mutation' },
  'exportCenter.createSchedule': { method: 'POST', path: '/api/ai/export-center/create-schedule', type: 'mutation' },
  'exportCenter.deleteSchedule': { method: 'DELETE', path: '/api/ai/export-center/delete-schedule', type: 'mutation' },
  'exportCenter.listDataSources': { method: 'GET', path: '/api/ai/export-center/list-data-sources', type: 'query' },
  'exportCenter.listSchedules': { method: 'GET', path: '/api/ai/export-center/list-schedules', type: 'query' },
  'exportCenter.listTasks': { method: 'GET', path: '/api/ai/export-center/list-tasks', type: 'query' },
  'exportCenter.updateSchedule': { method: 'PUT', path: '/api/ai/export-center/update-schedule', type: 'mutation' },
  'feishu.createRole': { method: 'POST', path: '/api/ops/feishu/create-role', type: 'mutation' },
  'feishu.deleteRole': { method: 'DELETE', path: '/api/ops/feishu/delete-role', type: 'mutation' },
  'feishu.getDepartmentTree': { method: 'GET', path: '/api/ops/feishu/get-department-tree', type: 'query' },
  'feishu.getRolePermissions': { method: 'GET', path: '/api/ops/feishu/get-role-permissions', type: 'query' },
  'feishu.getUserRoles': { method: 'GET', path: '/api/ops/feishu/get-user-roles', type: 'query' },
  'feishu.listDepartments': { method: 'GET', path: '/api/ops/feishu/list-departments', type: 'query' },
  'feishu.listMenuPermissions': { method: 'GET', path: '/api/ops/feishu/list-menu-permissions', type: 'query' },
  'feishu.listRoles': { method: 'GET', path: '/api/ops/feishu/list-roles', type: 'query' },
  'feishu.loginWithCode': { method: 'POST', path: '/api/ops/feishu/login-with-code', type: 'mutation' },
  'feishu.myPermissions': { method: 'GET', path: '/api/ops/feishu/my-permissions', type: 'query' },
  'feishuNotification.createConfig': { method: 'POST', path: '/api/ops/feishu-notification/create-config', type: 'mutation' },
  'feishuNotification.deleteConfig': { method: 'DELETE', path: '/api/ops/feishu-notification/delete-config', type: 'mutation' },
  'feishuNotification.getEventTypes': { method: 'GET', path: '/api/ops/feishu-notification/get-event-types', type: 'query' },
  'feishuNotification.getStats': { method: 'GET', path: '/api/ops/feishu-notification/get-stats', type: 'query' },
  'feishuNotification.listConfigs': { method: 'GET', path: '/api/ops/feishu-notification/list-configs', type: 'query' },
  'feishuNotification.listLogs': { method: 'GET', path: '/api/ops/feishu-notification/list-logs', type: 'query' },
  'feishuNotification.sendTestAlert': { method: 'POST', path: '/api/ops/feishu-notification/send-test-alert', type: 'mutation' },
  'feishuNotification.sendTestText': { method: 'POST', path: '/api/ops/feishu-notification/send-test-text', type: 'mutation' },
  'feishuNotification.testWebhook': { method: 'POST', path: '/api/ops/feishu-notification/test-webhook', type: 'mutation' },
  'feishuNotification.updateConfig': { method: 'PUT', path: '/api/ops/feishu-notification/update-config', type: 'mutation' },
  'feishu.setRolePermissions': { method: 'PUT', path: '/api/ops/feishu/set-role-permissions', type: 'mutation' },
  'feishu.setUserRoles': { method: 'PUT', path: '/api/ops/feishu/set-user-roles', type: 'mutation' },
  'feishu.syncContacts': { method: 'POST', path: '/api/ops/feishu/sync-contacts', type: 'mutation' },
  'feishu.updateRole': { method: 'PUT', path: '/api/ops/feishu/update-role', type: 'mutation' },
  'gameProjects.accessLogs': { method: 'GET', path: '/api/game/game-projects/access-logs', type: 'query' },
  'gameProjects.accessStats': { method: 'GET', path: '/api/game/game-projects/access-stats', type: 'query' },
  'gameProjects.regenerateKeys': { method: 'POST', path: '/api/game/game-projects/regenerate-keys', type: 'mutation' },
  'gameServiceConfigs.create': { method: 'POST', path: '/api/game/game-service-configs/create', type: 'mutation' },
  'gameServiceConfigs.delete': { method: 'DELETE', path: '/api/game/game-service-configs/delete', type: 'mutation' },
  'gameServiceConfigs.getById': { method: 'GET', path: '/api/game/game-service-configs/get-by-id', type: 'query' },
  'gameServiceConfigs.list': { method: 'GET', path: '/api/game/game-service-configs/list', type: 'query' },
  'gameServiceConfigs.serviceTypes': { method: 'GET', path: '/api/game/game-service-configs/service-types', type: 'query' },
  'gameServiceConfigs.update': { method: 'PUT', path: '/api/game/game-service-configs/update', type: 'mutation' },
  'gameServiceConfigs.verify': { method: 'PUT', path: '/api/game/game-service-configs/verify', type: 'mutation' },
  'healthCheck.checkAll': { method: 'POST', path: '/api/ai/health-check/check-all', type: 'mutation' },
  'iapProducts.delete': { method: 'DELETE', path: '/api/game/iap-products/delete', type: 'mutation' },
  'iapProducts.stats': { method: 'GET', path: '/api/game/iap-products/stats', type: 'query' },
  'iapProducts.update': { method: 'PUT', path: '/api/game/iap-products/update', type: 'mutation' },
  'inspection.getConfig': { method: 'GET', path: '/api/ai/inspection/get-config', type: 'query' },
  'inspection.listReports': { method: 'GET', path: '/api/ai/inspection/list-reports', type: 'query' },
  'inspection.runInspection': { method: 'POST', path: '/api/ai/inspection/run-inspection', type: 'mutation' },
  'inspection.updateConfig': { method: 'PUT', path: '/api/ai/inspection/update-config', type: 'mutation' },
  'knowledgeBase.createKnowledge': { method: 'POST', path: '/api/ai/knowledge-base/create-knowledge', type: 'mutation' },
  'knowledgeBase.deleteKnowledge': { method: 'DELETE', path: '/api/ai/knowledge-base/delete-knowledge', type: 'mutation' },
  'knowledgeBase.listKnowledge': { method: 'GET', path: '/api/ai/knowledge-base/list-knowledge', type: 'query' },
  'knowledgeBase.searchKnowledge': { method: 'GET', path: '/api/ai/knowledge-base/search-knowledge', type: 'query' },
  'knowledgeBase.updateKnowledge': { method: 'PUT', path: '/api/ai/knowledge-base/update-knowledge', type: 'mutation' },
  'levels.createProbe': { method: 'POST', path: '/api/game/levels/create-probe', type: 'mutation' },
  'levels.createTemplate': { method: 'POST', path: '/api/game/levels/create-template', type: 'mutation' },
  'levels.delete': { method: 'DELETE', path: '/api/game/levels/delete', type: 'mutation' },
  'levels.listProbes': { method: 'GET', path: '/api/game/levels/list-probes', type: 'query' },
  'levels.listTemplates': { method: 'GET', path: '/api/game/levels/list-templates', type: 'query' },
  'levels.updateProbe': { method: 'PUT', path: '/api/game/levels/update-probe', type: 'mutation' },
  'levels.updateTemplate': { method: 'PUT', path: '/api/game/levels/update-template', type: 'mutation' },
  'logs.list': { method: 'GET', path: '/api/ai/logs/list', type: 'query' },
  'loopEngine.behaviorEventStats': { method: 'GET', path: '/api/game/loop-engine/behavior-event-stats', type: 'query' },
  'loopEngine.decisionFunnel': { method: 'GET', path: '/api/game/loop-engine/decision-funnel', type: 'query' },
  'loopEngine.decisionTraceStats': { method: 'GET', path: '/api/game/loop-engine/decision-trace-stats', type: 'query' },
  'loopEngine.enhancedDashboard': { method: 'GET', path: '/api/game/loop-engine/enhanced-dashboard', type: 'query' },
  'loopEngine.labelDistribution': { method: 'GET', path: '/api/game/loop-engine/label-distribution', type: 'query' },
  'loopEngine.levelEventSummary': { method: 'GET', path: '/api/game/loop-engine/level-event-summary', type: 'query' },
  'loopEngine.listBehaviorEvents': { method: 'GET', path: '/api/game/loop-engine/list-behavior-events', type: 'query' },
  'loopEngine.listDecisionTraces': { method: 'GET', path: '/api/game/loop-engine/list-decision-traces', type: 'query' },
  'loopEngine.listDifficultyMappings': { method: 'GET', path: '/api/game/loop-engine/list-difficulty-mappings', type: 'query' },
  'loopEngine.listExperimentLinks': { method: 'GET', path: '/api/game/loop-engine/list-experiment-links', type: 'query' },
  'loopEngine.listLevelEvents': { method: 'GET', path: '/api/game/loop-engine/list-level-events', type: 'query' },
  'loopEngine.listPredictiveLabels': { method: 'GET', path: '/api/game/loop-engine/list-predictive-labels', type: 'query' },
  'loopEngine.loopHealthTrend': { method: 'GET', path: '/api/game/loop-engine/loop-health-trend', type: 'query' },
  'loopEngine.updateDifficultyMapping': { method: 'PUT', path: '/api/game/loop-engine/update-difficulty-mapping', type: 'mutation' },
  'monetize.createTemplate': { method: 'POST', path: '/api/game/monetize/create-template', type: 'mutation' },
  'monetize.deleteRule': { method: 'DELETE', path: '/api/game/monetize/delete-rule', type: 'mutation' },
  'monetize.listTemplates': { method: 'GET', path: '/api/game/monetize/list-templates', type: 'query' },
  'opsTools.backtestReportDetail': { method: 'POST', path: '/api/ops/ops-tools/backtest-report-detail', type: 'mutation' },
  'opsTools.backtestReports': { method: 'POST', path: '/api/ops/ops-tools/backtest-reports', type: 'mutation' },
  'opsTools.backtestTrend': { method: 'POST', path: '/api/ops/ops-tools/backtest-trend', type: 'mutation' },
  'opsTools.budgetSuggestion': { method: 'GET', path: '/api/ops/ops-tools/budget-suggestion', type: 'query' },
  'opsTools.listCampaigns': { method: 'GET', path: '/api/ops/ops-tools/list-campaigns', type: 'query' },
  'opsTools.ltvAiPredict': { method: 'GET', path: '/api/ops/ops-tools/ltv-ai-predict', type: 'query' },
  'opsTools.ltvPrediction': { method: 'GET', path: '/api/ops/ops-tools/ltv-prediction', type: 'query' },
  'opsTools.ltvPredictionCached': { method: 'GET', path: '/api/ops/ops-tools/ltv-prediction-cached', type: 'query' },
  'opsTools.ltvPredictionHistory': { method: 'GET', path: '/api/ops/ops-tools/ltv-prediction-history', type: 'query' },
  'opsTools.ltvScheduleConfig': { method: 'GET', path: '/api/ops/ops-tools/ltv-schedule-config', type: 'query' },
  'opsTools.ltvSegmentComparison': { method: 'GET', path: '/api/ops/ops-tools/ltv-segment-comparison', type: 'query' },
  'opsTools.roiPrediction': { method: 'GET', path: '/api/ops/ops-tools/roi-prediction', type: 'query' },
  'opsTools.runBacktest': { method: 'POST', path: '/api/ops/ops-tools/run-backtest', type: 'mutation' },
  'opsTools.updateLtvSchedule': { method: 'PUT', path: '/api/ops/ops-tools/update-ltv-schedule', type: 'mutation' },
  'perfMonitor.approvalSLA': { method: 'GET', path: '/api/ai/perf-monitor/approval-sla', type: 'query' },
  'perfMonitor.cacheDetails': { method: 'GET', path: '/api/ai/perf-monitor/cache-details', type: 'query' },
  'perfMonitor.clearCache': { method: 'POST', path: '/api/ai/perf-monitor/clear-cache', type: 'mutation' },
  'perfMonitor.clearLogs': { method: 'POST', path: '/api/ai/perf-monitor/clear-logs', type: 'mutation' },
  'perfMonitor.indexValidation': { method: 'GET', path: '/api/ai/perf-monitor/index-validation', type: 'query' },
  'perfMonitor.logModules': { method: 'GET', path: '/api/ai/perf-monitor/log-modules', type: 'query' },
  'perfMonitor.logStats': { method: 'GET', path: '/api/ai/perf-monitor/log-stats', type: 'query' },
  'perfMonitor.migrationCheck': { method: 'GET', path: '/api/ai/perf-monitor/migration-check', type: 'query' },
  'perfMonitor.queryLogs': { method: 'GET', path: '/api/ai/perf-monitor/query-logs', type: 'query' },
  'perfMonitor.realtimeStats': { method: 'GET', path: '/api/ai/perf-monitor/realtime-stats', type: 'query' },
  'perfMonitor.resetMetrics': { method: 'POST', path: '/api/ai/perf-monitor/reset-metrics', type: 'mutation' },
  'perfMonitor.saveSnapshot': { method: 'POST', path: '/api/ai/perf-monitor/save-snapshot', type: 'mutation' },
  'perfMonitor.slowQueries': { method: 'GET', path: '/api/ai/perf-monitor/slow-queries', type: 'query' },
  'pricingEngine.generatePricingAdvice': { method: 'POST', path: '/api/game/pricing-engine/generate-pricing-advice', type: 'mutation' },
  'pricingEngine.getLayerFeatures': { method: 'GET', path: '/api/game/pricing-engine/get-layer-features', type: 'query' },
  'pricingEngine.getPaymentDistribution': { method: 'GET', path: '/api/game/pricing-engine/get-payment-distribution', type: 'query' },
  'pricingEngine.getRevenueBaseline': { method: 'GET', path: '/api/game/pricing-engine/get-revenue-baseline', type: 'query' },
  'pricingEngine.listRecommendations': { method: 'GET', path: '/api/game/pricing-engine/list-recommendations', type: 'query' },
  'pricingEngine.simulatePricing': { method: 'POST', path: '/api/game/pricing-engine/simulate-pricing', type: 'mutation' },
  'pricingEngine.updateStrategyStatus': { method: 'PUT', path: '/api/game/pricing-engine/update-strategy-status', type: 'mutation' },
  'productOptimization.effects':     { method: 'GET', path: '/api/ai/optimization/effects',     type: 'query' },
  'productOptimization.suggestions': { method: 'GET', path: '/api/ai/optimization/suggestions', type: 'query' },
  'productOptimization.versions':    { method: 'GET', path: '/api/ai/optimization/versions',    type: 'query' },
  // 三层路由：productOptimization.versions.xxx
  'productOptimization.versions.list':    { method: 'GET',  path: '/api/ai/optimization/versions',         type: 'query' },
  'productOptimization.versions.create':  { method: 'POST', path: '/api/ai/optimization/versions',         type: 'mutation' },
  'productOptimization.versions.metrics': { method: 'GET',  path: '/api/ai/optimization/versions/metrics', type: 'query' },
  'productOptimization.suggestions.list':       { method: 'GET',  path: '/api/ai/optimization/suggestions',            type: 'query' },
  'productOptimization.suggestions.generateAI': { method: 'POST', path: '/api/ai/optimization/suggestions/generate-ai', type: 'mutation' },
  'productOptimization.suggestions.update':     { method: 'PUT',  path: '/api/ai/optimization/suggestions/update',      type: 'mutation' },
  'productOptimization.effects.list':           { method: 'GET',  path: '/api/ai/optimization/effects',                 type: 'query' },
  'productOptimization.effects.analyzeVersion': { method: 'POST', path: '/api/ai/optimization/effects/analyze',         type: 'mutation' },
  'pushCenter.create': { method: 'POST', path: '/api/ops/push-center/create', type: 'mutation' },
  'pushCenter.delete': { method: 'DELETE', path: '/api/ops/push-center/delete', type: 'mutation' },
  'pushCenter.list': { method: 'GET', path: '/api/ops/push-center/list', type: 'query' },
  'pushCenter.send': { method: 'POST', path: '/api/ops/push-center/send', type: 'mutation' },
  'pushCenter.stats': { method: 'GET', path: '/api/ops/push-center/stats', type: 'query' },
  'pushTemplates.categories': { method: 'GET', path: '/api/ops/push-templates/categories', type: 'query' },
  'pushTemplates.delete': { method: 'DELETE', path: '/api/ops/push-templates/delete', type: 'mutation' },
  'pushTemplates.update': { method: 'PUT', path: '/api/ops/push-templates/update', type: 'mutation' },
  'pushTemplates.useTemplate': { method: 'POST', path: '/api/ops/push-templates/use-template', type: 'mutation' },
  'recallPlans.delete': { method: 'DELETE', path: '/api/ops/recall-plans/delete', type: 'mutation' },
  'recallPlans.stats': { method: 'GET', path: '/api/ops/recall-plans/stats', type: 'query' },
  'reports.adDailySummary': { method: 'POST', path: '/api/data/reports/ad-daily-summary', type: 'mutation' },
  'reports.monetizeDailySummary': { method: 'GET', path: '/api/data/reports/monetize-daily-summary', type: 'query' },
  'reports.retentionWeekly': { method: 'GET', path: '/api/data/reports/retention-weekly', type: 'query' },
  'reports.userQualityDaily': { method: 'POST', path: '/api/data/reports/user-quality-daily', type: 'mutation' },
  'router.procedure': { method: 'GET', path: '/api/router/procedure', type: 'query' },
  'scheduler.cleanupLogs': { method: 'POST', path: '/api/ops/scheduler/cleanup-logs', type: 'mutation' },
  'scheduler.create': { method: 'POST', path: '/api/ops/scheduler/create', type: 'mutation' },
  'scheduler.delete': { method: 'DELETE', path: '/api/ops/scheduler/delete', type: 'mutation' },
  'scheduler.getTaskTypes': { method: 'GET', path: '/api/ops/scheduler/get-task-types', type: 'query' },
  'scheduler.logs': { method: 'GET', path: '/api/ops/scheduler/logs', type: 'query' },
  'scheduler.seedBuiltInTasks': { method: 'POST', path: '/api/ops/scheduler/seed-built-in-tasks', type: 'mutation' },
  'scheduler.stats': { method: 'GET', path: '/api/ops/scheduler/stats', type: 'query' },
  'scheduler.toggle': { method: 'PUT', path: '/api/ops/scheduler/toggle', type: 'mutation' },
  'scheduler.update': { method: 'PUT', path: '/api/ops/scheduler/update', type: 'mutation' },
  'sdkDownload.downloadPackage': { method: 'GET', path: '/api/ai/sdk-download/download-package', type: 'query' },
  'segmentConfig.applyTemplate': { method: 'POST', path: '/api/game/segment-config/apply-template', type: 'mutation' },
  'segmentConfig.createLayerLogic': { method: 'POST', path: '/api/game/segment-config/create-layer-logic', type: 'mutation' },
  'segmentConfig.deleteLayerLogic': { method: 'DELETE', path: '/api/game/segment-config/delete-layer-logic', type: 'mutation' },
  'segmentConfig.deleteTemplate': { method: 'DELETE', path: '/api/game/segment-config/delete-template', type: 'mutation' },
  'segmentConfig.getSegmentDistribution': { method: 'GET', path: '/api/game/segment-config/get-segment-distribution', type: 'query' },
  'segmentConfig.listBehaviorStrategies': { method: 'GET', path: '/api/game/segment-config/list-behavior-strategies', type: 'query' },
  'segmentConfig.listCalcRules': { method: 'GET', path: '/api/game/segment-config/list-calc-rules', type: 'query' },
  'segmentConfig.listLayerLogic': { method: 'GET', path: '/api/game/segment-config/list-layer-logic', type: 'query' },
  'segmentConfig.saveCurrentAsTemplate': { method: 'POST', path: '/api/game/segment-config/save-current-as-template', type: 'mutation' },
  'segmentConfig.toggleLayerActive': { method: 'PUT', path: '/api/game/segment-config/toggle-layer-active', type: 'mutation' },
  'segmentConfig.updateBehaviorStrategy': { method: 'PUT', path: '/api/game/segment-config/update-behavior-strategy', type: 'mutation' },
  'segmentConfig.updateCalcRule': { method: 'PUT', path: '/api/game/segment-config/update-calc-rule', type: 'mutation' },
  'segmentConfig.updateLayerLogic': { method: 'PUT', path: '/api/game/segment-config/update-layer-logic', type: 'mutation' },
  'segmentTools.exportExcel': { method: 'POST', path: '/api/game/segment-tools/export-excel', type: 'mutation' },
  'segmentTools.importApply': { method: 'POST', path: '/api/game/segment-tools/import-apply', type: 'mutation' },
  'segmentTools.importPreview': { method: 'POST', path: '/api/game/segment-tools/import-preview', type: 'mutation' },
  'segmentTools.simulate': { method: 'POST', path: '/api/game/segment-tools/simulate', type: 'mutation' },
  'teIntegration.activateConnection': { method: 'POST', path: '/api/data/te-integration/activate-connection', type: 'mutation' },
  'teIntegration.createConnection': { method: 'POST', path: '/api/data/te-integration/create-connection', type: 'mutation' },
  'teIntegration.createLinkageRule': { method: 'POST', path: '/api/data/te-integration/create-linkage-rule', type: 'mutation' },
  'teIntegration.createSyncTask': { method: 'POST', path: '/api/data/te-integration/create-sync-task', type: 'mutation' },
  'teIntegration.deleteConnection': { method: 'DELETE', path: '/api/data/te-integration/delete-connection', type: 'mutation' },
  'teIntegration.deleteLinkageRule': { method: 'DELETE', path: '/api/data/te-integration/delete-linkage-rule', type: 'mutation' },
  'teIntegration.executeLinkageRule': { method: 'POST', path: '/api/data/te-integration/execute-linkage-rule', type: 'mutation' },
  'teIntegration.getSyncLogs': { method: 'GET', path: '/api/data/te-integration/get-sync-logs', type: 'query' },
  'teIntegration.listConnections': { method: 'GET', path: '/api/data/te-integration/list-connections', type: 'query' },
  'teIntegration.listLinkageExecutions': { method: 'GET', path: '/api/data/te-integration/list-linkage-executions', type: 'query' },
  'teIntegration.listLinkageRules': { method: 'GET', path: '/api/data/te-integration/list-linkage-rules', type: 'query' },
  'teIntegration.listSyncTasks': { method: 'GET', path: '/api/data/te-integration/list-sync-tasks', type: 'query' },
  'teIntegration.testConnection': { method: 'POST', path: '/api/data/te-integration/test-connection', type: 'mutation' },
  'teIntegration.toggleLinkageRule': { method: 'PUT', path: '/api/data/te-integration/toggle-linkage-rule', type: 'mutation' },
  'userProfiles.getPaymentRecords': { method: 'GET', path: '/api/ai/user-profiles/get-payment-records', type: 'query' },
  'userProfiles.getPaymentSummary': { method: 'GET', path: '/api/ai/user-profiles/get-payment-summary', type: 'query' },
  'userProfiles.getPaymentTrend': { method: 'GET', path: '/api/ai/user-profiles/get-payment-trend', type: 'query' },
  'userProfiles.getProfile': { method: 'GET', path: '/api/ai/user-profiles/get-profile', type: 'query' },
  'userProfiles.getSegmentHistory': { method: 'GET', path: '/api/ai/user-profiles/get-segment-history', type: 'query' },
  'userProfiles.listGameUsers': { method: 'GET', path: '/api/ai/user-profiles/list-game-users', type: 'query' },
  'userProfiles.listSegments': { method: 'GET', path: '/api/ai/user-profiles/list-segments', type: 'query' },
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
    // 未映射的路由，返回 null 让组件走空状态（不崩溃）
    return null as unknown as T;
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
    get(_target, procedureName: string | symbol) {
      if (typeof procedureName !== 'string') return undefined;
      const routeKey = `${routerName}.${procedureName}`;
      
      // 检查是否存在以 routeKey. 开头的三层路由
      // 如果有，必须返回支持三层访问的 Proxy，不能直接返回两层 procedure
      const hasThreeLayerChildren = Object.keys(ROUTE_MAP).some(k => k.startsWith(routeKey + '.'));
      
      if (!hasThreeLayerChildren) {
        // 没有三层子路由，直接返回两层 procedure proxy
        return createProcedureProxy(routeKey);
      }
      
      // 有三层子路由：返回既能作为两层调用（fallback），又能继续访问第三层的 Proxy
      const twoLayerProxy = createProcedureProxy(routeKey);
      return new Proxy(twoLayerProxy as Record<string, unknown>, {
        get(target, subProcedure: string | symbol) {
          if (typeof subProcedure !== 'string') {
            return (target as Record<string, unknown>)[subProcedure as unknown as string];
          }
          // 如果访问的是 useQuery/useMutation/query/mutate/refetch 等 procedure 自身方法，走两层
          if (['useQuery','useMutation','query','mutate','refetch','isLoading','data','error','isPending','isError','isSuccess'].includes(subProcedure)) {
            return (target as Record<string, unknown>)[subProcedure];
          }
          // 否则是第三层路由名
          const threeLayerKey = `${routeKey}.${subProcedure}`;
          return createProcedureProxy(threeLayerKey);
        },
      });
    },
  });
}

// ==================== trpc 对象（兼容原 API）====================
export const trpc = new Proxy({} as Record<string, ReturnType<typeof createRouterProxy>>, {
  get(_target, routerName: string | symbol) {
    // 忽略 Symbol 属性访问（React DevTools / toString 等）
    if (typeof routerName !== 'string') return undefined;
    // useUtils() —— 原 tRPC 的缓存工具，这里用 QueryClient 模拟
    if (routerName === 'useUtils' || routerName === 'useContext') {
      return () => {
        const queryClient = useQueryClient();
        // 返回一个 Proxy，任意 router.procedure.setData/invalidate 都能调
        return new Proxy({}, {
          get(_t, router: string) {
            return new Proxy({}, {
              get(_t2, procedure: string) {
                const routeKey = `${router}.${procedure}`;
                return {
                  setData: (_input: unknown, data: unknown) => {
                    queryClient.setQueryData([routeKey], data);
                  },
                  invalidate: () => {
                    queryClient.invalidateQueries({ queryKey: [routeKey] });
                  },
                  getData: () => {
                    return queryClient.getQueryData([routeKey]);
                  },
                };
              },
            });
          },
        });
      };
    }
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
