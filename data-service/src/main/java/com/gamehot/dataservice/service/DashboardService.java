package com.gamehot.dataservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Dashboard Service - 仪表盘数据服务
 * 对应 TS: dashboard router + db/dashboard.ts
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final JdbcTemplate jdbc;
    private final RedisTemplate<String, Object> redisTemplate;
    private static final Duration TTL_SHORT = Duration.ofMinutes(5);
    private static final Duration TTL_MEDIUM = Duration.ofMinutes(10);

    // ==================== Overview ====================

    public Map<String, Object> getOverview(Integer gameId, String startDate, String endDate) {
        String cacheKey = String.format("dashboard:overview:g%s:%s:%s",
            gameId != null ? gameId : "all", startDate != null ? startDate : "", endDate != null ? endDate : "");
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return (Map<String, Object>) cached;

        Map<String, Object> result = new HashMap<>();
        try {
            result.put("stats", getDashboardStats(gameId, startDate, endDate));
        } catch (Exception e) {
            log.warn("Failed to get stats: {}", e.getMessage());
            result.put("stats", null);
        }
        try {
            result.put("timeline", getRevenueTimeline(30, gameId, startDate, endDate));
        } catch (Exception e) {
            log.warn("Failed to get timeline: {}", e.getMessage());
            result.put("timeline", null);
        }
        try {
            result.put("enhanced", getEnhancedDashboardStats(gameId, startDate, endDate));
        } catch (Exception e) {
            log.warn("Failed to get enhanced: {}", e.getMessage());
            result.put("enhanced", null);
        }
        try {
            result.put("profitData", getProfitAnalysis(gameId, startDate, endDate));
        } catch (Exception e) {
            log.warn("Failed to get profitData: {}", e.getMessage());
            result.put("profitData", null);
        }
        result.put("latestReport", null);
        result.put("alertSummary", null);

        redisTemplate.opsForValue().set(cacheKey, result, TTL_SHORT);
        return result;
    }

    // ==================== Stats ====================

    public Map<String, Object> getDashboardStats(Integer gameId, String startDate, String endDate) {
        String cacheKey = String.format("dashboard:stats:g%s:%s:%s",
            gameId != null ? gameId : "all", startDate != null ? startDate : "", endDate != null ? endDate : "");
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return (Map<String, Object>) cached;

        // Segment distribution
        StringBuilder segSql = new StringBuilder(
            "SELECT segment_level, COUNT(*) as cnt, " +
            "AVG(pay_score) as avg_pay_score, AVG(ad_score) as avg_ad_score, " +
            "AVG(skill_score) as avg_skill_score, AVG(churn_risk) as avg_churn_risk, " +
            "AVG(confidence) as avg_confidence " +
            "FROM user_segments WHERE deleted = 0");
        if (gameId != null) segSql.append(" AND game_id = ").append(gameId);
        segSql.append(" GROUP BY segment_level");
        List<Map<String, Object>> segmentDistRaw = jdbc.queryForList(segSql.toString());
        // Convert snake_case keys to camelCase for frontend compatibility
        List<Map<String, Object>> segmentDist = segmentDistRaw.stream().map(row -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("segmentLevel", row.get("segment_level"));
            m.put("count", row.get("cnt"));
            m.put("avgPayScore", row.get("avg_pay_score"));
            m.put("avgAdScore", row.get("avg_ad_score"));
            m.put("avgSkillScore", row.get("avg_skill_score"));
            m.put("avgChurnRisk", row.get("avg_churn_risk"));
            m.put("avgConfidence", row.get("avg_confidence"));
            return m;
        }).collect(java.util.stream.Collectors.toList());

        // Total users
        StringBuilder userSql = new StringBuilder("SELECT COUNT(*) as cnt FROM game_users WHERE deleted = 0");
        if (gameId != null) userSql.append(" AND game_id = ").append(gameId);
        if (startDate != null) userSql.append(" AND install_time >= '").append(startDate).append("'");
        if (endDate != null) userSql.append(" AND install_time <= '").append(endDate).append(" 23:59:59'");
        Long totalUsers = jdbc.queryForObject(userSql.toString(), Long.class);

        // Total revenue
        StringBuilder revSql = new StringBuilder("SELECT COALESCE(SUM(total_pay_amount), 0) as total FROM game_users WHERE deleted = 0");
        if (gameId != null) revSql.append(" AND game_id = ").append(gameId);
        if (startDate != null) revSql.append(" AND install_time >= '").append(startDate).append("'");
        if (endDate != null) revSql.append(" AND install_time <= '").append(endDate).append(" 23:59:59'");
        Object totalRevenue = jdbc.queryForObject(revSql.toString(), Object.class);

        // Active experiments
        StringBuilder expSql = new StringBuilder("SELECT COUNT(*) as cnt FROM ab_experiments WHERE status = 'RUNNING'");
        if (gameId != null) expSql.append(" AND scope_id = ").append(gameId);
        Long activeExperiments = jdbc.queryForObject(expSql.toString(), Long.class);

        // Active monetize rules
        StringBuilder ruleSql = new StringBuilder("SELECT COUNT(*) as cnt FROM monetize_trigger_rules WHERE is_active = 1");
        if (gameId != null) ruleSql.append(" AND game_id = ").append(gameId);
        Long activeRules = jdbc.queryForObject(ruleSql.toString(), Long.class);

        Map<String, Object> result = new HashMap<>();
        result.put("segmentDistribution", segmentDist);
        result.put("totalUsers", totalUsers != null ? totalUsers : 0);
        result.put("totalRevenue", totalRevenue != null ? totalRevenue.toString() : "0");
        result.put("activeExperiments", activeExperiments != null ? activeExperiments : 0);
        result.put("activeMonetizeRules", activeRules != null ? activeRules : 0);

        redisTemplate.opsForValue().set(cacheKey, result, TTL_SHORT);
        return result;
    }

    // ==================== Revenue Timeline ====================

    public List<Map<String, Object>> getRevenueTimeline(int days, Integer gameId, String startDate, String endDate) {
        String cacheKey = String.format("dashboard:timeline:d%d:g%s:%s:%s",
            days, gameId != null ? gameId : "all", startDate != null ? startDate : "", endDate != null ? endDate : "");
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return (List<Map<String, Object>>) cached;

        StringBuilder sql = new StringBuilder(
            "SELECT stat_date, SUM(pay_amount) as total_revenue, SUM(pay_count) as total_pay_count, " +
            "SUM(ad_watch_count) as total_ad_watch, SUM(session_count) as total_sessions, COUNT(*) as unique_users " +
            "FROM user_behavior_stats WHERE 1=1");
        if (gameId != null) sql.append(" AND game_id = ").append(gameId);
        if (startDate != null) sql.append(" AND stat_date >= '").append(startDate).append("'");
        if (endDate != null) sql.append(" AND stat_date <= '").append(endDate).append("'");
        sql.append(" GROUP BY stat_date ORDER BY stat_date DESC LIMIT ").append(days);

        List<Map<String, Object>> rawResult = jdbc.queryForList(sql.toString());
        // Convert snake_case keys to camelCase for frontend compatibility
        List<Map<String, Object>> result = rawResult.stream().map(row -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("statDate", row.get("stat_date"));
            m.put("totalRevenue", row.get("total_revenue"));
            m.put("totalPayCount", row.get("total_pay_count"));
            m.put("totalAdWatch", row.get("total_ad_watch"));
            m.put("totalSessions", row.get("total_sessions"));
            m.put("uniqueUsers", row.get("unique_users"));
            return m;
        }).collect(java.util.stream.Collectors.toList());
        redisTemplate.opsForValue().set(cacheKey, result, TTL_MEDIUM);
        return result;
    }

    // ==================== Approval Dashboard ====================

    public Object getApprovalDashboardStats(Integer gameId) {
        String cacheKey = "dashboard:approval:g" + (gameId != null ? gameId : "all");
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return cached;

        // Pending approval stats from auto_response_approvals
        StringBuilder sql = new StringBuilder(
            "SELECT status, COUNT(*) as cnt FROM auto_response_approvals WHERE 1=1");
        if (gameId != null) sql.append(" AND game_id = ").append(gameId);
        sql.append(" GROUP BY status");

        List<Map<String, Object>> statusDist;
        try {
            statusDist = jdbc.queryForList(sql.toString());
        } catch (Exception e) {
            log.warn("auto_response_approvals query failed: {}", e.getMessage());
            statusDist = List.of();
        }

        long pending = statusDist.stream()
            .filter(r -> "PENDING".equals(r.get("status")))
            .mapToLong(r -> ((Number) r.get("cnt")).longValue()).sum();
        long approved = statusDist.stream()
            .filter(r -> "APPROVED".equals(r.get("status")))
            .mapToLong(r -> ((Number) r.get("cnt")).longValue()).sum();
        long rejected = statusDist.stream()
            .filter(r -> "REJECTED".equals(r.get("status")))
            .mapToLong(r -> ((Number) r.get("cnt")).longValue()).sum();

        Map<String, Object> result = new HashMap<>();
        result.put("pending", pending);
        result.put("approved", approved);
        result.put("rejected", rejected);
        result.put("total", pending + approved + rejected);
        result.put("statusDistribution", statusDist);

        redisTemplate.opsForValue().set(cacheKey, result, TTL_SHORT);
        return result;
    }

    // ==================== Enhanced Dashboard ====================

    private Map<String, Object> getEnhancedDashboardStats(Integer gameId, String startDate, String endDate) {
        Map<String, Object> base = getDashboardStats(gameId, startDate, endDate);

        // Loop health (latest) - no game_id filter
        Object loopHealth = null;
        try {
            List<Map<String, Object>> lhRows = jdbc.queryForList(
                "SELECT * FROM loop_health_metrics ORDER BY metric_date DESC LIMIT 1");
            loopHealth = lhRows.isEmpty() ? null : lhRows.get(0);
        } catch (Exception e) {
            log.warn("loop_health_metrics query failed: {}", e.getMessage());
        }

        // Label distribution
        List<Map<String, Object>> labelDist = List.of();
        try {
            StringBuilder ldSql = new StringBuilder(
                "SELECT engagement_phase, COUNT(*) as cnt, " +
                "AVG(pay_probability) as avg_pay_prob, " +
                "AVG(churn_risk_score) as avg_churn_risk, " +
                "AVG(activity_score) as avg_activity " +
                "FROM user_predictive_labels WHERE 1=1");
            if (gameId != null) ldSql.append(" AND game_id = ").append(gameId);
            ldSql.append(" GROUP BY engagement_phase");
            labelDist = jdbc.queryForList(ldSql.toString());
        } catch (Exception e) {
            log.warn("user_predictive_labels query failed: {}", e.getMessage());
        }

        // Decision funnel
        Map<String, Object> decisionFunnel = new HashMap<>();
        try {
            StringBuilder dfSql = new StringBuilder(
                "SELECT decision_result, user_action, COUNT(*) as cnt FROM trigger_decision_traces WHERE 1=1");
            if (gameId != null) dfSql.append(" AND game_id = ").append(gameId);
            if (startDate != null) dfSql.append(" AND created_at >= '").append(startDate).append("'");
            if (endDate != null) dfSql.append(" AND created_at <= '").append(endDate).append(" 23:59:59'");
            dfSql.append(" GROUP BY decision_result, user_action");

            List<Map<String, Object>> dfRows = jdbc.queryForList(dfSql.toString());
            long triggered = 0, suppressed = 0, purchased = 0, watchedAd = 0, dismissed = 0;
            for (Map<String, Object> r : dfRows) {
                long cnt = ((Number) r.get("cnt")).longValue();
                if ("TRIGGERED".equals(r.get("decision_result"))) {
                    triggered += cnt;
                    String action = (String) r.get("user_action");
                    if ("PURCHASED".equals(action)) purchased += cnt;
                    else if ("WATCHED_AD".equals(action)) watchedAd += cnt;
                    else if ("DISMISSED".equals(action)) dismissed += cnt;
                } else {
                    suppressed += cnt;
                }
            }
            decisionFunnel.put("triggered", triggered);
            decisionFunnel.put("suppressed", suppressed);
            decisionFunnel.put("purchased", purchased);
            decisionFunnel.put("watchedAd", watchedAd);
            decisionFunnel.put("dismissed", dismissed);
        } catch (Exception e) {
            log.warn("trigger_decision_traces query failed: {}", e.getMessage());
        }

        // Health trend (last 7 days) - no game_id filter
        List<Map<String, Object>> healthTrend = List.of();
        try {
            healthTrend = jdbc.queryForList(
                "SELECT * FROM loop_health_metrics ORDER BY metric_date DESC LIMIT 7");
        } catch (Exception e) {
            log.warn("loop_health_metrics trend query failed: {}", e.getMessage());
        }

        Map<String, Object> result = new HashMap<>(base);
        result.put("loopHealth", loopHealth);
        result.put("labelDistribution", labelDist);
        result.put("decisionFunnel", decisionFunnel);
        result.put("healthTrend", healthTrend);
        return result;
    }

    // ==================== Profit Analysis (for overview) ====================

    private Map<String, Object> getProfitAnalysis(Integer gameId, String startDate, String endDate) {
        // iap revenue
        StringBuilder iapSql = new StringBuilder(
            "SELECT COALESCE(SUM(CAST(amount_usd AS DECIMAL(12,2))), 0) as total FROM user_payment_records WHERE status = 'COMPLETED'");
        if (startDate != null) iapSql.append(" AND created_at >= '").append(startDate).append("'");
        if (endDate != null) iapSql.append(" AND created_at <= '").append(endDate).append(" 23:59:59'");
        double iapRevenue = 0;
        try {
            Object v = jdbc.queryForObject(iapSql.toString(), Object.class);
            if (v != null) iapRevenue = Double.parseDouble(v.toString());
        } catch (Exception ignored) { log.warn("Caught exception: {}", ignored.getMessage()); }

        // ad revenue
        StringBuilder adSql = new StringBuilder(
            "SELECT COALESCE(SUM(revenue), 0) as total FROM ad_revenue_daily WHERE 1=1");
        if (gameId != null) adSql.append(" AND game_id = ").append(gameId);
        if (startDate != null) adSql.append(" AND revenue_date >= '").append(startDate).append("'");
        if (endDate != null) adSql.append(" AND revenue_date <= '").append(endDate).append("'");
        double adRevenue = 0;
        try {
            Object v = jdbc.queryForObject(adSql.toString(), Object.class);
            if (v != null) adRevenue = Double.parseDouble(v.toString());
        } catch (Exception ignored) { log.warn("Caught exception: {}", ignored.getMessage()); }

        // acq cost
        StringBuilder acqSql = new StringBuilder(
            "SELECT COALESCE(SUM(spend), 0) as total FROM acquisition_costs WHERE 1=1");
        if (gameId != null) acqSql.append(" AND game_id = ").append(gameId);
        if (startDate != null) acqSql.append(" AND cost_date >= '").append(startDate).append("'");
        if (endDate != null) acqSql.append(" AND cost_date <= '").append(endDate).append("'");
        double acquisitionCost = 0;
        try {
            Object v = jdbc.queryForObject(acqSql.toString(), Object.class);
            if (v != null) acquisitionCost = Double.parseDouble(v.toString());
        } catch (Exception ignored) { log.warn("Caught exception: {}", ignored.getMessage()); }

        // other cost
        StringBuilder otherSql = new StringBuilder(
            "SELECT COALESCE(SUM(amount), 0) as total FROM cost_entries WHERE deleted = 0");
        if (gameId != null) otherSql.append(" AND game_id = ").append(gameId);
        if (startDate != null) otherSql.append(" AND cost_date >= '").append(startDate).append("'");
        if (endDate != null) otherSql.append(" AND cost_date <= '").append(endDate).append("'");
        double otherCost = 0;
        try {
            Object v = jdbc.queryForObject(otherSql.toString(), Object.class);
            if (v != null) otherCost = Double.parseDouble(v.toString());
        } catch (Exception ignored) { log.warn("Caught exception: {}", ignored.getMessage()); }

        double totalRevenue = iapRevenue + adRevenue;
        double totalCost = acquisitionCost + otherCost;
        double profit = totalRevenue - totalCost;
        double margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        Map<String, Object> result = new HashMap<>();
        result.put("iapRevenue", iapRevenue);
        result.put("adRevenue", adRevenue);
        result.put("totalRevenue", totalRevenue);
        result.put("acquisitionCost", acquisitionCost);
        result.put("otherCost", otherCost);
        result.put("totalCost", totalCost);
        result.put("profit", profit);
        result.put("margin", Math.round(margin * 100.0) / 100.0);
        return result;
    }
}
