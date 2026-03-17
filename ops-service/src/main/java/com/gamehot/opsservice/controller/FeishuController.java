package com.gamehot.opsservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.opsservice.dto.CreateWebhookConfigRequest;
import com.gamehot.opsservice.dto.UpdateWebhookConfigRequest;
import com.gamehot.opsservice.model.FeishuNotificationLog;
import com.gamehot.opsservice.model.FeishuWebhookConfig;
import com.gamehot.opsservice.service.FeishuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ops/feishu")
@RequiredArgsConstructor
@Tag(name = "FeishuNotification", description = "飞书通知管理")
public class FeishuController {

    private final FeishuService feishuService;

    @GetMapping("/event-types")
    @Operation(summary = "获取事件类型列表")
    public ApiResponse<List<Map<String, String>>> getEventTypes() {
        return ApiResponse.ok(feishuService.getEventTypes());
    }

    @GetMapping("/configs")
    @Operation(summary = "Webhook配置列表")
    public ApiResponse<List<FeishuWebhookConfig>> listConfigs() {
        return ApiResponse.ok(feishuService.listConfigs());
    }

    @GetMapping("/configs/{id}")
    @Operation(summary = "获取单个Webhook配置")
    public ApiResponse<FeishuWebhookConfig> getConfig(@PathVariable Long id) {
        return feishuService.getConfig(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail(404, "Webhook config not found"));
    }

    @PostMapping("/configs")
    @Operation(summary = "创建Webhook配置")
    public ApiResponse<FeishuWebhookConfig> createConfig(@RequestBody CreateWebhookConfigRequest req) {
        return ApiResponse.ok(feishuService.createConfig(req, null));
    }

    @PutMapping("/configs/{id}")
    @Operation(summary = "更新Webhook配置")
    public ApiResponse<Map<String, Object>> updateConfig(@PathVariable Long id,
                                                          @RequestBody UpdateWebhookConfigRequest req) {
        feishuService.updateConfig(id, req);
        return ApiResponse.ok(Map.of("ok", true));
    }

    @DeleteMapping("/configs/{id}")
    @Operation(summary = "删除Webhook配置")
    public ApiResponse<Map<String, Object>> deleteConfig(@PathVariable Long id) {
        feishuService.deleteConfig(id);
        return ApiResponse.ok(Map.of("ok", true));
    }

    @PostMapping("/test-webhook")
    @Operation(summary = "测试Webhook连通性")
    public ApiResponse<Map<String, Object>> testWebhook(@RequestBody Map<String, String> body) {
        String webhookUrl = body.get("webhookUrl");
        String secret = body.get("secret");
        return ApiResponse.ok(feishuService.testWebhook(webhookUrl, secret));
    }

    @GetMapping("/logs")
    @Operation(summary = "通知日志列表")
    public ApiResponse<List<FeishuNotificationLog>> listLogs(
            @RequestParam(required = false) Long webhookConfigId,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) Integer limit) {
        return ApiResponse.ok(feishuService.listLogs(webhookConfigId, eventType, limit));
    }

    @GetMapping("/stats")
    @Operation(summary = "通知统计（24小时）")
    public ApiResponse<Map<String, Object>> getStats() {
        return ApiResponse.ok(feishuService.getStats());
    }

    @PostMapping("/send-alert")
    @Operation(summary = "手动发送测试告警")
    public ApiResponse<Map<String, Object>> sendTestAlert(@RequestBody Map<String, Object> body) {
        String eventType = (String) body.get("eventType");
        String title = (String) body.get("title");
        String severity = (String) body.getOrDefault("severity", "info");
        String message = (String) body.get("message");
        return ApiResponse.ok(feishuService.sendAlertNotification(eventType, title, severity,
                List.of(Map.of("label", "消息内容", "value", message != null ? message : "")), "手动测试告警"));
    }

    @PostMapping("/send-text")
    @Operation(summary = "手动发送文本消息")
    public ApiResponse<Map<String, Object>> sendTestText(@RequestBody Map<String, Object> body) {
        String eventType = (String) body.get("eventType");
        String title = (String) body.get("title");
        String text = (String) body.get("text");
        return ApiResponse.ok(feishuService.sendTestText(eventType, title, text));
    }
}
