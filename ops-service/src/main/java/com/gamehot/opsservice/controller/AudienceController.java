package com.gamehot.opsservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.opsservice.dto.CreateAudienceGroupRequest;
import com.gamehot.opsservice.dto.CreateAudienceTemplateRequest;
import com.gamehot.opsservice.model.AudienceGroup;
import com.gamehot.opsservice.model.AudienceTemplate;
import com.gamehot.opsservice.service.AudienceService;
import com.gamehot.opsservice.service.AudienceTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ops/audience")
@RequiredArgsConstructor
@Tag(name = "Audience", description = "受众包管理")
public class AudienceController {

    private final AudienceService audienceService;
    private final AudienceTemplateService audienceTemplateService;

    // ── Audience Groups ──

    @GetMapping
    @Operation(summary = "受众包列表")
    public ApiResponse<List<AudienceGroup>> listGroups(@RequestParam(required = false) Integer gameId) {
        return ApiResponse.ok(audienceService.listGroups(gameId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "受众包详情")
    public ApiResponse<AudienceGroup> getGroup(@PathVariable Long id) {
        return audienceService.getGroup(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail(404, "Audience group not found"));
    }

    @PostMapping
    @Operation(summary = "创建受众包")
    public ApiResponse<AudienceGroup> createGroup(@RequestBody CreateAudienceGroupRequest req, Authentication auth) {
        String createdBy = auth != null ? auth.getName() : "system";
        return ApiResponse.ok(audienceService.createGroup(req, createdBy));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新受众包")
    public ApiResponse<Map<String, Object>> updateGroup(@PathVariable Long id,
                                                         @RequestBody Map<String, Object> updates) {
        audienceService.updateGroup(id, updates);
        return ApiResponse.ok(Map.of("success", true));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除受众包")
    public ApiResponse<Map<String, Object>> deleteGroup(@PathVariable Long id) {
        audienceService.deleteGroup(id);
        return ApiResponse.ok(Map.of("success", true));
    }

    @PostMapping("/{id}/calculate")
    @Operation(summary = "计算受众包大小（保存结果）")
    public ApiResponse<Map<String, Object>> calculateCount(@PathVariable Long id) {
        return ApiResponse.ok(audienceService.calculateCount(id));
    }

    @PostMapping("/preview")
    @Operation(summary = "预估受众大小（不保存）")
    public ApiResponse<Map<String, Object>> previewCount(@RequestBody CreateAudienceGroupRequest req) {
        return ApiResponse.ok(audienceService.previewCount(req.getConditions(), req.getMatchType()));
    }

    @GetMapping("/{id}/user-ids")
    @Operation(summary = "获取受众用户ID列表")
    public ApiResponse<Map<String, Object>> getUserIds(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1000") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return ApiResponse.ok(audienceService.getUserIds(id, limit, offset));
    }

    @GetMapping("/field-registry")
    @Operation(summary = "获取可用条件字段列表")
    public ApiResponse<List<Map<String, Object>>> getFieldRegistry() {
        return ApiResponse.ok(audienceService.getFieldRegistry());
    }

    @GetMapping("/operators")
    @Operation(summary = "获取可用运算符列表")
    public ApiResponse<List<Map<String, Object>>> getOperators() {
        return ApiResponse.ok(audienceService.getOperators());
    }

    // ── Audience Templates ──

    @GetMapping("/templates")
    @Operation(summary = "受众模板列表")
    public ApiResponse<List<AudienceTemplate>> listTemplates(@RequestParam(required = false) String category) {
        return ApiResponse.ok(audienceTemplateService.listTemplates(category));
    }

    @GetMapping("/templates/{id}")
    @Operation(summary = "受众模板详情")
    public ApiResponse<AudienceTemplate> getTemplate(@PathVariable Long id) {
        return audienceTemplateService.getTemplate(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail(404, "Audience template not found"));
    }

    @GetMapping("/templates/categories")
    @Operation(summary = "模板分类列表")
    public ApiResponse<List<String>> getTemplateCategories() {
        return ApiResponse.ok(audienceTemplateService.getCategories());
    }

    @PostMapping("/templates")
    @Operation(summary = "创建受众模板")
    public ApiResponse<AudienceTemplate> createTemplate(@RequestBody CreateAudienceTemplateRequest req,
                                                          Authentication auth) {
        String createdBy = auth != null ? auth.getName() : "system";
        return ApiResponse.ok(audienceTemplateService.createTemplate(req, createdBy));
    }

    @PutMapping("/templates/{id}")
    @Operation(summary = "更新受众模板")
    public ApiResponse<Map<String, Object>> updateTemplate(@PathVariable Long id,
                                                            @RequestBody Map<String, Object> updates) {
        audienceTemplateService.updateTemplate(id, updates);
        return ApiResponse.ok(Map.of("success", true));
    }

    @DeleteMapping("/templates/{id}")
    @Operation(summary = "删除受众模板")
    public ApiResponse<Map<String, Object>> deleteTemplate(@PathVariable Long id) {
        audienceTemplateService.deleteTemplate(id);
        return ApiResponse.ok(Map.of("success", true));
    }

    @PostMapping("/templates/{id}/create-audience")
    @Operation(summary = "从模板一键创建受众包")
    public ApiResponse<AudienceGroup> createFromTemplate(@PathVariable Long id,
                                                          @RequestBody Map<String, Object> body,
                                                          Authentication auth) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        Integer gameId = body.get("gameId") != null ? ((Number) body.get("gameId")).intValue() : null;
        String createdBy = auth != null ? auth.getName() : "system";
        return ApiResponse.ok(audienceTemplateService.createAudienceFromTemplate(id, name, description, gameId, createdBy));
    }

    @PostMapping("/templates/{id}/preview-count")
    @Operation(summary = "预览模板匹配人数")
    public ApiResponse<Map<String, Object>> previewTemplateCount(@PathVariable Long id) {
        return ApiResponse.ok(audienceTemplateService.previewCount(id));
    }
}
