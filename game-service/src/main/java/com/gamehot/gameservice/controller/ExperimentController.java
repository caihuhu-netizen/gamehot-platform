package com.gamehot.gameservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.gameservice.entity.Experiment;
import com.gamehot.gameservice.entity.ExperimentVariant;
import com.gamehot.gameservice.repository.ExperimentRepository;
import com.gamehot.gameservice.repository.ExperimentVariantRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Experiment", description = "A/B 实验管理")
@RestController
@RequestMapping("/api/game/experiments")
@RequiredArgsConstructor
public class ExperimentController {

    private final ExperimentRepository experimentRepository;
    private final ExperimentVariantRepository variantRepository;

    @Operation(summary = "实验列表")
    @GetMapping
    public ApiResponse<List<Experiment>> list(@RequestParam(required = false) Long gameId) {
        if (gameId != null) {
            return ApiResponse.ok(experimentRepository.findByGameId(gameId));
        }
        return ApiResponse.ok(experimentRepository.findAll());
    }

    @Operation(summary = "实验详情（含变体）")
    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> getById(@PathVariable Long id) {
        return experimentRepository.findById(id).map(exp -> {
            List<ExperimentVariant> variants = variantRepository.findByExperimentId(id);
            Map<String, Object> result = new HashMap<>();
            result.put("id", exp.getId());
            result.put("experimentCode", exp.getExperimentCode());
            result.put("experimentName", exp.getExperimentName());
            result.put("experimentType", exp.getExperimentType());
            result.put("scopeType", exp.getScopeType());
            result.put("scopeId", exp.getScopeId());
            result.put("targetSegments", exp.getTargetSegments());
            result.put("hypothesis", exp.getHypothesis());
            result.put("primaryMetric", exp.getPrimaryMetric());
            result.put("secondaryMetrics", exp.getSecondaryMetrics());
            result.put("trafficPercent", exp.getTrafficPercent());
            result.put("status", exp.getStatus());
            result.put("startTime", exp.getStartTime());
            result.put("endTime", exp.getEndTime());
            result.put("createdAt", exp.getCreatedAt());
            result.put("variants", variants);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("实验不存在"));
    }

    @Operation(summary = "创建实验")
    @PostMapping
    public ApiResponse<Map<String, Object>> create(@RequestBody Experiment body) {
        experimentRepository.save(body);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "更新实验")
    @PutMapping("/{id}")
    public ApiResponse<Map<String, Object>> update(@PathVariable Long id, @RequestBody Experiment body) {
        return experimentRepository.findById(id).map(existing -> {
            if (body.getExperimentName() != null) existing.setExperimentName(body.getExperimentName());
            if (body.getTargetSegments() != null) existing.setTargetSegments(body.getTargetSegments());
            if (body.getHypothesis() != null) existing.setHypothesis(body.getHypothesis());
            if (body.getPrimaryMetric() != null) existing.setPrimaryMetric(body.getPrimaryMetric());
            if (body.getSecondaryMetrics() != null) existing.setSecondaryMetrics(body.getSecondaryMetrics());
            if (body.getTrafficPercent() != null) existing.setTrafficPercent(body.getTrafficPercent());
            if (body.getStatus() != null) existing.setStatus(body.getStatus());
            if (body.getStartTime() != null) existing.setStartTime(body.getStartTime());
            if (body.getEndTime() != null) existing.setEndTime(body.getEndTime());
            experimentRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("实验不存在"));
    }

    @Operation(summary = "实验结果分析（mock）")
    @GetMapping("/{experimentId}/analysis")
    public ApiResponse<Map<String, Object>> getAnalysis(@PathVariable Long experimentId) {
        // TODO: implement real experiment metrics computation
        Map<String, Object> result = new HashMap<>();
        result.put("experimentId", experimentId);
        result.put("status", "NO_DATA");
        result.put("variants", List.of());
        result.put("primaryMetricResults", Map.of());
        result.put("statisticalSignificance", null);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "实验状态流转")
    @PostMapping("/{experimentId}/transition")
    public ApiResponse<Map<String, Object>> transition(
            @PathVariable Long experimentId,
            @RequestBody Map<String, String> body) {
        String targetStatus = body.get("targetStatus");
        String reason = body.get("reason");

        if (targetStatus == null) {
            return ApiResponse.fail("targetStatus 不能为空");
        }

        return experimentRepository.findById(experimentId).map(exp -> {
            // State machine validation
            String current = exp.getStatus();
            boolean valid = isValidTransition(current, targetStatus);
            if (!valid) {
                return ApiResponse.<Map<String, Object>>fail("状态流转不合法: " + current + " -> " + targetStatus);
            }
            exp.setStatus(targetStatus);
            if ("RUNNING".equals(targetStatus) && exp.getStartTime() == null) {
                exp.setStartTime(LocalDateTime.now());
            }
            if (List.of("COMPLETED", "GRADUATED", "ABORTED").contains(targetStatus)) {
                exp.setEndTime(LocalDateTime.now());
            }
            experimentRepository.save(exp);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("previousStatus", current);
            result.put("currentStatus", targetStatus);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("实验不存在"));
    }

    private boolean isValidTransition(String from, String to) {
        Map<String, List<String>> transitions = Map.of(
                "DRAFT", List.of("RUNNING", "ABORTED"),
                "RUNNING", List.of("PAUSED", "COMPLETED", "GRADUATED", "ABORTED"),
                "PAUSED", List.of("RUNNING", "COMPLETED", "ABORTED"),
                "COMPLETED", List.of("GRADUATED"),
                "GRADUATED", List.of(),
                "ABORTED", List.of()
        );
        return transitions.getOrDefault(from, List.of()).contains(to);
    }

    @Operation(summary = "检查自动毕业（mock）")
    @GetMapping("/{experimentId}/check-graduation")
    public ApiResponse<Map<String, Object>> checkGraduation(@PathVariable Long experimentId) {
        // TODO: implement auto-graduation logic
        Map<String, Object> result = new HashMap<>();
        result.put("canGraduate", false);
        result.put("reason", "数据量不足");
        result.put("confidence", 0);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "实验毕业（mock）")
    @PostMapping("/{experimentId}/graduate")
    public ApiResponse<Map<String, Object>> graduate(@PathVariable Long experimentId) {
        // TODO: implement graduate logic
        Map<String, Object> result = new HashMap<>();
        result.put("success", false);
        result.put("message", "自动毕业功能暂未实现");
        return ApiResponse.ok(result);
    }

    @Operation(summary = "检查所有运行中实验（mock）")
    @GetMapping("/check-all-running")
    public ApiResponse<List<Map<String, Object>>> checkAllRunning() {
        // TODO: implement bulk check
        return ApiResponse.ok(List.of());
    }

    // ==================== Variants ====================

    @Operation(summary = "实验变体列表")
    @GetMapping("/{experimentId}/variants")
    public ApiResponse<List<ExperimentVariant>> listVariants(@PathVariable Long experimentId) {
        return ApiResponse.ok(variantRepository.findByExperimentId(experimentId));
    }

    @Operation(summary = "创建实验变体")
    @PostMapping("/{experimentId}/variants")
    public ApiResponse<Map<String, Object>> createVariant(
            @PathVariable Long experimentId,
            @RequestBody ExperimentVariant body) {
        body.setExperimentId(experimentId);
        variantRepository.save(body);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "更新实验变体")
    @PutMapping("/variants/{id}")
    public ApiResponse<Map<String, Object>> updateVariant(
            @PathVariable Long id,
            @RequestBody ExperimentVariant body) {
        return variantRepository.findById(id).map(existing -> {
            if (body.getVariantName() != null) existing.setVariantName(body.getVariantName());
            if (body.getTrafficPercent() != null) existing.setTrafficPercent(body.getTrafficPercent());
            if (body.getOverrideConfig() != null) existing.setOverrideConfig(body.getOverrideConfig());
            variantRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("变体不存在"));
    }

    @Operation(summary = "删除实验变体")
    @DeleteMapping("/variants/{id}")
    public ApiResponse<Map<String, Object>> deleteVariant(@PathVariable Long id) {
        if (!variantRepository.existsById(id)) {
            return ApiResponse.fail("变体不存在");
        }
        variantRepository.deleteById(id);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }
}
