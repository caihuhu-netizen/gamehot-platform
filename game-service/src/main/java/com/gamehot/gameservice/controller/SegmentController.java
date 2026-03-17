package com.gamehot.gameservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.gameservice.entity.SegmentBehaviorStrategy;
import com.gamehot.gameservice.entity.SegmentCalcRule;
import com.gamehot.gameservice.entity.SegmentLayerLogic;
import com.gamehot.gameservice.entity.SegmentTemplate;
import com.gamehot.gameservice.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "Segment", description = "用户分群配置管理")
@RestController
@RequestMapping("/api/game/segments")
@RequiredArgsConstructor
public class SegmentController {

    private final SegmentLayerLogicRepository layerLogicRepo;
    private final SegmentBehaviorStrategyRepository behaviorRepo;
    private final SegmentCalcRuleRepository calcRuleRepo;
    private final SegmentTemplateRepository templateRepo;

    // ==================== Layer Logic ====================

    @Operation(summary = "分层逻辑列表")
    @GetMapping("/layer-logic")
    public ApiResponse<List<SegmentLayerLogic>> listLayerLogic(@RequestParam(required = false) Long gameId) {
        return ApiResponse.ok(layerLogicRepo.findAll());
    }

    @Operation(summary = "分层逻辑详情")
    @GetMapping("/layer-logic/{id}")
    public ApiResponse<SegmentLayerLogic> getLayerLogic(@PathVariable Long id) {
        return layerLogicRepo.findById(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail("分层逻辑不存在"));
    }

    @Operation(summary = "创建分层逻辑")
    @PostMapping("/layer-logic")
    public ApiResponse<SegmentLayerLogic> createLayerLogic(@RequestBody SegmentLayerLogic body) {
        return ApiResponse.ok(layerLogicRepo.save(body));
    }

    @Operation(summary = "更新分层逻辑")
    @PutMapping("/layer-logic/{id}")
    public ApiResponse<SegmentLayerLogic> updateLayerLogic(@PathVariable Long id, @RequestBody SegmentLayerLogic body) {
        return layerLogicRepo.findById(id).map(existing -> {
            if (body.getLayerName() != null) existing.setLayerName(body.getLayerName());
            if (body.getComment() != null) existing.setComment(body.getComment());
            if (body.getInterstitialAdFirstLevel() != null) existing.setInterstitialAdFirstLevel(body.getInterstitialAdFirstLevel());
            if (body.getInterstitialAdFrequency() != null) existing.setInterstitialAdFrequency(body.getInterstitialAdFrequency());
            if (body.getPushGifts() != null) existing.setPushGifts(body.getPushGifts());
            if (body.getIsActive() != null) existing.setIsActive(body.getIsActive());
            return ApiResponse.ok(layerLogicRepo.save(existing));
        }).orElse(ApiResponse.fail("分层逻辑不存在"));
    }

    @Operation(summary = "删除分层逻辑")
    @DeleteMapping("/layer-logic/{id}")
    public ApiResponse<Map<String, Object>> deleteLayerLogic(@PathVariable Long id) {
        if (!layerLogicRepo.existsById(id)) return ApiResponse.fail("分层逻辑不存在");
        layerLogicRepo.deleteById(id);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "切换分层逻辑启用状态")
    @PutMapping("/layer-logic/{id}/toggle")
    public ApiResponse<SegmentLayerLogic> toggleLayerActive(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        return layerLogicRepo.findById(id).map(existing -> {
            existing.setIsActive(body.getOrDefault("isActive", 1));
            return ApiResponse.ok(layerLogicRepo.save(existing));
        }).orElse(ApiResponse.fail("分层逻辑不存在"));
    }

    // ==================== Behavior Strategy ====================

    @Operation(summary = "行为策略列表")
    @GetMapping("/behavior-strategies")
    public ApiResponse<List<SegmentBehaviorStrategy>> listBehaviorStrategies(
            @RequestParam(required = false) Integer layerId) {
        if (layerId != null) {
            return ApiResponse.ok(behaviorRepo.findByLayerId(layerId));
        }
        return ApiResponse.ok(behaviorRepo.findAll());
    }

