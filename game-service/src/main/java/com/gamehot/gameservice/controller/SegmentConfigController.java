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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * SegmentConfigController - 分群配置管理（/api/game/segment-config/*）
 * 前端 segmentConfig.* tRPC 路由的对应 REST 接口
 */
@Tag(name = "SegmentConfig", description = "分群配置管理（别名路径 /api/game/segment-config/*）")
@RestController
@RequestMapping("/api/game/segment-config")
@RequiredArgsConstructor
public class SegmentConfigController {

    private final SegmentLayerLogicRepository layerLogicRepo;
    private final SegmentBehaviorStrategyRepository behaviorRepo;
    private final SegmentCalcRuleRepository calcRuleRepo;
    private final SegmentTemplateRepository templateRepo;
    private final JdbcTemplate jdbc;

    // ==================== Layer Logic ====================

    @Operation(summary = "分层逻辑列表 (alias)")
    @GetMapping("/list-layer-logic")
    public ApiResponse<List<SegmentLayerLogic>> listLayerLogic(@RequestParam(required = false) Long gameId) {
        return ApiResponse.ok(layerLogicRepo.findAll());
    }

    @Operation(summary = "创建分层逻辑 (alias)")
    @PostMapping("/create-layer-logic")
    public ApiResponse<SegmentLayerLogic> createLayerLogic(@RequestBody SegmentLayerLogic body) {
        return ApiResponse.ok(layerLogicRepo.save(body));
    }

    @Operation(summary = "更新分层逻辑 (alias)")
    @PutMapping("/update-layer-logic")
    public ApiResponse<SegmentLayerLogic> updateLayerLogic(@RequestBody Map<String, Object> body) {
        Object idObj = body.get("id");
        if (idObj == null) return ApiResponse.fail("id is required");
        Long id = Long.valueOf(idObj.toString());
        return layerLogicRepo.findById(id).map(existing -> {
            if (body.containsKey("layerName")) existing.setLayerName((String) body.get("layerName"));
            if (body.containsKey("comment")) existing.setComment((String) body.get("comment"));
            if (body.containsKey("isActive")) existing.setIsActive((Integer) body.get("isActive"));
            return ApiResponse.ok(layerLogicRepo.save(existing));
        }).orElse(ApiResponse.fail("分层逻辑不存在"));
    }

    @Operation(summary = "切换分层逻辑启用状态 (alias)")
    @PutMapping("/toggle-layer-active")
    public ApiResponse<SegmentLayerLogic> toggleLayerActive(@RequestBody Map<String, Object> body) {
        Object idObj = body.get("id");
        if (idObj == null) return ApiResponse.fail("id is required");
        Long id = Long.valueOf(idObj.toString());
        return layerLogicRepo.findById(id).map(existing -> {
            Object isActiveObj = body.get("isActive");
            existing.setIsActive(isActiveObj != null ? ((Number) isActiveObj).intValue() : 1);
            return ApiResponse.ok(layerLogicRepo.save(existing));
        }).orElse(ApiResponse.fail("分层逻辑不存在"));
    }

    @Operation(summary = "删除分层逻辑 (alias)")
    @DeleteMapping("/delete-layer-logic")
    public ApiResponse<Map<String, Object>> deleteLayerLogic(@RequestParam Long id) {
        if (!layerLogicRepo.existsById(id)) return ApiResponse.fail("分层逻辑不存在");
        layerLogicRepo.deleteById(id);
        return ApiResponse.ok(Map.of("success", true));
    }

    // ==================== Behavior Strategy ====================

    @Operation(summary = "行为策略列表 (alias)")
    @GetMapping("/list-behavior-strategies")
    public ApiResponse<List<SegmentBehaviorStrategy>> listBehaviorStrategies(
            @RequestParam(required = false) Integer layerId) {
        if (layerId != null) {
            return ApiResponse.ok(behaviorRepo.findByLayerId(layerId));
        }
        return ApiResponse.ok(behaviorRepo.findAll());
    }

    @Operation(summary = "更新行为策略 (alias)")
    @PutMapping("/update-behavior-strategy")
    public ApiResponse<SegmentBehaviorStrategy> updateBehaviorStrategy(@RequestBody Map<String, Object> body) {
        Object idObj = body.get("id");
        if (idObj == null) return ApiResponse.fail("id is required");
        Long id = Long.valueOf(idObj.toString());
        return behaviorRepo.findById(id).map(existing -> {
            if (body.containsKey("giftType")) existing.setGiftType((String) body.get("giftType"));
            if (body.containsKey("cooldownRule")) existing.setCooldownRule((String) body.get("cooldownRule"));
            if (body.containsKey("isActive")) existing.setIsActive(((Number) body.get("isActive")).intValue());
            return ApiResponse.ok(behaviorRepo.save(existing));
        }).orElse(ApiResponse.fail("行为策略不存在"));
    }

