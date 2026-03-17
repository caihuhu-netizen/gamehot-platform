package com.gamehot.opsservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.opsservice.dto.CreatePushTaskRequest;
import com.gamehot.opsservice.dto.CreatePushTemplateRequest;
import com.gamehot.opsservice.dto.UpdatePushTaskRequest;
import com.gamehot.opsservice.model.PushTask;
import com.gamehot.opsservice.model.PushTemplate;
import com.gamehot.opsservice.service.PushService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ops/push")
@RequiredArgsConstructor
@Tag(name = "PushCenter", description = "推送中心 - 推送任务与模板管理")
public class PushController {

    private final PushService pushService;

    // ── Push Tasks ──

    @GetMapping("/tasks")
    @Operation(summary = "推送任务列表")
    public ApiResponse<List<PushTask>> listTasks(
            @RequestParam(required = false) Integer gameId,
            @RequestParam(required = false) String status) {
        return ApiResponse.ok(pushService.listTasks(gameId, status));
    }

    @GetMapping("/tasks/{id}")
    @Operation(summary = "推送任务详情")
    public ApiResponse<PushTask> getTask(@PathVariable Long id) {
        return pushService.getTask(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail(404, "Push task not found"));
    }

    @PostMapping("/tasks")
    @Operation(summary = "创建推送任务")
    public ApiResponse<PushTask> createTask(@RequestBody CreatePushTaskRequest req, Authentication auth) {
        String createdBy = auth != null ? auth.getName() : "system";
        return ApiResponse.ok(pushService.createTask(req, createdBy));
    }

    @PutMapping("/tasks/{id}")
    @Operation(summary = "更新推送任务")
    public ApiResponse<Map<String, Object>> updateTask(@PathVariable Long id,
                                                        @RequestBody UpdatePushTaskRequest req) {
        pushService.updateTask(id, req);
        return ApiResponse.ok(Map.of("success", true));
    }

    @DeleteMapping("/tasks/{id}")
    @Operation(summary = "删除推送任务")
    public ApiResponse<Map<String, Object>> deleteTask(@PathVariable Long id) {
        pushService.deleteTask(id);
        return ApiResponse.ok(Map.of("success", true));
    }

    @PostMapping("/tasks/{id}/send")
    @Operation(summary = "立即发送推送任务")
    public ApiResponse<Map<String, Object>> sendTask(@PathVariable Long id) {
        return ApiResponse.ok(pushService.sendTask(id));
    }

    @GetMapping("/stats")
    @Operation(summary = "推送统计数据")
    public ApiResponse<Map<String, Object>> getStats(@RequestParam(required = false) Integer gameId) {
        return ApiResponse.ok(pushService.getStats(gameId));
    }

    // ── Push Templates ──

    @GetMapping("/templates")
    @Operation(summary = "推送模板列表")
    public ApiResponse<List<PushTemplate>> listTemplates(
            @RequestParam(required = false) Integer gameId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {
        return ApiResponse.ok(pushService.listTemplates(gameId, category, search));
    }

    @GetMapping("/templates/{id}")
    @Operation(summary = "推送模板详情")
    public ApiResponse<PushTemplate> getTemplate(@PathVariable Long id) {
        return pushService.getTemplate(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail(404, "Template not found"));
    }

    @PostMapping("/templates")
    @Operation(summary = "创建推送模板")
    public ApiResponse<PushTemplate> createTemplate(@RequestBody CreatePushTemplateRequest req, Authentication auth) {
        String createdBy = auth != null ? auth.getName() : "system";
        return ApiResponse.ok(pushService.createTemplate(req, createdBy));
    }

    @PutMapping("/templates/{id}")
    @Operation(summary = "更新推送模板")
    public ApiResponse<Map<String, Object>> updateTemplate(@PathVariable Long id,
                                                            @RequestBody CreatePushTemplateRequest req) {
        pushService.updateTemplate(id, req);
        return ApiResponse.ok(Map.of("success", true));
    }

    @DeleteMapping("/templates/{id}")
    @Operation(summary = "删除推送模板")
    public ApiResponse<Map<String, Object>> deleteTemplate(@PathVariable Long id) {
        pushService.deleteTemplate(id);
        return ApiResponse.ok(Map.of("success", true));
    }

    @PostMapping("/templates/{id}/use")
    @Operation(summary = "使用模板（获取内容并记录使用次数）")
    public ApiResponse<Map<String, Object>> useTemplate(@PathVariable Long id) {
        return ApiResponse.ok(pushService.useTemplate(id));
    }

    @GetMapping("/templates/categories")
    @Operation(summary = "获取模板分类列表")
    public ApiResponse<List<String>> getCategories() {
        return ApiResponse.ok(pushService.getTemplateCategories());
    }
}
