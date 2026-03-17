package com.gamehot.opsservice.service;

import com.gamehot.opsservice.config.RabbitConfig;
import com.gamehot.opsservice.dto.CreateAlertRequest;
import com.gamehot.opsservice.dto.CreateAlertRuleRequest;
import com.gamehot.opsservice.model.AlertRule;
import com.gamehot.opsservice.model.AnomalyAlert;
import com.gamehot.opsservice.repository.AlertRuleRepository;
import com.gamehot.opsservice.repository.AnomalyAlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AnomalyAlertRepository anomalyAlertRepository;
    private final AlertRuleRepository alertRuleRepository;
    private final RabbitTemplate rabbitTemplate;

    // ── Anomaly Alerts ──

    public List<AnomalyAlert> listAlerts(Integer gameId, String alertType, String status, Integer limit) {
        int pageSize = limit != null ? limit : 50;
        PageRequest page = PageRequest.of(0, pageSize);
        if (gameId != null) {
            return anomalyAlertRepository.findByGameIdOrderByCreatedAtDesc(gameId, page);
        } else if (status != null) {
            return anomalyAlertRepository.findByStatusOrderByCreatedAtDesc(status, page);
        } else if (alertType != null) {
            return anomalyAlertRepository.findByAlertTypeOrderByCreatedAtDesc(alertType, page);
        }
        return anomalyAlertRepository.findByOrderByCreatedAtDesc(page);
    }

    @Transactional
    public AnomalyAlert createAlert(CreateAlertRequest req) {
        AnomalyAlert alert = new AnomalyAlert();
        alert.setGameId(req.getGameId());
        alert.setAlertType(req.getAlertType());
        alert.setSeverity(req.getSeverity() != null ? req.getSeverity() : "warning");
        alert.setMetricName(req.getMetricName());
        alert.setCurrentValue(req.getCurrentValue());
        alert.setExpectedValue(req.getExpectedValue());
        alert.setDeviationPercent(req.getDeviationPercent());
        alert.setThreshold(req.getThreshold());
        alert.setDescription(req.getDescription());
        if (req.getAlertDate() != null) alert.setAlertDate(LocalDate.parse(req.getAlertDate()));
        AnomalyAlert saved = anomalyAlertRepository.save(alert);
        // Async notification
        if ("critical".equals(saved.getSeverity()) || "warning".equals(saved.getSeverity())) {
            rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE_OPS, RabbitConfig.QUEUE_ALERT_NOTIFY,
                    Map.of("alertId", saved.getId(), "severity", saved.getSeverity(), "alertType", saved.getAlertType()));
        }
        return saved;
    }

    @Transactional
    public AnomalyAlert acknowledgeAlert(Long id) {
        AnomalyAlert alert = anomalyAlertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert not found: " + id));
        alert.setStatus("acknowledged");
        alert.setAcknowledgedAt(LocalDateTime.now());
        return anomalyAlertRepository.save(alert);
    }

    @Transactional
    public AnomalyAlert resolveAlert(Long id, String resolvedBy) {
        AnomalyAlert alert = anomalyAlertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert not found: " + id));
        alert.setStatus("resolved");
        alert.setResolvedAt(LocalDateTime.now());
        alert.setResolvedBy(resolvedBy);
        return anomalyAlertRepository.save(alert);
    }

    public Map<String, Object> getStats(Integer gameId) {
        long total = anomalyAlertRepository.countTotal();
        long open = anomalyAlertRepository.countOpen();
        long critical = anomalyAlertRepository.countBySeverity("critical");
        long warning = anomalyAlertRepository.countBySeverity("warning");
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", total);
        stats.put("open", open);
        stats.put("critical", critical);
        stats.put("warning", warning);
        return stats;
    }

    public Map<String, Object> getDashboardSummary(Integer gameId) {
        List<AnomalyAlert> recentAlerts = listAlerts(gameId, null, "open", 10);
        long open = anomalyAlertRepository.countOpen();
        long critical = anomalyAlertRepository.countBySeverity("critical");
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("openAlerts", open);
        summary.put("criticalAlerts", critical);
        summary.put("recentAlerts", recentAlerts);
        return summary;
    }

    // ── Alert Rules ──

    public List<AlertRule> listRules(String ruleType, Integer isActive) {
        if (ruleType != null && isActive != null) {
            return alertRuleRepository.findByRuleTypeAndIsActiveOrderByCreatedAtDesc(ruleType, isActive);
        } else if (ruleType != null) {
            return alertRuleRepository.findByRuleTypeOrderByCreatedAtDesc(ruleType);
        } else if (isActive != null) {
            return alertRuleRepository.findByIsActiveOrderByCreatedAtDesc(isActive);
        }
        return alertRuleRepository.findByOrderByCreatedAtDesc();
    }

    public Optional<AlertRule> getRule(Long id) {
        return alertRuleRepository.findById(id);
    }

    @Transactional
    public AlertRule createRule(CreateAlertRuleRequest req) {
        AlertRule rule = new AlertRule();
        rule.setRuleName(req.getRuleName());
        rule.setRuleType(req.getRuleType());
        rule.setMetric(req.getMetric());
        rule.setOperator(req.getOperator());
        rule.setThreshold(req.getThreshold());
        rule.setComparisonWindow(req.getComparisonWindow());
        rule.setSeverity(req.getSeverity() != null ? req.getSeverity() : "warning");
        rule.setGameId(req.getGameId());
        rule.setNotifyOwner(req.getNotifyOwner() != null ? req.getNotifyOwner() : 0);
        return alertRuleRepository.save(rule);
    }

    @Transactional
    public AlertRule updateRule(Long id, Map<String, Object> updates) {
        AlertRule rule = alertRuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert rule not found: " + id));
        if (updates.containsKey("ruleName")) rule.setRuleName((String) updates.get("ruleName"));
        if (updates.containsKey("severity")) rule.setSeverity((String) updates.get("severity"));
        if (updates.containsKey("isActive")) rule.setIsActive((Integer) updates.get("isActive"));
        if (updates.containsKey("notifyOwner")) rule.setNotifyOwner((Integer) updates.get("notifyOwner"));
        if (updates.containsKey("comparisonWindow")) rule.setComparisonWindow((Integer) updates.get("comparisonWindow"));
        return alertRuleRepository.save(rule);
    }

    @Transactional
    public void deleteRule(Long id) {
        alertRuleRepository.deleteById(id);
    }

    public Map<String, Object> runScan(String triggeredBy) {
        List<AlertRule> activeRules = alertRuleRepository.findByIsActiveOrderByCreatedAtDesc(1);
        int rulesChecked = activeRules.size();
        int alertsTriggered = 0;
        List<Map<String, Object>> results = new ArrayList<>();
        // Simplified scan — real implementation would query metric data
        for (AlertRule rule : activeRules) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("ruleId", rule.getId());
            result.put("ruleName", rule.getRuleName());
            result.put("triggered", false);
            result.put("currentValue", 0.0);
            result.put("baselineValue", 0.0);
            result.put("threshold", rule.getThreshold());
            results.add(result);
        }
        Map<String, Object> scanResult = new LinkedHashMap<>();
        scanResult.put("rulesChecked", rulesChecked);
        scanResult.put("alertsTriggered", alertsTriggered);
        scanResult.put("triggeredBy", triggeredBy);
        scanResult.put("scannedAt", LocalDateTime.now().toString());
        scanResult.put("results", results);
        log.info("[AlertService] Scan completed: {} rules checked, {} alerts triggered", rulesChecked, alertsTriggered);
        return scanResult;
    }
}
