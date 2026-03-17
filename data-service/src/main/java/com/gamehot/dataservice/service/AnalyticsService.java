package com.gamehot.dataservice.service;

import com.gamehot.dataservice.dto.CohortLtvDTO;
import com.gamehot.dataservice.dto.CohortRetentionDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;

/**
 * Analytics Service - 分析数据服务
 * 对应 TS: analytics router + db/analytics.ts + db/payments.ts
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final JdbcTemplate jdbc;
    private final RedisTemplate<String, Object> redisTemplate;
    private static final Duration TTL = Duration.ofMinutes(5);

    // ==================== 付费 vs 非付费对比 ====================

    public Object getPayingComparison(Integer gameId) {
        String cacheKey = "analytics:paying-comparison:g" + (gameId != null ? gameId : "all");
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return cached;

        try {
            // Paying users stats
            List<Map<String, Object>> paying = jdbc.queryForList(
                "SELECT 'PAYING' as user_type, COUNT(DISTINCT gu.user_id) as user_count, " +
                "AVG(gu.total_pay_amount) as avg_revenue, " +
                "AVG(DATEDIFF(COALESCE(gu.last_active_time, NOW()), gu.install_time)) as avg_days_active, " +
                "AVG(ubs.session_count) as avg_sessions " +
                "FROM game_users gu " +
                "JOIN user_payment_records upr ON gu.user_id = upr.user_id AND upr.status = 'COMPLETED' " +
                "LEFT JOIN user_behavior_stats ubs ON gu.user_id = ubs.user_id " +
                "WHERE gu.deleted = 0"
            );

            // Non-paying users stats
            List<Map<String, Object>> nonPaying = jdbc.queryForList(
                "SELECT 'NON_PAYING' as user_type, COUNT(DISTINCT gu.user_id) as user_count, " +
                "0 as avg_revenue, " +
                "AVG(DATEDIFF(COALESCE(gu.last_active_time, NOW()), gu.install_time)) as avg_days_active, " +
                "AVG(ubs.session_count) as avg_sessions " +
                "FROM game_users gu " +
                "LEFT JOIN user_payment_records upr ON gu.user_id = upr.user_id AND upr.status = 'COMPLETED' " +
                "LEFT JOIN user_behavior_stats ubs ON gu.user_id = ubs.user_id " +
                "WHERE gu.deleted = 0 AND upr.user_id IS NULL"
            );

            List<Map<String, Object>> combined = new ArrayList<>();
            combined.addAll(paying);
            combined.addAll(nonPaying);

            redisTemplate.opsForValue().set(cacheKey, combined, TTL);
            return combined;
        } catch (Exception e) {
            log.error("getPayingComparison error: {}", e.getMessage());
            return List.of();
        }
    }

    // ==================== 留存对比 ====================

    public Object getRetentionComparison(int days) {
        String cacheKey = "analytics:retention-comparison:d" + days;
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return cached;

        try {
            String sql =
                "SELECT " +
                "  CASE WHEN upr.user_id IS NOT NULL THEN 'PAYING' ELSE 'NON_PAYING' END as user_type, " +
                "  COUNT(DISTINCT gu.user_id) as cohort_size, " +
                "  COUNT(DISTINCT CASE WHEN DATEDIFF(ubs.stat_date, DATE(gu.install_time)) = 1 THEN gu.user_id END) as d1, " +
                "  COUNT(DISTINCT CASE WHEN DATEDIFF(ubs.stat_date, DATE(gu.install_time)) = 3 THEN gu.user_id END) as d3, " +
                "  COUNT(DISTINCT CASE WHEN DATEDIFF(ubs.stat_date, DATE(gu.install_time)) = 7 THEN gu.user_id END) as d7, " +
                "  COUNT(DISTINCT CASE WHEN DATEDIFF(ubs.stat_date, DATE(gu.install_time)) = 14 THEN gu.user_id END) as d14, " +
                "  COUNT(DISTINCT CASE WHEN DATEDIFF(ubs.stat_date, DATE(gu.install_time)) = 30 THEN gu.user_id END) as d30 " +
                "FROM game_users gu " +
                "LEFT JOIN user_behavior_stats ubs ON gu.user_id = ubs.user_id " +
                "LEFT JOIN (SELECT DISTINCT user_id FROM user_payment_records WHERE status = 'COMPLETED') upr ON gu.user_id = upr.user_id " +
                "WHERE gu.deleted = 0 AND gu.install_time >= DATE_SUB(NOW(), INTERVAL " + Math.min(Math.abs(days), 365) + " DAY) " +
                "GROUP BY CASE WHEN upr.user_id IS NOT NULL THEN 'PAYING' ELSE 'NON_PAYING' END";

            List<Map<String, Object>> result = jdbc.queryForList(sql);
            redisTemplate.opsForValue().set(cacheKey, result, TTL);
            return result;
        } catch (Exception e) {
            log.error("getRetentionComparison error: {}", e.getMessage());
            return List.of();
        }
    }

    // ==================== 付费路径漏斗 ====================

    public Object getPaymentFunnel() {
        String cacheKey = "analytics:payment-funnel";
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return cached;

        try {
            Map<String, Object> funnel = new HashMap<>();

            long totalUsers = Optional.ofNullable(
                jdbc.queryForObject("SELECT COUNT(*) FROM game_users WHERE deleted = 0", Long.class)
            ).orElse(0L);

            long hasSession = Optional.ofNullable(
                jdbc.queryForObject("SELECT COUNT(DISTINCT user_id) FROM user_behavior_stats WHERE session_count > 0", Long.class)
            ).orElse(0L);

            long hasConsideredPay = Optional.ofNullable(
                jdbc.queryForObject(
                    "SELECT COUNT(DISTINCT user_id) FROM trigger_decision_traces WHERE decision_result = 'TRIGGERED'",
                    Long.class)
            ).orElse(0L);

            long paid = Optional.ofNullable(
                jdbc.queryForObject(
                    "SELECT COUNT(DISTINCT user_id) FROM user_payment_records WHERE status = 'COMPLETED'",
                    Long.class)
            ).orElse(0L);

            long repeatPaid = Optional.ofNullable(
                jdbc.queryForObject(
                    "SELECT COUNT(*) FROM (SELECT user_id FROM user_payment_records WHERE status = 'COMPLETED' GROUP BY user_id HAVING COUNT(*) >= 2) t",
                    Long.class)
            ).orElse(0L);

            funnel.put("totalUsers", totalUsers);
            funnel.put("hasSession", hasSession);
            funnel.put("hasConsideredPay", hasConsideredPay);
            funnel.put("paid", paid);
            funnel.put("repeatPaid", repeatPaid);

            // conversion rates
            funnel.put("sessionRate", totalUsers > 0 ? Math.round(hasSession * 10000.0 / totalUsers) / 100.0 : 0);
            funnel.put("considerRate", hasSession > 0 ? Math.round(hasConsideredPay * 10000.0 / hasSession) / 100.0 : 0);
            funnel.put("payRate", totalUsers > 0 ? Math.round(paid * 10000.0 / totalUsers) / 100.0 : 0);
            funnel.put("repeatRate", paid > 0 ? Math.round(repeatPaid * 10000.0 / paid) / 100.0 : 0);

            redisTemplate.opsForValue().set(cacheKey, funnel, TTL);
            return funnel;
        } catch (Exception e) {
            log.error("getPaymentFunnel error: {}", e.getMessage());
            return Map.of();
        }
    }

    // ==================== Cohort 留存分析 ====================

    public List<CohortRetentionDTO> getCohortRetention(String startDate, String endDate, String region) {
        String cacheKey = String.format("analytics:cohort-retention:%s:%s:%s",
            startDate != null ? startDate : "", endDate != null ? endDate : "", region != null ? region : "");
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return (List<CohortRetentionDTO>) cached;

        StringBuilder sql = new StringBuilder(
            "SELECT DATE_FORMAT(gu.install_time, '%Y-%m-%d') as cohort_date, " +
            "COUNT(DISTINCT gu.user_id) as cohort_size, " +
            "COUNT(DISTINCT CASE WHEN DATEDIFF(ubs.stat_date, DATE(gu.install_time)) = 1 THEN gu.user_id END) as d1_retained, " +
            "COUNT(DISTINCT CASE WHEN DATEDIFF(ubs.stat_date, DATE(gu.install_time)) = 3 THEN gu.user_id END) as d3_retained, " +
            "COUNT(DISTINCT CASE WHEN DATEDIFF(ubs.stat_date, DATE(gu.install_time)) = 7 THEN gu.user_id END) as d7_retained, " +
            "COUNT(DISTINCT CASE WHEN DATEDIFF(ubs.stat_date, DATE(gu.install_time)) = 14 THEN gu.user_id END) as d14_retained, " +
            "COUNT(DISTINCT CASE WHEN DATEDIFF(ubs.stat_date, DATE(gu.install_time)) = 30 THEN gu.user_id END) as d30_retained " +
            "FROM game_users gu " +
            "LEFT JOIN user_behavior_stats ubs ON gu.user_id = ubs.user_id " +
            "WHERE gu.deleted = 0 "
        );
        if (region != null && !region.isEmpty()) sql.append(" AND gu.region_group_code = '").append(region).append("'");
        if (startDate != null) sql.append(" AND DATE(gu.install_time) >= '").append(startDate).append("'");
        if (endDate != null) sql.append(" AND DATE(gu.install_time) <= '").append(endDate).append("'");
        sql.append(" GROUP BY DATE_FORMAT(gu.install_time, '%Y-%m-%d') ORDER BY cohort_date DESC LIMIT 30");

        List<Map<String, Object>> rows = jdbc.queryForList(sql.toString());
        List<CohortRetentionDTO> result = rows.stream().map(r -> {
            long size = toLong(r.get("cohort_size"));
            long d1 = toLong(r.get("d1_retained"));
            long d3 = toLong(r.get("d3_retained"));
            long d7 = toLong(r.get("d7_retained"));
            long d14 = toLong(r.get("d14_retained"));
            long d30 = toLong(r.get("d30_retained"));
            return CohortRetentionDTO.builder()
                .cohortDate((String) r.get("cohort_date"))
                .cohortSize(size)
                .d1Retained(d1).d3Retained(d3).d7Retained(d7).d14Retained(d14).d30Retained(d30)
                .d1Rate(size > 0 ? Math.round(d1 * 10000.0 / size) / 100.0 : 0)
                .d3Rate(size > 0 ? Math.round(d3 * 10000.0 / size) / 100.0 : 0)
                .d7Rate(size > 0 ? Math.round(d7 * 10000.0 / size) / 100.0 : 0)
                .d14Rate(size > 0 ? Math.round(d14 * 10000.0 / size) / 100.0 : 0)
                .d30Rate(size > 0 ? Math.round(d30 * 10000.0 / size) / 100.0 : 0)
                .build();
        }).toList();

        redisTemplate.opsForValue().set(cacheKey, result, TTL);
        return result;
    }

    // ==================== Cohort LTV ====================

    public List<CohortLtvDTO> getCohortLtv(String startDate, String endDate) {
        String cacheKey = String.format("analytics:cohort-ltv:%s:%s",
            startDate != null ? startDate : "", endDate != null ? endDate : "");
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return (List<CohortLtvDTO>) cached;

        StringBuilder sql = new StringBuilder(
            "SELECT DATE_FORMAT(gu.install_time, '%Y-%m-%d') as cohort_date, " +
            "COUNT(DISTINCT gu.user_id) as cohort_size, " +
            "COALESCE(SUM(CASE WHEN DATEDIFF(upr.created_at, gu.install_time) <= 1 THEN CAST(upr.amount_usd AS DECIMAL(12,2)) ELSE 0 END), 0) as ltv_d1, " +
            "COALESCE(SUM(CASE WHEN DATEDIFF(upr.created_at, gu.install_time) <= 3 THEN CAST(upr.amount_usd AS DECIMAL(12,2)) ELSE 0 END), 0) as ltv_d3, " +
            "COALESCE(SUM(CASE WHEN DATEDIFF(upr.created_at, gu.install_time) <= 7 THEN CAST(upr.amount_usd AS DECIMAL(12,2)) ELSE 0 END), 0) as ltv_d7, " +
            "COALESCE(SUM(CASE WHEN DATEDIFF(upr.created_at, gu.install_time) <= 14 THEN CAST(upr.amount_usd AS DECIMAL(12,2)) ELSE 0 END), 0) as ltv_d14, " +
            "COALESCE(SUM(CASE WHEN DATEDIFF(upr.created_at, gu.install_time) <= 30 THEN CAST(upr.amount_usd AS DECIMAL(12,2)) ELSE 0 END), 0) as ltv_d30 " +
            "FROM game_users gu " +
            "LEFT JOIN user_payment_records upr ON gu.user_id = upr.user_id AND upr.status = 'COMPLETED' " +
            "WHERE gu.deleted = 0 "
        );
        if (startDate != null) sql.append(" AND DATE(gu.install_time) >= '").append(startDate).append("'");
        if (endDate != null) sql.append(" AND DATE(gu.install_time) <= '").append(endDate).append("'");
        sql.append(" GROUP BY DATE_FORMAT(gu.install_time, '%Y-%m-%d') ORDER BY cohort_date DESC LIMIT 30");

        List<Map<String, Object>> rows = jdbc.queryForList(sql.toString());
        List<CohortLtvDTO> result = rows.stream().map(r -> {
            long size = toLong(r.get("cohort_size"));
            double d1 = toDouble(r.get("ltv_d1"));
            double d7 = toDouble(r.get("ltv_d7"));
            double d30 = toDouble(r.get("ltv_d30"));
            return CohortLtvDTO.builder()
                .cohortDate((String) r.get("cohort_date"))
                .cohortSize(size)
                .ltvD1(d1).ltvD3(toDouble(r.get("ltv_d3")))
                .ltvD7(d7).ltvD14(toDouble(r.get("ltv_d14"))).ltvD30(d30)
                .ltvD1PerUser(size > 0 ? Math.round(d1 / size * 10000.0) / 10000.0 : 0)
                .ltvD7PerUser(size > 0 ? Math.round(d7 / size * 10000.0) / 10000.0 : 0)
                .ltvD30PerUser(size > 0 ? Math.round(d30 / size * 10000.0) / 10000.0 : 0)
                .build();
        }).toList();

        redisTemplate.opsForValue().set(cacheKey, result, TTL);
        return result;
    }

    // ==================== 用户生命周期 ====================

    public Object getLifecycleStages() {
        String cacheKey = "analytics:lifecycle-stages";
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return cached;

        List<Map<String, Object>> stages = jdbc.queryForList(
            "SELECT upl.engagement_phase as phase, COUNT(*) as user_count, " +
            "AVG(CAST(upl.ltv_30d AS DECIMAL(10,2))) as avg_ltv, " +
            "AVG(CAST(upl.churn_risk_score AS DECIMAL(5,4))) as avg_churn_risk, " +
            "AVG(CAST(upl.pay_probability AS DECIMAL(5,4))) as avg_pay_prob " +
            "FROM user_predictive_labels upl " +
            "GROUP BY upl.engagement_phase"
        );

        long totalUsers = Optional.ofNullable(
            jdbc.queryForObject("SELECT COUNT(*) FROM game_users WHERE deleted = 0", Long.class)).orElse(0L);
        long activeD7 = Optional.ofNullable(
            jdbc.queryForObject("SELECT COUNT(DISTINCT user_id) FROM user_behavior_stats WHERE stat_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)", Long.class)).orElse(0L);
        long activeD30 = Optional.ofNullable(
            jdbc.queryForObject("SELECT COUNT(DISTINCT user_id) FROM user_behavior_stats WHERE stat_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)", Long.class)).orElse(0L);
        long payingUsers = Optional.ofNullable(
            jdbc.queryForObject("SELECT COUNT(DISTINCT user_id) FROM user_payment_records WHERE status = 'COMPLETED'", Long.class)).orElse(0L);
        long repeatPayers = Optional.ofNullable(
            jdbc.queryForObject("SELECT COUNT(*) FROM (SELECT user_id FROM user_payment_records WHERE status = 'COMPLETED' GROUP BY user_id HAVING COUNT(*) >= 2) t", Long.class)).orElse(0L);

        Map<String, Object> funnel = new HashMap<>();
        funnel.put("totalUsers", totalUsers);
        funnel.put("activeD7", activeD7);
        funnel.put("activeD30", activeD30);
        funnel.put("payingUsers", payingUsers);
        funnel.put("repeatPayers", repeatPayers);

        Map<String, Object> result = new HashMap<>();
        result.put("stages", stages);
        result.put("funnel", funnel);

        redisTemplate.opsForValue().set(cacheKey, result, TTL);
        return result;
    }

    public Object getLifecycleBySegment() {
        String cacheKey = "analytics:lifecycle-by-segment";
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return cached;

        List<Map<String, Object>> result = jdbc.queryForList(
            "SELECT us.segment_level, upl.engagement_phase, COUNT(*) as user_count, " +
            "AVG(CAST(upl.ltv_30d AS DECIMAL(10,2))) as avg_ltv, " +
            "AVG(CAST(upl.churn_risk_score AS DECIMAL(5,4))) as avg_churn_risk " +
            "FROM user_segments us " +
            "JOIN user_predictive_labels upl ON us.user_id = upl.user_id " +
            "WHERE us.deleted = 0 " +
            "GROUP BY us.segment_level, upl.engagement_phase " +
            "ORDER BY us.segment_level, upl.engagement_phase"
        );

        redisTemplate.opsForValue().set(cacheKey, result, TTL);
        return result;
    }

    // ==================== 智能运营建议 ====================

    public List<Map<String, Object>> getProductInsights() {
        String cacheKey = "analytics:product-insights";
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return (List<Map<String, Object>>) cached;

        List<Map<String, Object>> insights = new ArrayList<>();

        try {
            // 1. 高流失风险用户预警
            Long highChurnCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM user_predictive_labels WHERE CAST(churn_risk_score AS DECIMAL(5,4)) > 0.7",
                Long.class);
            if (highChurnCount != null && highChurnCount > 0) {
                Map<String, Object> insight = new HashMap<>();
                insight.put("type", "CHURN_RISK");
                insight.put("severity", highChurnCount > 10 ? "HIGH" : "MEDIUM");
                insight.put("title", "高流失风险用户预警");
                insight.put("description", "当前有 " + highChurnCount + " 名用户流失风险评分超过 0.7，建议立即启动挽回策略");
                insight.put("metric", "高风险用户数");
                insight.put("value", highChurnCount);
                insight.put("benchmark", 5);
                insight.put("recommendation", "建议对这些用户推送限时优惠礼包或降低难度，同时增加免费道具赠送频率，延长用户生命周期");
                insight.put("affectedUsers", highChurnCount);
                insight.put("estimatedImpact", "预计可挽回 " + Math.round(highChurnCount * 0.3) + " 名用户，减少约 $" + String.format("%.0f", highChurnCount * 8.5) + " 潜在收入损失");
                insights.add(insight);
            }

            // 2. 付费转化率
            Long totalUsers = Optional.ofNullable(jdbc.queryForObject("SELECT COUNT(*) FROM game_users WHERE deleted = 0", Long.class)).orElse(1L);
            Long payingUsers = Optional.ofNullable(jdbc.queryForObject("SELECT COUNT(DISTINCT user_id) FROM user_payment_records WHERE status = 'COMPLETED'", Long.class)).orElse(0L);
            double payRate = (double) payingUsers / Math.max(totalUsers, 1);
            if (payRate < 0.05) {
                Map<String, Object> insight = new HashMap<>();
                insight.put("type", "PAY_CONVERSION");
                insight.put("severity", "HIGH");
                insight.put("title", "付费转化率偏低");
                insight.put("description", String.format("当前付费转化率仅 %.1f%%，低于行业基准 5%%", payRate * 100));
                insight.put("metric", "付费转化率");
                insight.put("value", Math.round(payRate * 1000.0) / 10.0);
                insight.put("benchmark", 5);
                insight.put("recommendation", "建议优化首充礼包定价（$0.99入门包），在用户首次卡关时精准推送限时折扣，同时增加免费试用道具的体验机会");
                insight.put("affectedUsers", totalUsers - payingUsers);
                insight.put("estimatedImpact", "若转化率提升至 5%，预计新增 " + Math.round(totalUsers * 0.05 - payingUsers) + " 名付费用户");
                insights.add(insight);
            }

            // 3. 变现触发效率
            Map<String, Object> triggerRow = jdbc.queryForMap(
                "SELECT COUNT(*) as total, " +
                "SUM(CASE WHEN decision_result = 'TRIGGERED' THEN 1 ELSE 0 END) as triggered, " +
                "SUM(CASE WHEN user_action = 'PURCHASED' THEN 1 ELSE 0 END) as purchased, " +
                "SUM(CASE WHEN user_action = 'WATCHED_AD' THEN 1 ELSE 0 END) as watched_ad " +
                "FROM trigger_decision_traces"
            );
            long triggered = toLong(triggerRow.get("triggered"));
            long purchased = toLong(triggerRow.get("purchased"));
            long watchedAd = toLong(triggerRow.get("watched_ad"));
            double convertRate = (purchased + watchedAd) / (double) Math.max(triggered, 1);
            if (convertRate < 0.3) {
                Map<String, Object> insight = new HashMap<>();
                insight.put("type", "MONETIZE_EFFICIENCY");
                insight.put("severity", "MEDIUM");
                insight.put("title", "变现触发转化率待优化");
                insight.put("description", String.format("变现触发后的转化率为 %.1f%%，建议优化弹窗时机和内容", convertRate * 100));
                insight.put("metric", "触发转化率");
                insight.put("value", Math.round(convertRate * 1000.0) / 10.0);
                insight.put("benchmark", 30);
                insight.put("recommendation", "建议在用户连续失败3次后再触发变现弹窗（而非2次），同时根据用户分层差异化弹窗内容");
                insight.put("affectedUsers", triggered);
                insight.put("estimatedImpact", "若转化率提升至 30%，预计每日增加 " + Math.round(triggered * 0.1) + " 次有效变现");
                insights.add(insight);
            }

            // 4. 关卡难度
            Double avgPassRate = jdbc.queryForObject(
                "SELECT AVG(CASE WHEN total_attempts > 0 THEN total_passes / total_attempts ELSE 0 END) FROM level_event_tracking",
                Double.class);
            if (avgPassRate != null && (avgPassRate < 0.4 || avgPassRate > 0.8)) {
                Map<String, Object> insight = new HashMap<>();
                insight.put("type", "DIFFICULTY_BALANCE");
                insight.put("severity", avgPassRate < 0.3 ? "HIGH" : "MEDIUM");
                insight.put("title", avgPassRate < 0.4 ? "关卡难度偏高" : "关卡难度偏低");
                insight.put("description", String.format("平均通过率 %.1f%%，%s最佳心流区间 40%%-70%%", avgPassRate * 100, avgPassRate < 0.4 ? "低于" : "高于"));
                insight.put("metric", "平均通过率");
                insight.put("value", Math.round(avgPassRate * 1000.0) / 10.0);
                insight.put("benchmark", avgPassRate < 0.4 ? 40 : 70);
                insight.put("recommendation", avgPassRate < 0.4
                    ? "建议降低中后期关卡难度系数 10-15%，增加免费提示次数"
                    : "建议适当提升难度以增加挑战感，可通过减少初始步数或增加目标数量实现");
                insight.put("affectedUsers", totalUsers);
                insight.put("estimatedImpact", "优化后预计留存率提升 5-8%，ARPU 提升 3-5%");
                insights.add(insight);
            }

            // 5. 分层覆盖率
            Long segmented = Optional.ofNullable(jdbc.queryForObject("SELECT COUNT(*) FROM user_segments WHERE deleted = 0", Long.class)).orElse(0L);
            double coverageRate = segmented / (double) Math.max(totalUsers, 1);
            if (coverageRate < 0.95) {
                Map<String, Object> insight = new HashMap<>();
                insight.put("type", "SEGMENT_COVERAGE");
                insight.put("severity", "MEDIUM");
                insight.put("title", "分层覆盖率不足");
                insight.put("description", String.format("当前分层覆盖率 %.1f%%，有 %d 名用户未被分层", coverageRate * 100, totalUsers - segmented));
                insight.put("metric", "分层覆盖率");
                insight.put("value", Math.round(coverageRate * 1000.0) / 10.0);
                insight.put("benchmark", 95);
                insight.put("recommendation", "建议检查新用户的分层计算触发逻辑，确保用户完成首个探针关卡后立即触发分层计算");
                insight.put("affectedUsers", totalUsers - segmented);
                insight.put("estimatedImpact", "完善分层后，这些用户将获得个性化的难度和变现策略，预计 ARPU 提升 10-15%");
                insights.add(insight);
            }

            // 6. A/B实验利用率
            Map<String, Object> expRow = jdbc.queryForMap(
                "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'RUNNING' THEN 1 ELSE 0 END) as running FROM ab_experiments WHERE deleted = 0");
            long runningExps = toLong(expRow.get("running"));
            if (runningExps < 3) {
                Map<String, Object> insight = new HashMap<>();
                insight.put("type", "EXPERIMENT_UTILIZATION");
                insight.put("severity", "LOW");
                insight.put("title", "A/B实验并行度不足");
                insight.put("description", "当前仅有 " + runningExps + " 个运行中实验，建议同时运行 3-5 个实验以加速迭代");
                insight.put("metric", "运行中实验数");
                insight.put("value", runningExps);
                insight.put("benchmark", 3);
                insight.put("recommendation", "建议针对以下维度启动实验：1) 不同分层的广告频率优化 2) 首充礼包定价测试 3) 难度曲线斜率对比");
                insight.put("affectedUsers", totalUsers);
                insight.put("estimatedImpact", "增加实验并行度可加速 2-3 倍的策略迭代速度");
                insights.add(insight);
            }
        } catch (Exception e) {
            log.error("getProductInsights error: {}", e.getMessage());
        }

        // Sort: HIGH > MEDIUM > LOW
        insights.sort(Comparator.comparingInt(i -> {
            String sev = (String) ((Map<String, Object>) i).get("severity");
            return switch (sev != null ? sev : "") {
                case "HIGH" -> 0;
                case "MEDIUM" -> 1;
                default -> 2;
            };
        }));

        redisTemplate.opsForValue().set(cacheKey, insights, TTL);
        return insights;
    }

    // ==================== KPI 下钻 ====================

    public Object getKpiDrillDown(String kpiType) {
        String cacheKey = "analytics:kpi-drilldown:" + kpiType;
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return cached;

        Map<String, Object> result = new HashMap<>();
        try {
            if ("revenue".equals(kpiType)) {
                result.put("bySegment", jdbc.queryForList(
                    "SELECT us.segment_level, COALESCE(SUM(CAST(upr.amount_usd AS DECIMAL(10,2))), 0) as total_revenue, " +
                    "COUNT(DISTINCT upr.user_id) as paying_users, COUNT(upr.id) as transaction_count " +
                    "FROM user_segments us " +
                    "LEFT JOIN user_payment_records upr ON us.user_id = upr.user_id AND upr.status = 'COMPLETED' " +
                    "WHERE us.deleted = 0 GROUP BY us.segment_level ORDER BY us.segment_level"));
                result.put("byRegion", jdbc.queryForList(
                    "SELECT gu.region_group_code as region, COALESCE(SUM(CAST(upr.amount_usd AS DECIMAL(10,2))), 0) as total_revenue, " +
                    "COUNT(DISTINCT upr.user_id) as paying_users " +
                    "FROM game_users gu LEFT JOIN user_payment_records upr ON gu.user_id = upr.user_id AND upr.status = 'COMPLETED' " +
                    "WHERE gu.deleted = 0 GROUP BY gu.region_group_code"));
                result.put("byDevice", jdbc.queryForList(
                    "SELECT gu.device_type, COALESCE(SUM(CAST(upr.amount_usd AS DECIMAL(10,2))), 0) as total_revenue, " +
                    "COUNT(DISTINCT upr.user_id) as paying_users " +
                    "FROM game_users gu LEFT JOIN user_payment_records upr ON gu.user_id = upr.user_id AND upr.status = 'COMPLETED' " +
                    "WHERE gu.deleted = 0 GROUP BY gu.device_type"));
                result.put("trend", jdbc.queryForList(
                    "SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, SUM(CAST(amount_usd AS DECIMAL(10,2))) as daily_revenue, COUNT(*) as transactions " +
                    "FROM user_payment_records WHERE status = 'COMPLETED' " +
                    "GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d') ORDER BY date DESC LIMIT 30"));
            } else if ("users".equals(kpiType)) {
                result.put("bySegment", jdbc.queryForList(
                    "SELECT segment_level, COUNT(*) as user_count FROM user_segments WHERE deleted = 0 GROUP BY segment_level ORDER BY segment_level"));
                result.put("byRegion", jdbc.queryForList(
                    "SELECT region_group_code as region, COUNT(*) as user_count FROM game_users WHERE deleted = 0 GROUP BY region_group_code"));
                result.put("byDevice", jdbc.queryForList(
                    "SELECT device_type, COUNT(*) as user_count FROM game_users WHERE deleted = 0 GROUP BY device_type"));
                result.put("trend", jdbc.queryForList(
                    "SELECT DATE_FORMAT(install_time, '%Y-%m-%d') as date, COUNT(*) as new_users " +
                    "FROM game_users WHERE deleted = 0 GROUP BY DATE_FORMAT(install_time, '%Y-%m-%d') ORDER BY date DESC LIMIT 30"));
            } else if ("arpu".equals(kpiType)) {
                result.put("bySegment", jdbc.queryForList(
                    "SELECT us.segment_level, COUNT(DISTINCT gu.user_id) as user_count, " +
                    "COALESCE(SUM(CAST(upr.amount_usd AS DECIMAL(10,2))), 0) as total_revenue, " +
                    "COALESCE(SUM(CAST(upr.amount_usd AS DECIMAL(10,2))) / NULLIF(COUNT(DISTINCT gu.user_id), 0), 0) as arpu " +
                    "FROM user_segments us JOIN game_users gu ON us.user_id = gu.user_id AND gu.deleted = 0 " +
                    "LEFT JOIN user_payment_records upr ON gu.user_id = upr.user_id AND upr.status = 'COMPLETED' " +
                    "WHERE us.deleted = 0 GROUP BY us.segment_level ORDER BY us.segment_level"));
                result.put("byRegion", jdbc.queryForList(
                    "SELECT gu.region_group_code as region, COUNT(DISTINCT gu.user_id) as user_count, " +
                    "COALESCE(SUM(CAST(upr.amount_usd AS DECIMAL(10,2))), 0) as total_revenue, " +
                    "COALESCE(SUM(CAST(upr.amount_usd AS DECIMAL(10,2))) / NULLIF(COUNT(DISTINCT gu.user_id), 0), 0) as arpu " +
                    "FROM game_users gu LEFT JOIN user_payment_records upr ON gu.user_id = upr.user_id AND upr.status = 'COMPLETED' " +
                    "WHERE gu.deleted = 0 GROUP BY gu.region_group_code"));
                result.put("byDevice", List.of());
                result.put("trend", List.of());
            } else if ("experiments".equals(kpiType)) {
                result.put("bySegment", jdbc.queryForList(
                    "SELECT status, COUNT(*) as count FROM ab_experiments WHERE deleted = 0 GROUP BY status"));
                result.put("byRegion", jdbc.queryForList(
                    "SELECT experiment_type, COUNT(*) as count FROM ab_experiments WHERE deleted = 0 GROUP BY experiment_type"));
                result.put("byDevice", List.of());
                result.put("trend", List.of());
            } else {
                result.put("bySegment", List.of());
                result.put("byRegion", List.of());
                result.put("byDevice", List.of());
                result.put("trend", List.of());
            }
        } catch (Exception e) {
            log.error("getKpiDrillDown error for kpiType={}: {}", kpiType, e.getMessage());
        }

        redisTemplate.opsForValue().set(cacheKey, result, TTL);
        return result;
    }

    // ==================== 异常检测 ====================

    public List<Map<String, Object>> detectAnomalies() {
        String cacheKey = "analytics:anomalies";
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return (List<Map<String, Object>>) cached;

        List<Map<String, Object>> anomalies = new ArrayList<>();
        try {
            // Revenue anomaly
            Map<String, Object> rev = jdbc.queryForMap(
                "SELECT " +
                "COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN CAST(amount_usd AS DECIMAL(12,2)) END), 0) as recent_value, " +
                "COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN CAST(amount_usd AS DECIMAL(12,2)) END), 0) as prev_value " +
                "FROM user_payment_records WHERE status = 'COMPLETED'"
            );
            double recentRev = toDouble(rev.get("recent_value"));
            double prevRev = toDouble(rev.get("prev_value"));
            if (prevRev > 0) {
                double changeRate = (recentRev - prevRev) / prevRev * 100;
                if (Math.abs(changeRate) > 15) {
                    Map<String, Object> a = new HashMap<>();
                    a.put("metric", "总收入"); a.put("metricKey", "revenue");
                    a.put("recentValue", String.format("%.2f", recentRev));
                    a.put("prevValue", String.format("%.2f", prevRev));
                    a.put("changeRate", String.format("%.1f", changeRate));
                    a.put("direction", changeRate > 0 ? "上升" : "下降");
                    a.put("severity", Math.abs(changeRate) > 30 ? "critical" : "warning");
                    a.put("unit", "$");
                    anomalies.add(a);
                }
            }

            // DAU anomaly
            Map<String, Object> dau = jdbc.queryForMap(
                "SELECT " +
                "COUNT(CASE WHEN last_active_time >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as recent_dau, " +
                "COUNT(CASE WHEN last_active_time >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND last_active_time < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as prev_dau " +
                "FROM game_users WHERE deleted = 0"
            );
            double recentDau = toDouble(dau.get("recent_dau"));
            double prevDau = toDouble(dau.get("prev_dau"));
            if (prevDau > 0) {
                double changeRate = (recentDau - prevDau) / prevDau * 100;
                if (Math.abs(changeRate) > 10) {
                    Map<String, Object> a = new HashMap<>();
                    a.put("metric", "活跃用户数"); a.put("metricKey", "dau");
                    a.put("recentValue", (long) recentDau); a.put("prevValue", (long) prevDau);
                    a.put("changeRate", String.format("%.1f", changeRate));
                    a.put("direction", changeRate > 0 ? "上升" : "下降");
                    a.put("severity", Math.abs(changeRate) > 25 ? "critical" : "warning");
                    a.put("unit", "人");
                    anomalies.add(a);
                }
            }

            // Pay rate anomaly
            Map<String, Object> pay = jdbc.queryForMap(
                "SELECT " +
                "COUNT(DISTINCT CASE WHEN upr.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN upr.user_id END) as recent_payers, " +
                "COUNT(DISTINCT CASE WHEN gu.last_active_time >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN gu.user_id END) as recent_active, " +
                "COUNT(DISTINCT CASE WHEN upr.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND upr.created_at < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN upr.user_id END) as prev_payers, " +
                "COUNT(DISTINCT CASE WHEN gu.last_active_time >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND gu.last_active_time < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN gu.user_id END) as prev_active " +
                "FROM game_users gu " +
                "LEFT JOIN user_payment_records upr ON gu.user_id = upr.user_id AND upr.status = 'COMPLETED' " +
                "WHERE gu.deleted = 0"
            );
            double recentActive = toDouble(pay.get("recent_active"));
            double prevActive = toDouble(pay.get("prev_active"));
            double recentPayRate = recentActive > 0 ? toDouble(pay.get("recent_payers")) / recentActive * 100 : 0;
            double prevPayRate = prevActive > 0 ? toDouble(pay.get("prev_payers")) / prevActive * 100 : 0;
            if (prevPayRate > 0) {
                double changeRate = (recentPayRate - prevPayRate) / prevPayRate * 100;
                if (Math.abs(changeRate) > 20) {
                    Map<String, Object> a = new HashMap<>();
                    a.put("metric", "付费转化率"); a.put("metricKey", "pay_rate");
                    a.put("recentValue", String.format("%.2f", recentPayRate));
                    a.put("prevValue", String.format("%.2f", prevPayRate));
                    a.put("changeRate", String.format("%.1f", changeRate));
                    a.put("direction", changeRate > 0 ? "上升" : "下降");
                    a.put("severity", Math.abs(changeRate) > 40 ? "critical" : "warning");
                    a.put("unit", "%");
                    anomalies.add(a);
                }
            }
        } catch (Exception e) {
            log.error("detectAnomalies error: {}", e.getMessage());
        }

        redisTemplate.opsForValue().set(cacheKey, anomalies, TTL);
        return anomalies;
    }

    // ==================== 关卡级洞察 ====================

    public Object getLevelInsights() {
        String cacheKey = "analytics:level-insights";
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return cached;

        try {
            List<Map<String, Object>> levels = jdbc.queryForList(
                "SELECT level_id, level_name, " +
                "SUM(total_attempts) as total_attempts, SUM(total_passes) as total_passes, " +
                "SUM(total_fails) as total_fails, " +
                "CASE WHEN SUM(total_attempts) > 0 THEN SUM(total_passes) / SUM(total_attempts) * 100 ELSE 0 END as pass_rate, " +
                "AVG(avg_attempts_to_pass) as avg_attempts_to_pass, " +
                "SUM(iap_trigger_count) as iap_trigger_count, SUM(ad_trigger_count) as ad_trigger_count, " +
                "SUM(purchase_count) as purchase_count, SUM(ad_watch_count) as ad_watch_count " +
                "FROM level_event_tracking " +
                "GROUP BY level_id, level_name ORDER BY level_id LIMIT 100"
            );

            // Overall stats
            Map<String, Object> overall = new HashMap<>();
            Double avgPassRate = jdbc.queryForObject(
                "SELECT AVG(CASE WHEN total_attempts > 0 THEN total_passes / total_attempts ELSE 0 END) FROM level_event_tracking",
                Double.class);
            overall.put("avgPassRate", avgPassRate != null ? Math.round(avgPassRate * 10000.0) / 100.0 : 0);

            List<Map<String, Object>> hardLevels = levels.stream()
                .filter(l -> {
                    Object pr = l.get("pass_rate");
                    return pr != null && toDouble(pr) < 30;
                })
                .limit(10).toList();

            Map<String, Object> result = new HashMap<>();
            result.put("levels", levels);
            result.put("overall", overall);
            result.put("hardLevels", hardLevels);

            redisTemplate.opsForValue().set(cacheKey, result, TTL);
            return result;
        } catch (Exception e) {
            log.error("getLevelInsights error: {}", e.getMessage());
            return Map.of("levels", List.of(), "overall", Map.of(), "hardLevels", List.of());
        }
    }

    // ==================== Helpers ====================

    private long toLong(Object val) {
        if (val == null) return 0;
        if (val instanceof Number) return ((Number) val).longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return 0; }
    }

    private double toDouble(Object val) {
        if (val == null) return 0;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try { return Double.parseDouble(val.toString()); } catch (Exception e) { return 0; }
    }
}
