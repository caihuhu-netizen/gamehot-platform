package com.gamehot.opsservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.opsservice.dto.CreateScheduledTaskRequest;
import com.gamehot.opsservice.model.ScheduledTask;
import com.gamehot.opsservice.model.TaskExecutionLog;
import com.gamehot.opsservice.service.SchedulerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ops/scheduler")
@RequiredArgsConstructor
@Tag(name = "Scheduler", description = "定时任务管理")
public class SchedulerController {

    private final SchedulerService schedulerService;

    @GetMapping("/task-types")
    @Operation(summary = "获取内置任务类型列表")
    public ApiResponse<List<Map<String, Object>>> getTaskTypes() {
        return ApiResponse.ok(schedulerService.getTaskTypes());
    }

    @GetMapping("/tasks")
    @Operation(summary = "定时任务列表")
    public ApiResponse<List<ScheduledTask>> listTasks(@RequestParam(required = false) Integer gameId) {
        return ApiResponse.ok(schedulerService.listTasks(gameId));
    }

    @GetMapping("/tasks/{id}")
    @Operation(summary = "任务详情")
    public ApiResponse<ScheduledTask> getTask(@PathVariable Long id) {
        return schedulerService.getTask(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail(404, "Task not found"));
    }

    @PostMapping("/tasks")
    @Operation(summary = "创建定时任务")
    public ApiResponse<ScheduledTask> createTask(@RequestBody CreateScheduledTaskRequest req, Authentication auth) {
        String createdBy = auth != null ? auth.getName() : "system";
        return ApiResponse.ok(schedulerService.createTask(req, createdBy));
    }

    @PutMapping("/tasks/{id}")
    @Operation(summary = "更新定时任务")
    public ApiResponse<Map<String, Object>> updateTask(@PathVariable Long id,
                                                        @RequestBody Map<String, Object> updates) {
        schedulerService.updateTask(id, updates);
        return ApiResponse.ok(Map.of("ok", true));
    }

    @DeleteMapping("/tasks/{id}")
    @Operation(summary = "删除定时任务")
    public ApiResponse<Map<String, Object>> deleteTask(@PathVariable Long id) {
        schedulerService.deleteTask(id);
        return ApiResponse.ok(Map.of("ok", true));
    }

    @PostMapping("/tasks/{id}/toggle")
    @Operation(summary = "启用/禁用任务")
    public ApiResponse<Map<String, Object>> toggleTask(@PathVariable Long id,
                                                        @RequestParam Integer enabled) {
        schedulerService.toggleTask(id, enabled);
        return ApiResponse.ok(Map.of("ok", true));
    }

    @PostMapping("/tasks/{id}/trigger")
    @Operation(summary = "手动触发任务执行")
    public ApiResponse<Map<String, Object>> triggerTask(@PathVariable Long id, Authentication auth) {
        String triggeredBy = auth != null ? auth.getName() : "system";
        return ApiResponse.ok(schedulerService.triggerTask(id, triggeredBy));
    }

    @GetMapping("/logs")
    @Operation(summary = "任务执行历史")
    public ApiResponse<List<TaskExecutionLog>> listLogs(
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return ApiResponse.ok(schedulerService.listLogs(taskId, status, limit, offset));
    }

    @GetMapping("/stats")
    @Operation(summary = "执行统计")
    public ApiResponse<Map<String, Object>> getStats(
            @RequestParam(required = false) Long taskId,
            @RequestParam(defaultValue = "7") int days) {
        return ApiResponse.ok(schedulerService.getStats(taskId, days));
    }

    @DeleteMapping("/logs/cleanup")
    @Operation(summary = "清理过期日志")
    public ApiResponse<Map<String, Object>> cleanupLogs(@RequestParam(defaultValue = "30") int beforeDays) {
        long before = System.currentTimeMillis() - (long) beforeDays * 86400000L;
        int deleted = schedulerService.cleanupLogs(before);
        return ApiResponse.ok(Map.of("deleted", deleted));
    }

    @PostMapping("/seed-builtin")
    @Operation(summary = "初始化内置任务")
    public ApiResponse<Map<String, Object>> seedBuiltIn(
            @RequestParam(required = false) Integer gameId, Authentication auth) {
        String createdBy = auth != null ? auth.getName() : "system";
        return ApiResponse.ok(schedulerService.seedBuiltInTasks(gameId, createdBy));
    }
}
