package com.gamehot.opsservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gamehot.opsservice.config.RabbitConfig;
import com.gamehot.opsservice.dto.CreateWebhookConfigRequest;
import com.gamehot.opsservice.dto.UpdateWebhookConfigRequest;
import com.gamehot.opsservice.model.FeishuNotificationLog;
import com.gamehot.opsservice.model.FeishuWebhookConfig;
import com.gamehot.opsservice.repository.FeishuNotificationLogRepository;
import com.gamehot.opsservice.repository.FeishuWebhookConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeishuService {

    private final FeishuWebhookConfigRepository webhookConfigRepository;
    private final FeishuNotificationLogRepository notificationLogRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Value("${feishu.app-id:}")
    private String feishuAppId;

    @Value("${feishu.app-secret:}")
    private String feishuAppSecret;

    @Value("${feishu.webhook-url:}")
    private String defaultWebhookUrl;

    // ── Event Types ──
    public static final Map<String, String> EVENT_TYPE_LABELS = new LinkedHashMap<>();
    static {
        EVENT_TYPE_LABELS.put("anomaly_alert", "异常告警");
        EVENT_TYPE_LABELS.put("daily_report", "运营日报");
        EVENT_TYPE_LABELS.put("approval_timeout", "审批超时");
        EVENT_TYPE_LABELS.put("task_completed", "任务完成");
        EVENT_TYPE_LABELS.put("push_result", "推送结果");
        EVENT_TYPE_LABELS.put("recall_result", "召回结果");
        EVENT_TYPE_LABELS.put("system_alert", "系统告警");
    }

    public List<Map<String, String>> getEventTypes() {
        List<Map<String, String>> result = new ArrayList<>();
        EVENT_TYPE_LABELS.forEach((k, v) -> result.add(Map.of("value", k, "label", v)));
        return result;
    }

    // ── Webhook Configs ──

    public List<FeishuWebhookConfig> listConfigs() {
        return webhookConfigRepository.findByOrderByCreatedAtDesc();
    }

    public Optional<FeishuWebhookConfig> getConfig(Long id) {
        return webhookConfigRepository.findById(id);
    }

    @Transactional
    public FeishuWebhookConfig createConfig(CreateWebhookConfigRequest req, Integer createdBy) {
        FeishuWebhookConfig config = new FeishuWebhookConfig();
        config.setName(req.getName());
        config.setWebhookUrl(req.getWebhookUrl());
        config.setSecret(req.getSecret());
        config.setDescription(req.getDescription());
        config.setCreatedBy(createdBy);
        try {
            config.setEventTypes(objectMapper.writeValueAsString(req.getEventTypes()));
        } catch (Exception e) {
            config.setEventTypes("[]");
        }
        return webhookConfigRepository.save(config);
    }

    @Transactional
    public void updateConfig(Long id, UpdateWebhookConfigRequest req) {
        FeishuWebhookConfig config = webhookConfigRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Webhook config not found: " + id));
        if (req.getName() != null) config.setName(req.getName());
        if (req.getWebhookUrl() != null) config.setWebhookUrl(req.getWebhookUrl());
        if (req.getSecret() != null) config.setSecret(req.getSecret());
        if (req.getEnabled() != null) config.setEnabled(req.getEnabled());
        if (req.getDescription() != null) config.setDescription(req.getDescription());
        if (req.getEventTypes() != null) {
            try {
                config.setEventTypes(objectMapper.writeValueAsString(req.getEventTypes()));
            } catch (Exception ignored) {}
        }
        webhookConfigRepository.save(config);
    }

    @Transactional
    public void deleteConfig(Long id) {
        webhookConfigRepository.deleteById(id);
    }

    public Map<String, Object> testWebhook(String webhookUrl, String secret) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            Map<String, Object> testMsg = Map.of(
                    "msg_type", "text",
                    "content", Map.of("text", "🔔 GAMEHOT CDP 飞书通知测试 - 连通性验证成功 ✅")
            );
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(testMsg, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(webhookUrl, entity, String.class);
            boolean success = response.getStatusCode().is2xxSuccessful();
            saveNotificationLog(null, "test", "Webhook Test", objectMapper.writeValueAsString(testMsg),
                    response.getStatusCode().value(), response.getBody(), success ? "success" : "failed", null);
            return Map.of("success", success, "httpStatus", response.getStatusCode().value(), "response", response.getBody());
        } catch (Exception e) {
            log.error("[FeishuService] Test webhook failed: {}", e.getMessage());
            return Map.of("success", false, "error", e.getMessage());
        }
    }

    public Map<String, Object> sendAlertNotification(String eventType, String title, String severity,
                                                       List<Map<String, String>> fields, String description) {
        List<FeishuWebhookConfig> activeConfigs = webhookConfigRepository.findByEnabledOrderByCreatedAtDesc(1);
        int sent = 0;
        for (FeishuWebhookConfig config : activeConfigs) {
            try {
                // Check if config handles this event type
                if (config.getEventTypes() != null && !config.getEventTypes().contains(eventType)
                        && !config.getEventTypes().contains("all")) continue;
                doSend(config, eventType, title, severity, fields, description);
                sent++;
            } catch (Exception e) {
                log.warn("[FeishuService] Failed to send to config {}: {}", config.getId(), e.getMessage());
            }
        }
        // Also queue async via RabbitMQ for reliability
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE_OPS, RabbitConfig.QUEUE_FEISHU_NOTIFY,
                Map.of("eventType", eventType, "title", title, "severity", severity));
        return Map.of("success", sent > 0 || !activeConfigs.isEmpty(), "sent", sent);
    }

    private void doSend(FeishuWebhookConfig config, String eventType, String title, String severity,
                         List<Map<String, String>> fields, String description) {
        try {
            String emoji = "critical".equals(severity) ? "🔴" : "warning".equals(severity) ? "🟡" : "🔵";
            StringBuilder text = new StringBuilder();
            text.append(emoji).append(" ").append(title).append("\n");
            if (description != null) text.append(description).append("\n");
            if (fields != null) {
                for (Map<String, String> f : fields) {
                    text.append("• ").append(f.get("label")).append(": ").append(f.get("value")).append("\n");
                }
            }
            Map<String, Object> msg = Map.of("msg_type", "text", "content", Map.of("text", text.toString()));
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(msg, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(config.getWebhookUrl(), entity, String.class);
            saveNotificationLog(config.getId(), eventType, title, objectMapper.writeValueAsString(msg),
                    response.getStatusCode().value(), response.getBody(),
                    response.getStatusCode().is2xxSuccessful() ? "success" : "failed", null);
        } catch (Exception e) {
            try {
                saveNotificationLog(config.getId(), eventType, title, null, null, null, "failed", e.getMessage());
            } catch (Exception ignored) {}
            throw new RuntimeException(e);
        }
    }

    @Transactional
    public void saveNotificationLog(Long configId, String eventType, String title, String body,
                                     Integer httpStatus, String responseBody, String status, String errorMsg) {
        FeishuNotificationLog logEntry = new FeishuNotificationLog();
        logEntry.setWebhookConfigId(configId);
        logEntry.setEventType(eventType);
        logEntry.setTitle(title);
        logEntry.setMessageBody(body);
        logEntry.setHttpStatus(httpStatus);
        logEntry.setResponseBody(responseBody);
        logEntry.setStatus(status);
        logEntry.setErrorMessage(errorMsg);
        notificationLogRepository.save(logEntry);
    }

    public List<FeishuNotificationLog> listLogs(Long webhookConfigId, String eventType, Integer limit) {
        int pageSize = limit != null ? Math.min(limit, 500) : 50;
        PageRequest page = PageRequest.of(0, pageSize);
        if (webhookConfigId != null) {
            return notificationLogRepository.findByWebhookConfigIdOrderByCreatedAtDesc(webhookConfigId, page);
        } else if (eventType != null) {
            return notificationLogRepository.findByEventTypeOrderByCreatedAtDesc(eventType, page);
        }
        return notificationLogRepository.findByOrderByCreatedAtDesc(page);
    }

    public Map<String, Object> getStats() {
        LocalDateTime since24h = LocalDateTime.now().minusHours(24);
        long total = notificationLogRepository.countSince(since24h);
        long success = notificationLogRepository.countSuccessSince(since24h);
        return Map.of("last24h", Map.of("total", total, "success", success, "failed", total - success));
    }

    public Map<String, Object> sendTestText(String eventType, String title, String text) {
        return sendAlertNotification(eventType, title, "info",
                List.of(Map.of("label", "内容", "value", text)), "手动测试文本消息");
    }
}
