package com.gamehot.aiservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChurnPredictionService {

    private final JdbcTemplate jdbcTemplate;

    public Map<String, Object> getOverview(Integer gameId) {
        String gameFilter = gameId != null ? " AND upl.game_id = " + gameId : "";
        String sql = """
            SELECT
              COUNT(CASE WHEN churn_risk_score >= 0.8 THEN 1 END) AS highRiskCount,
              COUNT(CASE WHEN churn_risk_score >= 0.5 AND churn_risk_score < 0.8 THEN 1 END) AS mediumRiskCount,
              COUNT(*) AS totalTracked,
              ROUND(AVG(CASE WHEN churn_risk_score >= 0.8 THEN ltv_30d END), 2) AS estimatedLtvLoss,
              ROUND(
                100.0 * COUNT(CASE WHEN churn_risk_trend = 'IMPROVING' AND churn_risk_score >= 0.5 THEN 1 END)
                / NULLIF(COUNT(CASE WHEN churn_risk_score >= 0.5 THEN 1 END), 0), 1
              ) AS interventionRecoveryRate
            FROM user_predictive_labels upl
            WHERE 1=1
            """ + gameFilter;
        return jdbcTemplate.queryForMap(sql);
    }

    public List<Map<String, Object>> getHighRiskUsers(Integer gameId, double threshold, int limit) {
        String gameFilter = gameId != null ? " AND upl.game_id = " + gameId : "";
        String sql = """
            SELECT upl.user_id, upl.churn_risk_score, upl.churn_risk_trend,
                   upl.engagement_phase, upl.ltv_30d, upl.activity_score,
                   gu.country_code, gu.total_pay_amount, gu.last_active_time
            FROM user_predictive_labels upl
            LEFT JOIN game_users gu ON upl.user_id = gu.user_id
            WHERE upl.churn_risk_score >= ?
            """ + gameFilter + """
            ORDER BY upl.churn_risk_score DESC
            LIMIT ?
            """;
        return jdbcTemplate.queryForList(sql, threshold, limit);
    }

    public List<Map<String, Object>> getRiskTrend(Integer gameId, int days) {
        String gameFilter = gameId != null ? " AND game_id = " + gameId : "";
        // 用 last_computed_at 按天聚合
        String sql = """
            SELECT DATE(last_computed_at) AS date,
                   COUNT(CASE WHEN churn_risk_score >= 0.8 THEN 1 END) AS highRisk,
                   COUNT(CASE WHEN churn_risk_score >= 0.5 AND churn_risk_score < 0.8 THEN 1 END) AS mediumRisk
            FROM user_predictive_labels
            WHERE last_computed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            """ + gameFilter + """
            GROUP BY DATE(last_computed_at)
            ORDER BY date ASC
            """;
        return jdbcTemplate.queryForList(sql, days);
    }

    public List<Map<String, Object>> getRegionRisk(Integer gameId) {
        String gameFilter = gameId != null ? " AND upl.game_id = " + gameId : "";
        String sql = """
            SELECT gu.country_code,
                   COUNT(*) AS total,
                   COUNT(CASE WHEN upl.churn_risk_score >= 0.8 THEN 1 END) AS highRiskCount,
                   ROUND(AVG(upl.churn_risk_score), 3) AS avgRiskScore
            FROM user_predictive_labels upl
            LEFT JOIN game_users gu ON upl.user_id = gu.user_id
            WHERE gu.country_code IS NOT NULL
            """ + gameFilter + """
            GROUP BY gu.country_code
            ORDER BY avgRiskScore DESC
            LIMIT 20
            """;
        return jdbcTemplate.queryForList(sql);
    }

    public Map<String, Object> getInterventionStats(Integer gameId) {
        String gameFilter = gameId != null ? " AND game_id = " + gameId : "";
        String sql = """
            SELECT
              COUNT(CASE WHEN churn_risk_score >= 0.8 AND churn_risk_trend = 'IMPROVING' THEN 1 END) AS recovering,
              COUNT(CASE WHEN churn_risk_score >= 0.8 AND churn_risk_trend = 'WORSENING' THEN 1 END) AS deteriorating,
              COUNT(CASE WHEN churn_risk_score >= 0.8 AND churn_risk_trend = 'STABLE' THEN 1 END) AS stable,
              COUNT(CASE WHEN engagement_phase = 'CHURNED' THEN 1 END) AS churned
            FROM user_predictive_labels
            WHERE churn_risk_score >= 0.5
            """ + gameFilter;
        return jdbcTemplate.queryForMap(sql);
    }
}
