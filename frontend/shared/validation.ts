/**
 * 统一输入校验规则
 * 
 * 所有 tRPC 路由的字符串输入都应使用这些预定义的校验规则，
 * 确保输入长度受控，防止恶意超长输入导致的安全问题。
 * 
 * 分类说明：
 * - code: 编码类（如 levelCode, countryCode），最长 50 字符
 * - shortText: 短文本（如 name, title, label），最长 200 字符
 * - mediumText: 中等文本（如 description, hypothesis），最长 2000 字符
 * - longText: 长文本（如 content, markdown），最长 50000 字符
 * - date: 日期字符串（YYYY-MM-DD 格式），最长 30 字符
 * - numeric: 数值型字符串（如 price, ratio），最长 50 字符
 * - id: 外部ID（如 userId, openId），最长 200 字符
 * - url: URL 字符串，最长 2048 字符
 * - json: JSON 字符串，最长 50000 字符
 * - enumLike: 枚举型字符串（如 status, type），最长 50 字符
 */
import { z } from "zod";

// ========== 基础校验规则 ==========

/** 编码类：levelCode, countryCode, itemCode, ruleCode 等 */
export const zCode = z.string().max(50);

/** 短文本：name, title, label, ruleName 等 */
export const zShortText = z.string().max(200);

/** 中等文本：description, hypothesis, message, reason 等 */
export const zMediumText = z.string().max(2000);

/** 长文本：content, markdown, jsonConfig 等 */
export const zLongText = z.string().max(50000);

/** 日期字符串：YYYY-MM-DD 或 ISO 格式 */
export const zDateStr = z.string().max(30);

/** 数值型字符串：price, ratio, score, percent 等 */
export const zNumericStr = z.string().max(50);

/** 外部ID：userId, openId, sessionId 等 */
export const zExternalId = z.string().max(200);

/** URL 字符串 */
export const zUrl = z.string().max(2048);

/** JSON 字符串 */
export const zJsonStr = z.string().max(50000);

/** 枚举型字符串：status, type, scopeType, platform 等 */
export const zEnumStr = z.string().max(50);

/** 搜索关键词 */
export const zSearchStr = z.string().max(200);

/** 通用字符串（兜底，用于无法归类的字段） */
export const zStr = z.string().max(500);

// ========== 带 min(1) 的必填版本 ==========

export const zCodeRequired = zCode.min(1);
export const zShortTextRequired = zShortText.min(1);
export const zMediumTextRequired = zMediumText.min(1);
export const zLongTextRequired = zLongText.min(1);
export const zDateStrRequired = zDateStr.min(1);
export const zNumericStrRequired = zNumericStr.min(1);
export const zExternalIdRequired = zExternalId.min(1);

// ========== 数组版本 ==========

export const zCodeArray = z.array(zCode);
export const zShortTextArray = z.array(zShortText);
export const zStrArray = z.array(zStr);

// ========== JSON 安全替代 z.any() ==========

/** 安全的 JSON 值（递归类型）—— 替代 z.any() 用于 JSON 配置字段 */
export const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ])
);

/** JSON 对象（非 null、非数组）—— 用于 config/settings 字段 */
export const jsonObject = z.record(z.string(), jsonValue);

/** 可选 JSON 对象，默认空对象 */
export const optionalJsonObject = jsonObject.optional();

// ========== 领域特定 Schemas ==========

/** API/归因配置 —— 替代 acquisition/adRevenue 中的 z.any() */
export const apiConfigSchema = z.record(z.string().max(100), jsonValue).optional();

/** 通知渠道配置 —— 替代 alertEnhancement 中的 z.any() */
export const notifyChannelsSchema = z.array(
  z.object({
    type: z.string().max(50),
    target: z.string().max(500),
    enabled: z.boolean().optional(),
  })
).max(20).optional();

/** 受众条件值 —— 替代 audience/audienceTemplates 中的 z.any() */
export const audienceConditionValue = z.union([
  z.string().max(1000),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string().max(200), z.number()])).max(100),
]);

/** 实验目标分层 —— 替代 experiments 中的 z.any() */
export const targetSegmentsSchema = z.array(
  z.string().max(100)
).max(50).optional();

/** 次要指标 —— 替代 experiments 中的 z.any() */
export const secondaryMetricsSchema = z.array(
  z.string().max(100)
).max(20).optional();

/** 覆盖配置 */
export const overrideConfigSchema = jsonObject.optional();

/** 效果配置 */
export const effectConfigSchema = jsonObject.optional();

/** 筛选配置 */
export const filterConfigSchema = jsonObject.optional();

/** 关卡配置数据 */
export const levelConfigSchema = jsonObject;

/** 变现规则配置 */
export const ruleConfigSchema = jsonObject;

/** 推送/召回渠道配置 */
export const channelConfigSchema = jsonObject.optional();

/** 调度任务配置 */
export const taskConfigSchema = jsonObject;

/** TE 集成配置 */
export const integrationConfigSchema = jsonObject.optional();

/** 分层配置规则 */
export const segmentRulesSchema = z.array(jsonObject).max(100).optional();

/** 决策日志指标 */
export const metricsSchema = jsonObject.optional();

/** 自定义报表筛选值 */
export const reportFilterValue = z.union([
  z.string().max(1000),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string().max(200), z.number()])).max(100),
  jsonObject,
]);
