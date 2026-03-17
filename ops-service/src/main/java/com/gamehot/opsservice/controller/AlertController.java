package com.gamehot.opsservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.opsservice.dto.CreateAlertRequest;
import com.gamehot.opsservice.dto.CreateAlertRuleRequest;
import com.gamehot.opsservice.model.AlertRule;
import com.gamehot.opsservice.model.AnomalyAlert;
import com.gamehot.opsservice.service.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ops/alerts")
@RequiredArgsConstructor
@Tag(name = "Alerts", description = "异常告警管理")
public class AlertController {

    private final AlertService alertService;

    // ── Dashboard ──

    @GetMapping("/dashboard-summary")
    @Operation(summary = "仪表盘告警摘要")
    public ApiResponse<Map<String, Object>> dashboardSummary(@RequestParam(required = false) Integer gameId) {
        return ApiResponse.ok(alertService.getDashboardSummary(gameId));
    }

    // ── Anomaly Alerts ──

    @GetMapping
    @Operation(summary = "告警列表")
    public ApiResponse<List<AnomalyAlert>> listAlerts(
            @RequestParam(required = false) Integer gameId,
            @RequestParam(required = false) String alertType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer limit) {
        return ApiResponse.ok(alertService.listAlerts(gameId, alertType, status, limit));
    }

    @GetMapping("/stats")
    @Operation(summary = "告警统计")
    public ApiResponse<Map<String, Object>> getStats(@RequestParam(required = false) Integer gameId) {
        return ApiResponse.ok(alertService.getStats(gameId));
    }

    @PostMapping
    @Operation(summary = "创建告警")
    public ApiResponse<AnomalyAlert> createAlert(@RequestBody CreateAlertRequest req) {
        return ApiResponse.ok(alertService.createAlert(req));
    }

    @PostMapping("/{id}/acknowledge")
    @Operation(summary = "确认告警")
    public ApiResponse<AnomalyAlert> acknowledgeAlert(@PathVariable Long id) {
        return ApiResponse.ok(alertService.acknowledgeAlert(id));
    }

    @PostMapping("/{id}/resolve")
    @Operation(summary = "解决告警")
    public ApiResponse<AnomalyAlert> resolveAlert(@PathVariable Long id,
                                                    @RequestParam(defaultValue = "system") String resolvedBy) {
        return ApiResponse.ok(alertService.resolveAlert(id, resolvedBy));
    }

    // ── Alert Rules ──

    @GetMapping("/rules")
    @Operation(summary = "告警规则列表")
    public ApiResponse<List<AlertRule>> listRules(
            @RequestParam(required = false) String ruleType,
            @RequestParam(required = false) Integer isActive) {
        return ApiResponse.ok(alertService.listRules(ruleType, isActive));
    }

    @GetMapping("/rules/{id}")
    @Operation(summary = "告警规则详情")
    public ApiResponse<AlertRule> getRule(@PathVariable Long id) {
        return alertService.getRule(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail(404, "Alert rule not found"));
    }

    @PostMapping("/rules")
    @Operation(summary = "创建告警规则")
    public ApiResponse<AlertRule> createRule(@RequestBody CreateAlertRuleRequest req) {
        return ApiResponse.ok(alertService.createRule(req));
    }

    @PutMapping("/rules/{id}")
    @Operation(summary = "更新告警规则")
    public ApiResponse<AlertRule> updateRule(@PathVariable Long id,
                                              @RequestBody Map<String, Object> updates) {
        return ApiResponse.ok(alertService.updateRule(id, updates));
    }

    @DeleteMapping("/rules/{id}")
    @Operation(summary = "删除告警规则")
    public ApiResponse<Map<String, Object>> deleteRule(@PathVariable Long id) {
        alertService.deleteRule(id);
        return ApiResponse.ok(Map.of("success", true));
    }

    // ── Scan ──

    @PostMapping("/scan")
    @Operation(summary = "执行告警扫描")
    public ApiResponse<Map<String, Object>> runScan(
            @RequestParam(required = false, defaultValue = "manual") String triggeredBy) {
        return ApiResponse.ok(alertService.runScan(triggeredBy));
    }
}
