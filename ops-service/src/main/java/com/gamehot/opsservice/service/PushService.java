package com.gamehot.opsservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gamehot.opsservice.config.RabbitConfig;
import com.gamehot.opsservice.dto.CreatePushTaskRequest;
import com.gamehot.opsservice.dto.UpdatePushTaskRequest;
import com.gamehot.opsservice.model.PushTask;
import com.gamehot.opsservice.model.PushTemplate;
import com.gamehot.opsservice.repository.PushTaskRepository;
import com.gamehot.opsservice.repository.PushTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PushService {

    private final PushTaskRepository pushTaskRepository;
    private final PushTemplateRepository pushTemplateRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    // ── Push Tasks ──

    public List<PushTask> listTasks(Integer gameId, String status) {
        if (gameId != null && status != null) {
            return pushTaskRepository.findByGameIdAndStatusAndDeletedOrderByCreatedAtDesc(gameId, status, 0);
        } else if (gameId != null) {
            return pushTaskRepository.findByGameIdAndDeletedOrderByCreatedAtDesc(gameId, 0);
        } else if (status != null) {
            return pushTaskRepository.findByStatusAndDeletedOrderByCreatedAtDesc(status, 0);
        }
        return pushTaskRepository.findByDeletedOrderByCreatedAtDesc(0);
    }

    public Optional<PushTask> getTask(Long id) {
        return pushTaskRepository.findByIdAndDeleted(id, 0);
    }

    @Transactional
    public PushTask createTask(CreatePushTaskRequest req, String createdBy) {
        PushTask task = new PushTask();
        task.setName(req.getName());
        task.setType(req.getType() != null ? req.getType() : "system");
        task.setTitle(req.getTitle());
        task.setContent(req.getContent());
        task.setTargetType(req.getTargetType() != null ? req.getTargetType() : "all");
        task.setTargetConfig(req.getTargetConfig());
        task.setGameId(req.getGameId());
        task.setCreatedBy(createdBy);
        if (req.getScheduledAt() != null && !req.getScheduledAt().isEmpty()) {
            LocalDateTime scheduled = LocalDateTime.parse(req.getScheduledAt().replace("Z", "").replace("T", "T"));
            task.setScheduledAt(scheduled);
            task.setStatus("scheduled");
            // Queue for scheduled delivery
            rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE_OPS, RabbitConfig.QUEUE_PUSH_SCHEDULED,
                    Map.of("taskId", task.getId(), "scheduledAt", req.getScheduledAt()));
        } else {
            task.setStatus("draft");
        }
        return pushTaskRepository.save(task);
    }

    @Transactional
    public void updateTask(Long id, UpdatePushTaskRequest req) {
        PushTask task = pushTaskRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Push task not found: " + id));
        if (req.getName() != null) task.setName(req.getName());
        if (req.getType() != null) task.setType(req.getType());
        if (req.getTitle() != null) task.setTitle(req.getTitle());
        if (req.getContent() != null) task.setContent(req.getContent());
        if (req.getTargetType() != null) task.setTargetType(req.getTargetType());
        if (req.getTargetConfig() != null) task.setTargetConfig(req.getTargetConfig());
        if (req.getStatus() != null) task.setStatus(req.getStatus());
        if (req.getScheduledAt() != null && !req.getScheduledAt().isEmpty()) {
            task.setScheduledAt(LocalDateTime.parse(req.getScheduledAt().replace("Z", "")));
        }
        pushTaskRepository.save(task);
    }

    @Transactional
    public void deleteTask(Long id) {
        PushTask task = pushTaskRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Push task not found: " + id));
        task.setDeleted(1);
        pushTaskRepository.save(task);
    }

    @Transactional
    public Map<String, Object> sendTask(Long id) {
        PushTask task = pushTaskRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Push task not found: " + id));
        if (!"draft".equals(task.getStatus()) && !"scheduled".equals(task.getStatus())) {
            return Map.of("success", false, "reason", "Task already sent or in invalid status");
        }
        task.setStatus("sending");
        pushTaskRepository.save(task);
        // Async send via RabbitMQ
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE_OPS, RabbitConfig.QUEUE_PUSH_SEND,
                Map.of("taskId", id, "taskType", task.getType(), "targetType", task.getTargetType()));
        log.info("[PushService] Task {} queued for sending", id);
        return Map.of("success", true, "taskId", id, "message", "Push task queued for delivery");
    }

    public Map<String, Object> getStats(Integer gameId) {
        long total, sent, scheduled, draft;
        if (gameId != null) {
            total = pushTaskRepository.findByGameIdAndDeletedOrderByCreatedAtDesc(gameId, 0).size();
            sent = pushTaskRepository.findByGameIdAndStatusAndDeletedOrderByCreatedAtDesc(gameId, "sent", 0).size();
            scheduled = pushTaskRepository.findByGameIdAndStatusAndDeletedOrderByCreatedAtDesc(gameId, "scheduled", 0).size();
            draft = pushTaskRepository.findByGameIdAndStatusAndDeletedOrderByCreatedAtDesc(gameId, "draft", 0).size();
        } else {
            total = pushTaskRepository.countTotal();
            sent = pushTaskRepository.countByStatus("sent");
            scheduled = pushTaskRepository.countByStatus("scheduled");
            draft = pushTaskRepository.countByStatus("draft");
        }
        Double avgDelivery = pushTaskRepository.avgDeliveryRate();
        Double avgOpen = pushTaskRepository.avgOpenRate();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", total);
        stats.put("sent", sent);
        stats.put("scheduled", scheduled);
        stats.put("draft", draft);
        stats.put("avgDeliveryRate", avgDelivery != null ? avgDelivery : 0.0);
        stats.put("avgOpenRate", avgOpen != null ? avgOpen : 0.0);
        return stats;
    }

    // ── Push Templates ──

    public List<PushTemplate> listTemplates(Integer gameId, String category, String search) {
        List<PushTemplate> templates;
        if (gameId != null) {
            templates = pushTemplateRepository.findByGameIdAndDeletedOrderByCreatedAtDesc(gameId, 0);
        } else if (category != null) {
            templates = pushTemplateRepository.findByCategoryAndDeletedOrderByCreatedAtDesc(category, 0);
        } else {
            templates = pushTemplateRepository.findByDeletedOrderByCreatedAtDesc(0);
        }
        if (search != null && !search.isEmpty()) {
            String q = search.toLowerCase();
            templates = templates.stream()
                    .filter(t -> t.getName().toLowerCase().contains(q) || t.getTitle().toLowerCase().contains(q))
                    .toList();
        }
        return templates;
    }

    public Optional<PushTemplate> getTemplate(Long id) {
        return pushTemplateRepository.findByIdAndDeleted(id, 0);
    }

    @Transactional
    public PushTemplate createTemplate(com.gamehot.opsservice.dto.CreatePushTemplateRequest req, String createdBy) {
        PushTemplate template = new PushTemplate();
        template.setName(req.getName());
        template.setCategory(req.getCategory() != null ? req.getCategory() : "custom");
        template.setChannel(req.getChannel() != null ? req.getChannel() : "push");
        template.setTitle(req.getTitle());
        template.setContent(req.getContent());
        template.setVariables(req.getVariables());
        template.setDescription(req.getDescription());
        template.setGameId(req.getGameId());
        template.setCreatedBy(createdBy);
        return pushTemplateRepository.save(template);
    }

    @Transactional
    public void updateTemplate(Long id, com.gamehot.opsservice.dto.CreatePushTemplateRequest req) {
        PushTemplate template = pushTemplateRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Template not found: " + id));
        if (req.getName() != null) template.setName(req.getName());
        if (req.getCategory() != null) template.setCategory(req.getCategory());
        if (req.getChannel() != null) template.setChannel(req.getChannel());
        if (req.getTitle() != null) template.setTitle(req.getTitle());
        if (req.getContent() != null) template.setContent(req.getContent());
        if (req.getVariables() != null) template.setVariables(req.getVariables());
        if (req.getDescription() != null) template.setDescription(req.getDescription());
        pushTemplateRepository.save(template);
    }

    @Transactional
    public void deleteTemplate(Long id) {
        PushTemplate template = pushTemplateRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Template not found: " + id));
        template.setDeleted(1);
        pushTemplateRepository.save(template);
    }

    @Transactional
    public Map<String, Object> useTemplate(Long id) {
        PushTemplate template = pushTemplateRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Template not found: " + id));
        template.setUseCount(template.getUseCount() + 1);
        pushTemplateRepository.save(template);
        return Map.of(
                "title", template.getTitle(),
                "content", template.getContent(),
                "channel", template.getChannel() != null ? template.getChannel() : "push",
                "variables", template.getVariables() != null ? template.getVariables() : ""
        );
    }

    public List<String> getTemplateCategories() {
        return pushTemplateRepository.findDistinctCategories();
    }
}