    // ==================== Calc Rules ====================

    @Operation(summary = "计算规则列表 (alias)")
    @GetMapping("/list-calc-rules")
    public ApiResponse<List<SegmentCalcRule>> listCalcRules(@RequestParam(required = false) Integer ruleType) {
        if (ruleType != null) {
            return ApiResponse.ok(calcRuleRepo.findByRuleType(ruleType));
        }
        return ApiResponse.ok(calcRuleRepo.findAll());
    }

    @Operation(summary = "更新计算规则 (alias)")
    @PutMapping("/update-calc-rule")
    public ApiResponse<SegmentCalcRule> updateCalcRule(@RequestBody Map<String, Object> body) {
        Object idObj = body.get("id");
        if (idObj == null) return ApiResponse.fail("id is required");
        Long id = Long.valueOf(idObj.toString());
        return calcRuleRepo.findById(id).map(existing -> {
            if (body.containsKey("isActive")) existing.setIsActive(((Number) body.get("isActive")).intValue());
            return ApiResponse.ok(calcRuleRepo.save(existing));
        }).orElse(ApiResponse.fail("计算规则不存在"));
    }

    // ==================== Templates ====================

    @Operation(summary = "分群模板列表 (alias)")
    @GetMapping("/list-templates")
    public ApiResponse<List<SegmentTemplate>> listTemplates(@RequestParam(required = false) String gameType) {
        if (gameType != null && !gameType.isBlank()) {
            return ApiResponse.ok(templateRepo.findByGameType(gameType));
        }
        return ApiResponse.ok(templateRepo.findAll());
    }

    @Operation(summary = "保存当前配置为模板 (alias)")
    @PostMapping("/save-current-as-template")
    public ApiResponse<SegmentTemplate> saveCurrentAsTemplate(@RequestBody SegmentTemplate body) {
        if (body.getLayerConfig() == null) {
            body.setLayerConfig(layerLogicRepo.findAll());
        }
        return ApiResponse.ok(templateRepo.save(body));
    }

    @Operation(summary = "应用分群模板 (alias)")
    @PostMapping("/apply-template")
    public ApiResponse<Map<String, Object>> applyTemplate(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(Map.of("success", true, "message", "模板应用功能开发中"));
    }

    @Operation(summary = "删除分群模板 (alias)")
    @DeleteMapping("/delete-template")
    public ApiResponse<Map<String, Object>> deleteTemplate(@RequestParam Long id) {
        if (!templateRepo.existsById(id)) return ApiResponse.fail("模板不存在");
        templateRepo.deleteById(id);
        return ApiResponse.ok(Map.of("success", true));
    }

    // ==================== Segment Distribution ====================

    /**
     * 分群用户分布（从 user_segments 表汇总，返回 camelCase 字段名）
     * 前端 Segments.tsx 通过 segmentConfig.getSegmentDistribution 调用
     * 期望字段：segmentLevel, userCount
     */
    @Operation(summary = "分群用户分布")
    @GetMapping("/get-segment-distribution")
    public ApiResponse<List<Map<String, Object>>> getSegmentDistribution(
            @RequestParam(required = false) Long gameId) {
        StringBuilder sql = new StringBuilder(
            "SELECT segment_level, COUNT(*) as user_count FROM user_segments WHERE deleted = 0");
        if (gameId != null) sql.append(" AND game_id = ").append(gameId);
        sql.append(" GROUP BY segment_level ORDER BY segment_level");

        List<Map<String, Object>> raw;
        try {
            raw = jdbc.queryForList(sql.toString());
        } catch (Exception e) {
            raw = List.of();
        }
        long total = raw.stream().mapToLong(r -> ((Number) r.get("user_count")).longValue()).sum();
        List<Map<String, Object>> result = raw.stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            long cnt = ((Number) row.get("user_count")).longValue();
            m.put("segmentLevel", row.get("segment_level"));
            m.put("userCount", cnt);
            m.put("percentage", total > 0 ? Math.round(cnt * 10000.0 / total) / 100.0 : 0.0);
            return m;
        }).collect(Collectors.toList());
        return ApiResponse.ok(result);
    }
}


