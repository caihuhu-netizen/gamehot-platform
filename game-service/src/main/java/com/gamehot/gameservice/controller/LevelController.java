package com.gamehot.gameservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.gameservice.entity.DifficultyCurveTemplate;
import com.gamehot.gameservice.entity.GameLevel;
import com.gamehot.gameservice.entity.ProbeSchedule;
import com.gamehot.gameservice.repository.DifficultyCurveTemplateRepository;
import com.gamehot.gameservice.repository.GameLevelRepository;
import com.gamehot.gameservice.repository.ProbeScheduleRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Level", description = "关卡配置管理")
@RestController
@RequestMapping("/api/game/levels")
@RequiredArgsConstructor
public class LevelController {

    private final GameLevelRepository levelRepository;
    private final DifficultyCurveTemplateRepository templateRepository;
    private final ProbeScheduleRepository probeRepository;

    @Operation(summary = "关卡列表")
    @GetMapping
    public ApiResponse<Map<String, Object>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long gameId) {
        PageRequest pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<GameLevel> pageResult;
        if (search != null && !search.isBlank()) {
            pageResult = levelRepository.findByLevelNameContainingIgnoreCase(search, pageable);
        } else if (gameId != null) {
            pageResult = levelRepository.findByGameId(gameId, pageable);
        } else {
            pageResult = levelRepository.findAll(pageable);
        }
        Map<String, Object> result = new HashMap<>();
        result.put("data", pageResult.getContent());
        result.put("total", pageResult.getTotalElements());
        result.put("page", page);
        result.put("pageSize", pageSize);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "关卡详情")
    @GetMapping("/{id}")
    public ApiResponse<GameLevel> getById(@PathVariable Long id) {
        return levelRepository.findById(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail("关卡不存在"));
    }

    @Operation(summary = "创建关卡")
    @PostMapping
    public ApiResponse<Map<String, Object>> create(@RequestBody GameLevel body) {
        levelRepository.save(body);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "更新关卡")
    @PutMapping("/{id}")
    public ApiResponse<Map<String, Object>> update(@PathVariable Long id, @RequestBody GameLevel body) {
        return levelRepository.findById(id).map(existing -> {
            if (body.getLevelName() != null) existing.setLevelName(body.getLevelName());
            if (body.getDifficultyScore() != null) existing.setDifficultyScore(body.getDifficultyScore());
            if (body.getColorCount() != null) existing.setColorCount(body.getColorCount());
            if (body.getGridSize() != null) existing.setGridSize(body.getGridSize());
            if (body.getObstacleTypes() != null) existing.setObstacleTypes(body.getObstacleTypes());
            if (body.getTargetPassRate() != null) existing.setTargetPassRate(body.getTargetPassRate());
            if (body.getIsMonetizePoint() != null) existing.setIsMonetizePoint(body.getIsMonetizePoint());
            if (body.getRecommendedSegments() != null) existing.setRecommendedSegments(body.getRecommendedSegments());
            if (body.getProbeType() != null) existing.setProbeType(body.getProbeType());
            if (body.getLayoutConfig() != null) existing.setLayoutConfig(body.getLayoutConfig());
            if (body.getOptimalMoves() != null) existing.setOptimalMoves(body.getOptimalMoves());
            if (body.getAvgMoves() != null) existing.setAvgMoves(body.getAvgMoves());
            levelRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("关卡不存在"));
    }

    @Operation(summary = "删除关卡")
    @DeleteMapping("/{id}")
    public ApiResponse<Map<String, Object>> delete(@PathVariable Long id) {
        if (!levelRepository.existsById(id)) {
            return ApiResponse.fail("关卡不存在");
        }
        levelRepository.deleteById(id);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "难度分布统计")
    @GetMapping("/difficulty-distribution")
    public ApiResponse<List<Map<String, Object>>> difficultyDistribution() {
        // TODO: implement real difficulty distribution from DB aggregation
        List<Map<String, Object>> stats = List.of(
                Map.of("range", "0-20", "count", 0, "label", "简单"),
                Map.of("range", "21-40", "count", 0, "label", "普通"),
                Map.of("range", "41-60", "count", 0, "label", "中等"),
                Map.of("range", "61-80", "count", 0, "label", "困难"),
                Map.of("range", "81-100", "count", 0, "label", "极难")
        );
        return ApiResponse.ok(stats);
    }

    @Operation(summary = "关卡通过率/流失率分析（mock）")
    @GetMapping("/analytics")
    public ApiResponse<Map<String, Object>> analytics(@RequestParam(required = false) Long gameId) {
        // TODO: implement real analytics from event data
        Map<String, Object> result = new HashMap<>();
        result.put("avgPassRate", 0.65);
        result.put("avgChurnRate", 0.15);
        result.put("topChurnLevels", List.of());
        result.put("topDifficultLevels", List.of());
        return ApiResponse.ok(result);
    }

    // ==================== Difficulty Curve Templates ====================

    @Operation(summary = "难度曲线模板列表")
    @GetMapping("/templates")
    public ApiResponse<List<DifficultyCurveTemplate>> listTemplates(@RequestParam(required = false) Long gameId) {
        return ApiResponse.ok(templateRepository.findAll());
    }

    @Operation(summary = "创建难度曲线模板")
    @PostMapping("/templates")
    public ApiResponse<Map<String, Object>> createTemplate(@RequestBody DifficultyCurveTemplate body) {
        templateRepository.save(body);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "更新难度曲线模板")
    @PutMapping("/templates/{id}")
    public ApiResponse<Map<String, Object>> updateTemplate(@PathVariable Long id, @RequestBody DifficultyCurveTemplate body) {
        return templateRepository.findById(id).map(existing -> {
            if (body.getSegmentLevel() != null) existing.setSegmentLevel(body.getSegmentLevel());
            if (body.getCycleLength() != null) existing.setCycleLength(body.getCycleLength());
            if (body.getLevelConfigs() != null) existing.setLevelConfigs(body.getLevelConfigs());
            if (body.getCalibrationConfig() != null) existing.setCalibrationConfig(body.getCalibrationConfig());
            if (body.getMonetizeTriggerConfig() != null) existing.setMonetizeTriggerConfig(body.getMonetizeTriggerConfig());
            if (body.getIsDefault() != null) existing.setIsDefault(body.getIsDefault());
            if (body.getEffectiveFrom() != null) existing.setEffectiveFrom(body.getEffectiveFrom());
            if (body.getEffectiveTo() != null) existing.setEffectiveTo(body.getEffectiveTo());
            templateRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("模板不存在"));
    }

    // ==================== Probe Schedules ====================

    @Operation(summary = "探针计划列表")
    @GetMapping("/probes")
    public ApiResponse<List<ProbeSchedule>> listProbes(@RequestParam(required = false) Long gameId) {
        return ApiResponse.ok(probeRepository.findAll());
    }

    @Operation(summary = "创建探针计划")
    @PostMapping("/probes")
    public ApiResponse<Map<String, Object>> createProbe(@RequestBody ProbeSchedule body) {
        probeRepository.save(body);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "更新探针计划")
    @PutMapping("/probes/{id}")
    public ApiResponse<Map<String, Object>> updateProbe(@PathVariable Long id, @RequestBody ProbeSchedule body) {
        return probeRepository.findById(id).map(existing -> {
            if (body.getProbeType() != null) existing.setProbeType(body.getProbeType());
            if (body.getLevelId() != null) existing.setLevelId(body.getLevelId());
            if (body.getTriggerConditions() != null) existing.setTriggerConditions(body.getTriggerConditions());
            if (body.getInsertRatio() != null) existing.setInsertRatio(body.getInsertRatio());
            if (body.getControlGroupRatio() != null) existing.setControlGroupRatio(body.getControlGroupRatio());
            if (body.getActiveDays() != null) existing.setActiveDays(body.getActiveDays());
            if (body.getCooldownLevels() != null) existing.setCooldownLevels(body.getCooldownLevels());
            if (body.getIsActive() != null) existing.setIsActive(body.getIsActive());
            probeRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("探针计划不存在"));
    }
}