    @Operation(summary = "行为策略详情")
    @GetMapping("/behavior-strategies/{id}")
    public ApiResponse<SegmentBehaviorStrategy> getBehaviorStrategy(@PathVariable Long id) {
        return behaviorRepo.findById(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail("行为策略不存在"));
    }

    @Operation(summary = "创建行为策略")
    @PostMapping("/behavior-strategies")
    public ApiResponse<SegmentBehaviorStrategy> createBehaviorStrategy(@RequestBody SegmentBehaviorStrategy body) {
        return ApiResponse.ok(behaviorRepo.save(body));
    }

    @Operation(summary = "更新行为策略")
    @PutMapping("/behavior-strategies/{id}")
    public ApiResponse<SegmentBehaviorStrategy> updateBehaviorStrategy(
            @PathVariable Long id, @RequestBody SegmentBehaviorStrategy body) {
        return behaviorRepo.findById(id).map(existing -> {
            if (body.getGiftType() != null) existing.setGiftType(body.getGiftType());
            if (body.getFirstPushConditionType() != null) existing.setFirstPushConditionType(body.getFirstPushConditionType());
            existing.setFirstPushConditionParam(body.getFirstPushConditionParam());
            if (body.getPushConditionType() != null) existing.setPushConditionType(body.getPushConditionType());
            existing.setPushConditionParam(body.getPushConditionParam());
            existing.setPushGiftId(body.getPushGiftId());
            if (body.getPushGiftPlace() != null) existing.setPushGiftPlace(body.getPushGiftPlace());
            if (body.getCooldownRule() != null) existing.setCooldownRule(body.getCooldownRule());
            existing.setCooldownRuleParam1(body.getCooldownRuleParam1());
            existing.setCooldownRuleParam2(body.getCooldownRuleParam2());
            if (body.getIsActive() != null) existing.setIsActive(body.getIsActive());
            return ApiResponse.ok(behaviorRepo.save(existing));
        }).orElse(ApiResponse.fail("行为策略不存在"));
    }

