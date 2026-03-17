package com.gamehot.aiservice.controller;

import com.gamehot.aiservice.dto.CreateExportRequest;
import com.gamehot.aiservice.entity.ExportTask;
import com.gamehot.aiservice.repository.ExportTaskRepository;
import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@Tag(name = "导出中心", description = "数据导出相关接口")
@RestController
@RequestMapping("/api/ai/export")
@RequiredArgsConstructor
public class ExportController {

    private final ExportTaskRepository exportTaskRepository;

    @Operation(summary = "获取导出任务列表")
    @GetMapping("/tasks")
    public ApiResponse<List<ExportTask>> listTasks(Authentication auth) {
        return ApiResponse.ok(exportTaskRepository.findByUserIdOrderByCreatedAtDesc(auth.getName()));
    }

    @Operation(summary = "获取导出任务详情")
    @GetMapping("/tasks/{id}")
    public ApiResponse<ExportTask> getTask(@PathVariable Long id) {
        return exportTaskRepository.findById(id)
            .map(ApiResponse::ok)
            .orElse(ApiResponse.fail(404, "导出任务不存在"));
    }

    @Operation(summary = "获取可用数据源列表")
    @GetMapping("/data-sources")
    public ApiResponse<List<Map<String, Object>>> listDataSources() {
        List<Map<String, Object>> sources = new ArrayList<>();
        String[][] defs = {
            {"game_users", "游戏用户"},
            {"user_segments", "用户分层"},
            {"payment_records", "充值记录"},
            {"optimization_suggestions", "优化建议"},
            {"decision_logs", "决策日志"},
            {"audit_logs", "审计日志"}
        };
        for (String[] def : defs) {
            Map<String, Object> src = new LinkedHashMap<>();
            src.put("key", def[0]);
            src.put("label", def[1]);
            sources.add(src);
        }
        return ApiResponse.ok(sources);
    }

    @Operation(summary = "创建导出任务")
    @PostMapping("/tasks")
    public ApiResponse<Map<String, Object>> createExport(
            @RequestBody CreateExportRequest req, Authentication auth) {
        ExportTask task = new ExportTask();
        task.setUserId(auth.getName());
        task.setDataSource(req.getDataSource());
        task.setDataSourceLabel(req.getDataSourceLabel());
        task.setFormat(req.getFormat());
        task.setStatus("pending");
        ExportTask saved = exportTaskRepository.save(task);

        // TODO: 接入真实导出逻辑，推入 MQ 异步处理
        // 当前模拟立即完成
        saved.setStatus("completed");
        saved.setTotalRows(0L);
        saved.setStartedAt(LocalDateTime.now());
        saved.setCompletedAt(LocalDateTime.now());
        saved.setExpiresAt(LocalDateTime.now().plusDays(7));
        exportTaskRepository.save(saved);

        return ApiResponse.ok(Map.of(
            "taskId", saved.getId(),
            "status", "completed",
            "totalRows", 0,
            "fileUrl", null,
            "message", "导出任务已创建（mock: 数据为空）"
        ));
    }

    @Operation(summary = "查询导出进度")
    @GetMapping("/tasks/{id}/progress")
    public ApiResponse<Map<String, Object>> getProgress(@PathVariable Long id) {
        return exportTaskRepository.findById(id).map(task -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("taskId", task.getId());
            result.put("status", task.getStatus());
            result.put("totalRows", task.getTotalRows());
            result.put("fileUrl", task.getFileUrl());
            result.put("completedAt", task.getCompletedAt());
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail(404, "任务不存在"));
    }
}
