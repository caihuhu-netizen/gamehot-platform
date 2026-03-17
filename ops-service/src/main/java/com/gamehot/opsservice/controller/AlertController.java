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
    @Operation(summary = "仪表盘告警摘要（activeCount/criticalCount/typeBreakdown/recentAlerts）")
    public ApiResponse<Map<String, Object>> dashboardSummary(@RequestParam(required = false) Integer gameId) {
        return ApiResponse.ok(alertService.getDashboardSummary(gameId));
    }

    /** 旧路径别名（getDashboardAlertSummary 调用 /api/ops/alerts/summary） */
    @GetMapping("/summary")
    @Operation(summary = "仪表盘告警摘要（别名，同 dashboard-summary）")
    public ApiResponse<Map<String, Object>> dashboardSummaryAlias(@RequestParam(required = false) Integer gameId) {
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
    @Operation(summary = "确认告警（路径参数）")
    public ApiResponse<AnomalyAlert> acknowledgeAlertById(@PathVariable Long id) {
        return ApiResponse.ok(alertService.acknowledgeAlert(id));
    }

    /** 前端 alerts.acknowledge 调用 PUT /api/ops/alerts/acknowledge?id=xxx */
    @PutMapping("/acknowledge")
    @Operation(summary = "确认告警（query param id）")
    public ApiResponse<AnomalyAlert> acknowledgeAlert(@RequestParam Long id) {
        return ApiResponse.ok(alertService.acknowledgeAlert(id));
    }

    @PostMapping("/{id}/resolve")
    @Operation(summary = "解决告警（路径参数）")
    public ApiResponse<AnomalyAlert> resolveAlertById(@PathVariable Long id,
                                                       @RequestParam(defaultValue = "system") String resolvedBy) {
        return ApiResponse.ok(alertService.resolveAlert(id, resolvedBy));
    }

    /** 前端 alerts.resolve 调用 POST /api/ops/alerts/resolve */
    @PostMapping("/resolve")
    @Operation(summary = "解决告警（request body）")
    public ApiResponse<AnomalyAlert> resolveAlert(@RequestBody Map<String, Object> body) {
        Long id = body.containsKey("id") ? Long.valueOf(body.get("id").toString()) : null;
        if (id == null) return ApiResponse.fail("id is required");
        String resolvedBy = body.containsKey("resolvedBy") ? (String) body.get("resolvedBy") : "system";
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
    @Operation(summary = "更新告警规则（路径参数）")
    public ApiResponse<AlertRule> updateRuleById(@PathVariable Long id,
                                                  @RequestBody Map<String, Object> updates) {
        return ApiResponse.ok(alertService.updateRule(id, updates));
    }

    /** 前端 alerts.updateRule 调用 PUT /api/ops/alerts/update-rule */
    @PutMapping("/update-rule")
    @Operation(summary = "更新告警规则（body id）")
    public ApiResponse<AlertRule> updateRule(@RequestBody Map<String, Object> updates) {
        Object idObj = updates.get("id");
        if (idObj == null) return ApiResponse.fail("id is required");
        Long id = Long.valueOf(idObj.toString());
        return ApiResponse.ok(alertService.updateRule(id, updates));
    }

    @DeleteMapping("/rules/{id}")
    @Operation(summary = "删除告警规则（路径参数）")
    public ApiResponse<Map<String, Object>> deleteRuleById(@PathVariable Long id) {
        alertService.deleteRule(id);
        return ApiResponse.ok(Map.of("success", true));
    }

    /** 前端 alerts.deleteRule 调用 DELETE /api/ops/alerts/delete-rule?id=xxx */
    @DeleteMapping("/delete-rule")
    @Operation(summary = "删除告警规则（query param id）")
    public ApiResponse<Map<String, Object>> deleteRule(@RequestParam Long id) {
        alertService.deleteRule(id);
        return ApiResponse.ok(Map.of("success", true));
    }

    // ── Scan / Detection ──

    @PostMapping("/scan")
    @Operation(summary = "执行告警扫描")
    public ApiResponse<Map<String, Object>> runScan(
            @RequestParam(required = false, defaultValue = "manual") String triggeredBy) {
        return ApiResponse.ok(alertService.runScan(triggeredBy));
    }

    /** 前端 alerts.runDetection 调用 POST /api/ops/alerts/run-detection */
    @PostMapping("/run-detection")
    @Operation(summary = "执行告警检测（别名，同 scan）")
    public ApiResponse<Map<String, Object>> runDetection(@RequestBody(required = false) Map<String, Object> body) {
        String triggeredBy = body != null && body.containsKey("triggeredBy")
                ? (String) body.get("triggeredBy") : "manual";
        return ApiResponse.ok(alertService.runScan(triggeredBy));
    }

    // ── Reports ──

    /** 前端 alerts.generateReport 调用 POST /api/ops/alerts/generate-report */
    @PostMapping("/generate-report")
    @Operation(summary = "生成告警报告（stub）")
    public ApiResponse<Map<String, Object>> generateReport(@RequestBody(required = false) Map<String, Object> body) {
        return ApiResponse.ok(Map.of("success", true, "message", "报告生成功能开发中", "reportId", 0));
    }

    /** 前端 alerts.listReports 调用 GET /api/ops/alerts/list-reports */
    @GetMapping("/list-reports")
    @Operation(summary = "告警报告列表（stub）")
    public ApiResponse<List<Object>> listReports(@RequestParam(required = false) Integer gameId) {
        return ApiResponse.ok(List.of());
    }
}
