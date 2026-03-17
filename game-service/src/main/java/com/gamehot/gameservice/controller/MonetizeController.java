package com.gamehot.gameservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.gameservice.entity.MonetizeTriggerRule;
import com.gamehot.gameservice.entity.PopupTemplate;
import com.gamehot.gameservice.entity.TriggerPopupBinding;
import com.gamehot.gameservice.repository.MonetizeTriggerRuleRepository;
import com.gamehot.gameservice.repository.PopupTemplateRepository;
import com.gamehot.gameservice.repository.TriggerPopupBindingRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Monetize", description = "变现触发规则管理")
@RestController
@RequestMapping("/api/game/monetize")
@RequiredArgsConstructor
public class MonetizeController {

    private final MonetizeTriggerRuleRepository ruleRepository;
    private final PopupTemplateRepository templateRepository;
    private final TriggerPopupBindingRepository bindingRepository;

    // ==================== Trigger Rules ====================

    @Operation(summary = "触发规则列表")
    @GetMapping("/rules")
    public ApiResponse<List<MonetizeTriggerRule>> listRules(@RequestParam(required = false) Long gameId) {
        return ApiResponse.ok(ruleRepository.findAll());
    }

    @Operation(summary = "创建触发规则")
    @PostMapping("/rules")
    public ApiResponse<Map<String, Object>> createRule(@RequestBody MonetizeTriggerRule body) {
        ruleRepository.save(body);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "更新触发规则")
    @PutMapping("/rules/{id}")
    public ApiResponse<Map<String, Object>> updateRule(@PathVariable Long id, @RequestBody MonetizeTriggerRule body) {
        return ruleRepository.findById(id).map(existing -> {
            if (body.getRuleName() != null) existing.setRuleName(body.getRuleName());
            if (body.getTargetSegments() != null) existing.setTargetSegments(body.getTargetSegments());
            if (body.getTriggerEvent() != null) existing.setTriggerEvent(body.getTriggerEvent());
            if (body.getTriggerConditions() != null) existing.setTriggerConditions(body.getTriggerConditions());
            if (body.getPopupType() != null) existing.setPopupType(body.getPopupType());
            if (body.getDailyLimit() != null) existing.setDailyLimit(body.getDailyLimit());
            if (body.getTotalCooldownMinutes() != null) existing.setTotalCooldownMinutes(body.getTotalCooldownMinutes());
            if (body.getAfterPayCooldownMinutes() != null) existing.setAfterPayCooldownMinutes(body.getAfterPayCooldownMinutes());
            if (body.getAfterAdCooldownMinutes() != null) existing.setAfterAdCooldownMinutes(body.getAfterAdCooldownMinutes());
            if (body.getPriority() != null) existing.setPriority(body.getPriority());
            if (body.getIsActive() != null) existing.setIsActive(body.getIsActive());
            if (body.getEffectiveFrom() != null) existing.setEffectiveFrom(body.getEffectiveFrom());
            if (body.getEffectiveTo() != null) existing.setEffectiveTo(body.getEffectiveTo());
            ruleRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("触发规则不存在"));
    }

    @Operation(summary = "删除触发规则")
    @DeleteMapping("/rules/{id}")
    public ApiResponse<Map<String, Object>> deleteRule(@PathVariable Long id) {
        if (!ruleRepository.existsById(id)) return ApiResponse.fail("触发规则不存在");
        ruleRepository.deleteById(id);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "启用/禁用触发规则")
    @PutMapping("/rules/{id}/toggle")
    public ApiResponse<Map<String, Object>> toggleRule(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        return ruleRepository.findById(id).map(existing -> {
            existing.setIsActive(body.getOrDefault("isActive", 1));
            ruleRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("触发规则不存在"));
    }

    // ==================== Popup Templates ====================

    @Operation(summary = "弹窗模板列表")
    @GetMapping("/popup-templates")
    public ApiResponse<List<PopupTemplate>> listTemplates(@RequestParam(required = false) Long gameId) {
        return ApiResponse.ok(templateRepository.findAll());
    }

    @Operation(summary = "创建弹窗模板")
    @PostMapping("/popup-templates")
    public ApiResponse<Map<String, Object>> createTemplate(@RequestBody PopupTemplate body) {
        templateRepository.save(body);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "更新弹窗模板")
    @PutMapping("/popup-templates/{id}")
    public ApiResponse<Map<String, Object>> updateTemplate(@PathVariable Long id, @RequestBody PopupTemplate body) {
        return templateRepository.findById(id).map(existing -> {
            if (body.getTitle() != null) existing.setTitle(body.getTitle());
            if (body.getBodyText() != null) existing.setBodyText(body.getBodyText());
            if (body.getPrimaryButtonText() != null) existing.setPrimaryButtonText(body.getPrimaryButtonText());
            if (body.getSecondaryButtonText() != null) existing.setSecondaryButtonText(body.getSecondaryButtonText());
            if (body.getDynamicVariables() != null) existing.setDynamicVariables(body.getDynamicVariables());
            if (body.getUiConfig() != null) existing.setUiConfig(body.getUiConfig());
            if (body.getIsActive() != null) existing.setIsActive(body.getIsActive());
            templateRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("弹窗模板不存在"));
    }

    // ==================== Bindings ====================

    @Operation(summary = "触发规则-弹窗绑定列表")
    @GetMapping("/bindings")
    public ApiResponse<List<TriggerPopupBinding>> listBindings(@RequestParam(required = false) Long ruleId) {
        if (ruleId != null) {
            return ApiResponse.ok(bindingRepository.findByRuleId(ruleId));
        }
        return ApiResponse.ok(bindingRepository.findAll());
    }

    @Operation(summary = "创建绑定关系")
    @PostMapping("/bindings")
    public ApiResponse<Map<String, Object>> createBinding(@RequestBody TriggerPopupBinding body) {
        bindingRepository.save(body);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }
}