    @Operation(summary = "删除行为策略")
    @DeleteMapping("/behavior-strategies/{id}")
    public ApiResponse<Map<String, Object>> deleteBehaviorStrategy(@PathVariable Long id) {
        if (!behaviorRepo.existsById(id)) return ApiResponse.fail("行为策略不存在");
        behaviorRepo.deleteById(id);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    // ==================== Calc Rules ====================

    @Operation(summary = "计算规则列表")
    @GetMapping("/calc-rules")
    public ApiResponse<List<SegmentCalcRule>> listCalcRules(@RequestParam(required = false) Integer ruleType) {
        if (ruleType != null) {
            return ApiResponse.ok(calcRuleRepo.findByRuleType(ruleType));
        }
        return ApiResponse.ok(calcRuleRepo.findAll());
    }

    @Operation(summary = "计算规则详情")
    @GetMapping("/calc-rules/{id}")
    public ApiResponse<SegmentCalcRule> getCalcRule(@PathVariable Long id) {
        return calcRuleRepo.findById(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail("计算规则不存在"));
    }

    @Operation(summary = "创建计算规则")
    @PostMapping("/calc-rules")
    public ApiResponse<SegmentCalcRule> createCalcRule(@RequestBody SegmentCalcRule body) {
        return ApiResponse.ok(calcRuleRepo.save(body));
    }

    @Operation(summary = "更新计算规则")
    @PutMapping("/calc-rules/{id}")
    public ApiResponse<SegmentCalcRule> updateCalcRule(@PathVariable Long id, @RequestBody SegmentCalcRule body) {
        return calcRuleRepo.findById(id).map(existing -> {
            if (body.getRuleType() != null) existing.setRuleType(body.getRuleType());
            if (body.getTargetLayer() != null) existing.setTargetLayer(body.getTargetLayer());
            existing.setPurchaseAmount(body.getPurchaseAmount());
            existing.setStreakLoginTimes(body.getStreakLoginTimes());
            existing.setTotalLoginTimes(body.getTotalLoginTimes());
            existing.setOnlineDuration(body.getOnlineDuration());
            existing.setAvgDailyOnlineTime(body.getAvgDailyOnlineTime());
            existing.setCompleteLevelNum(body.getCompleteLevelNum());
            existing.setAvgDailyCompleteLevelNum(body.getAvgDailyCompleteLevelNum());
            if (body.getRefreshTime() != null) existing.setRefreshTime(body.getRefreshTime());
            if (body.getIsActive() != null) existing.setIsActive(body.getIsActive());
            return ApiResponse.ok(calcRuleRepo.save(existing));
        }).orElse(ApiResponse.fail("计算规则不存在"));
    }

    @Operation(summary = "删除计算规则")
    @DeleteMapping("/calc-rules/{id}")
    public ApiResponse<Map<String, Object>> deleteCalcRule(@PathVariable Long id) {
        if (!calcRuleRepo.existsById(id)) return ApiResponse.fail("计算规则不存在");
        calcRuleRepo.deleteById(id);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    // ==================== Templates ====================

    @Operation(summary = "分群模板列表")
    @GetMapping("/templates")
    public ApiResponse<List<SegmentTemplate>> listTemplates(@RequestParam(required = false) String gameType) {
        if (gameType != null && !gameType.isBlank()) {
            return ApiResponse.ok(templateRepo.findByGameType(gameType));
        }
        return ApiResponse.ok(templateRepo.findAll());
    }

    @Operation(summary = "分群模板详情")
    @GetMapping("/templates/{id}")
    public ApiResponse<SegmentTemplate> getTemplate(@PathVariable Long id) {
        return templateRepo.findById(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail("模板不存在"));
    }

    @Operation(summary = "创建分群模板")
    @PostMapping("/templates")
    public ApiResponse<SegmentTemplate> createTemplate(@RequestBody SegmentTemplate body, Authentication auth) {
        if (auth != null && body.getCreatedBy() == null) {
            body.setCreatedBy(auth.getName());
        }
        return ApiResponse.ok(templateRepo.save(body));
    }

    @Operation(summary = "保存当前配置为模板")
    @PostMapping("/templates/save-current")
    public ApiResponse<SegmentTemplate> saveCurrentAsTemplate(@RequestBody SegmentTemplate body, Authentication auth) {
        // Capture current layer logic as template
        List<SegmentLayerLogic> layers = layerLogicRepo.findAll();
        body.setLayerConfig(layers);
        if (auth != null && body.getCreatedBy() == null) {
            body.setCreatedBy(auth.getName());
        }
        return ApiResponse.ok(templateRepo.save(body));
    }

    @Operation(summary = "删除分群模板")
    @DeleteMapping("/templates/{id}")
    public ApiResponse<Map<String, Object>> deleteTemplate(@PathVariable Long id) {
        if (!templateRepo.existsById(id)) return ApiResponse.fail("模板不存在");
        templateRepo.deleteById(id);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "应用分群模板（mock）")
    @PostMapping("/templates/{templateId}/apply")
    public ApiResponse<Map<String, Object>> applyTemplate(
            @PathVariable Long templateId,
            @RequestParam Long gameId) {
        // TODO: implement actual template application (copy configs to game)
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "模板应用功能开发中");
        return ApiResponse.ok(result);
    }

    // ==================== Segment Distribution ====================

    @Operation(summary = "分群用户分布（mock）")
    @GetMapping("/distribution")
    public ApiResponse<List<Map<String, Object>>> getSegmentDistribution() {
        // TODO: compute real distribution from user analytics data
        List<Map<String, Object>> dist = List.of(
                Map.of("layerId", 0, "layerName", "默认层", "userCount", 0, "percentage", 0),
                Map.of("layerId", 1, "layerName", "层级1", "userCount", 0, "percentage", 0)
        );
        return ApiResponse.ok(dist);
    }
}
