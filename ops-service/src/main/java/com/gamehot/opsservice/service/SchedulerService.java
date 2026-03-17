package com.gamehot.opsservice.service;

import com.gamehot.opsservice.dto.CreateScheduledTaskRequest;
import com.gamehot.opsservice.model.ScheduledTask;
import com.gamehot.opsservice.model.TaskExecutionLog;
import com.gamehot.opsservice.repository.ScheduledTaskRepository;
import com.gamehot.opsservice.repository.TaskExecutionLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SchedulerService {

    private final ScheduledTaskRepository scheduledTaskRepository;
    private final TaskExecutionLogRepository executionLogRepository;

    // ── Built-in Task Types ──
    public static final Map<String, Map<String, Object>> BUILT_IN_TASK_TYPES = new LinkedHashMap<>();
    static {
        BUILT_IN_TASK_TYPES.put("ai_inspection", Map.of("label", "AI综合巡检", "labelEn", "AI Inspection",
                "defaultCron", "0 9 * * *", "defaultTimeout", 600, "description", "汇总各模块指标，AI生成综合健康报告"));
        BUILT_IN_TASK_TYPES.put("data_sync", Map.of("label", "数据同步", "labelEn", "Data Sync",
                "defaultCron", "0 */6 * * *", "defaultTimeout", 300, "description", "同步外部数据源（AppsFlyer/TE/AppLovin）"));
        BUILT_IN_TASK_TYPES.put("anomaly_detection", Map.of("label", "异常检测", "labelEn", "Anomaly Detection",
                "defaultCron", "*/30 * * * *", "defaultTimeout", 120, "description", "检测KPI异常波动并触发告警"));
        BUILT_IN_TASK_TYPES.put("retention_report", Map.of("label", "留存周报", "labelEn", "Retention Report",
                "defaultCron", "0 10 * * 1", "defaultTimeout", 300, "description", "生成每周留存分析报告"));
        BUILT_IN_TASK_TYPES.put("capacity_check", Map.of("label", "容量检查", "labelEn", "Capacity Check",
                "defaultCron", "0 */1 * * *", "defaultTimeout", 60, "description", "检查数据库容量和存储使用情况"));
        BUILT_IN_TASK_TYPES.put("archive_cleanup", Map.of("label", "归档清理", "labelEn", "Archive Cleanup",
                "defaultCron", "0 3 * * *", "defaultTimeout", 600, "description", "归档过期数据并清理临时文件"));
        BUILT_IN_TASK_TYPES.put("export_schedule", Map.of("label", "定时导出", "labelEn", "Scheduled Export",
                "defaultCron", "0 8 * * *", "defaultTimeout", 300, "description", "执行预设的定时数据导出任务"));
        BUILT_IN_TASK_TYPES.put("ltv_prediction", Map.of("label", "LTV预测", "labelEn", "LTV Prediction",
                "defaultCron", "0 2 * * *", "defaultTimeout", 900, "description", "运行LTV预测模型更新预测值"));
        BUILT_IN_TASK_TYPES.put("log_cleanup", Map.of("label", "日志清理", "labelEn", "Log Cleanup",
                "defaultCron", "0 4 * * 0", "defaultTimeout", 120, "description", "清理过期的执行日志和审计日志"));
        BUILT_IN_TASK_TYPES.put("approval_timeout", Map.of("label", "审批超时处理", "labelEn", "Approval Timeout",
                "defaultCron", "0 */1 * * *", "defaultTimeout", 120, "description", "自动处理超时未审批的记录"));
    }

    public List<Map<String, Object>> getTaskTypes() {
        List<Map<String, Object>> result = new ArrayList<>();
        BUILT_IN_TASK_TYPES.forEach((type, info) -> {
            Map<String, Object> entry = new LinkedHashMap<>(info);
            entry.put("type", type);
            result.add(entry);
        });
        return result;
    }

    public List<ScheduledTask> listTasks(Integer gameId) {
        if (gameId != null) return scheduledTaskRepository.findByGameIdOrderByCreatedAtDesc(gameId);
        return scheduledTaskRepository.findByOrderByCreatedAtDesc();
    }

    public Optional<ScheduledTask> getTask(Long id) {
        return scheduledTaskRepository.findById(id);
    }

    @Transactional
    public ScheduledTask createTask(CreateScheduledTaskRequest req, String createdBy) {
        ScheduledTask task = new ScheduledTask();
        task.setGameId(req.getGameId());
        task.setName(req.getName());
        task.setDescription(req.getDescription());
        task.setTaskType(req.getTaskType());
        task.setHandler(req.getHandler());
        task.setCronExpression(req.getCronExpression());
        task.setTimezone(req.getTimezone() != null ? req.getTimezone() : "Asia/Shanghai");
        task.setEnabled(req.getEnabled() != null ? req.getEnabled() : 1);
        task.setTimeoutSeconds(req.getTimeoutSeconds() != null ? req.getTimeoutSeconds() : 300);
        task.setMaxRetries(req.getMaxRetries() != null ? req.getMaxRetries() : 3);
        task.setConfig(req.getConfig());
        task.setCreatedBy(createdBy);
        return scheduledTaskRepository.save(task);
    }

    @Transactional
    public void updateTask(Long id, Map<String, Object> updates) {
        ScheduledTask task = scheduledTaskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found: " + id));
        if (updates.containsKey("name")) task.setName((String) updates.get("name"));
        if (updates.containsKey("description")) task.setDescription((String) updates.get("description"));
        if (updates.containsKey("cronExpression")) task.setCronExpression((String) updates.get("cronExpression"));
        if (updates.containsKey("timezone")) task.setTimezone((String) updates.get("timezone"));
        if (updates.containsKey("enabled")) task.setEnabled((Integer) updates.get("enabled"));
        if (updates.containsKey("timeoutSeconds")) task.setTimeoutSeconds((Integer) updates.get("timeoutSeconds"));
        if (updates.containsKey("maxRetries")) task.setMaxRetries((Integer) updates.get("maxRetries"));
        if (updates.containsKey("config")) task.setConfig((String) updates.get("config"));
        scheduledTaskRepository.save(task);
    }

    @Transactional
    public void deleteTask(Long id) {
        scheduledTaskRepository.deleteById(id);
    }

    @Transactional
    public void toggleTask(Long id, Integer enabled) {
        ScheduledTask task = scheduledTaskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found: " + id));
        task.setEnabled(enabled);
        scheduledTaskRepository.save(task);
    }

    @Transactional
    public Map<String, Object> triggerTask(Long id, String triggeredBy) {
        ScheduledTask task = scheduledTaskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found: " + id));
        TaskExecutionLog execLog = new TaskExecutionLog();
        execLog.setTaskId(task.getId());
        execLog.setGameId(task.getGameId());
        execLog.setTriggerType("manual");
        execLog.setTriggeredBy(triggeredBy);
        execLog.setStatus("running");
        execLog.setStartedAt(LocalDateTime.now());
        TaskExecutionLog savedLog = executionLogRepository.save(execLog);
        // Execute asynchronously
        executeTaskAsync(task, savedLog.getId());
        return Map.of("logId", savedLog.getId(), "message", "Task triggered", "taskId", id);
    }

    @Async
    public void executeTaskAsync(ScheduledTask task, Long logId) {
        long startMs = System.currentTimeMillis();
        try {
            // Simulate task execution
            Thread.sleep(Math.min((long)(Math.random() * 2000) + 200, 2000));
            long durationMs = System.currentTimeMillis() - startMs;
            updateExecutionLog(logId, "success",
                    "Task [" + task.getName() + "] completed successfully in " + durationMs + "ms", null, durationMs);
            updateTaskRunStatus(task.getId(), "success", durationMs);
            log.info("[SchedulerService] Task {} executed successfully in {}ms", task.getName(), durationMs);
        } catch (Exception e) {
            long durationMs = System.currentTimeMillis() - startMs;
            updateExecutionLog(logId, "failed", null, e.getMessage(), durationMs);
            updateTaskRunStatus(task.getId(), "failed", durationMs);
            log.error("[SchedulerService] Task {} failed: {}", task.getName(), e.getMessage());
        }
    }

    @Transactional
    public void updateExecutionLog(Long logId, String status, String summary, String errorMsg, long durationMs) {
        executionLogRepository.findById(logId).ifPresent(log -> {
            log.setStatus(status);
            log.setResultSummary(summary);
            log.setErrorMessage(errorMsg);
            log.setDurationMs(durationMs);
            log.setFinishedAt(LocalDateTime.now());
            executionLogRepository.save(log);
        });
    }

    @Transactional
    public void updateTaskRunStatus(Long taskId, String status, long durationMs) {
        scheduledTaskRepository.findById(taskId).ifPresent(task -> {
            task.setLastRunAt(LocalDateTime.now());
            task.setLastRunStatus(status);
            task.setLastRunDurationMs(durationMs);
            scheduledTaskRepository.save(task);
        });
    }

    public List<TaskExecutionLog> listLogs(Long taskId, String status, int limit, int offset) {
        PageRequest page = PageRequest.of(offset / Math.max(limit, 1), limit);
        if (taskId != null && status != null) {
            return executionLogRepository.findByTaskIdOrderByCreatedAtDesc(taskId, page);
        } else if (taskId != null) {
            return executionLogRepository.findByTaskIdOrderByCreatedAtDesc(taskId, page);
        } else if (status != null) {
            return executionLogRepository.findByStatusOrderByCreatedAtDesc(status, page);
        }
        return executionLogRepository.findByOrderByCreatedAtDesc(page);
    }

    public Map<String, Object> getStats(Long taskId, int days) {
        Map<String, Object> stats = new LinkedHashMap<>();
        if (taskId != null) {
            long success = executionLogRepository.countSuccessByTaskId(taskId);
            long failed = executionLogRepository.countFailedByTaskId(taskId);
            Double avgDuration = executionLogRepository.avgDurationByTaskId(taskId);
            stats.put("taskId", taskId);
            stats.put("successCount", success);
            stats.put("failedCount", failed);
            stats.put("avgDurationMs", avgDuration != null ? avgDuration : 0.0);
        }
        stats.put("days", days);
        return stats;
    }

    @Transactional
    public Map<String, Object> seedBuiltInTasks(Integer gameId, String createdBy) {
        Set<String> existingTypes = new HashSet<>();
        List<ScheduledTask> existing = listTasks(gameId);
        existing.forEach(t -> existingTypes.add(t.getTaskType()));
        int created = 0;
        for (Map.Entry<String, Map<String, Object>> entry : BUILT_IN_TASK_TYPES.entrySet()) {
            String type = entry.getKey();
            if (existingTypes.contains(type)) continue;
            Map<String, Object> info = entry.getValue();
            ScheduledTask task = new ScheduledTask();
            task.setGameId(gameId != null ? gameId : 0);
            task.setName((String) info.get("label"));
            task.setDescription((String) info.get("description"));
            task.setTaskType(type);
            task.setHandler("builtin:" + type);
            task.setCronExpression((String) info.get("defaultCron"));
            task.setTimeoutSeconds((Integer) info.get("defaultTimeout"));
            task.setCreatedBy(createdBy);
            scheduledTaskRepository.save(task);
            created++;
        }
        return Map.of("created", created, "total", BUILT_IN_TASK_TYPES.size());
    }

    @Transactional
    public int cleanupLogs(long beforeTimestampMs) {
        // Simple cleanup: delete logs older than the given time
        LocalDateTime before = LocalDateTime.ofEpochSecond(beforeTimestampMs / 1000, 0,
                java.time.ZoneOffset.UTC);
        List<TaskExecutionLog> old = executionLogRepository.findAll().stream()
                .filter(l -> l.getCreatedAt() != null && l.getCreatedAt().isBefore(before))
                .toList();
        executionLogRepository.deleteAll(old);
        return old.size();
    }
}
