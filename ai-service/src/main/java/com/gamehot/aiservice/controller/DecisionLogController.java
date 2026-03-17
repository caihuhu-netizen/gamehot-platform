package com.gamehot.aiservice.controller;

import com.gamehot.aiservice.dto.CreateDecisionLogRequest;
import com.gamehot.aiservice.dto.UpdateDecisionActionRequest;
import com.gamehot.aiservice.dto.UpdateDecisionEffectRequest;
import com.gamehot.aiservice.entity.DecisionLog;
import com.gamehot.aiservice.repository.DecisionLogRepository;
import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Tag(name = "决策日志", description = "AI决策日志管理相关接口")
@RestController
@RequestMapping("/api/ai/decisions")
@RequiredArgsConstructor
public class DecisionLogController {

    private final DecisionLogRepository decisionLogRepository;

    @Operation(summary = "获取决策日志列表")
    @GetMapping
    public ApiResponse<Page<DecisionLog>> list(
            @RequestParam(required = false) String sourceType,
            @RequestParam(required = false) String humanAction,
            @RequestParam(required = false) Long gameId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<DecisionLog> result;
        if (gameId != null) {
            result = decisionLogRepository.findByGameId(gameId, pageable);
        } else if (sourceType != null) {
            result = decisionLogRepository.findBySourceType(sourceType, pageable);
        } else if (humanAction != null) {
            result = decisionLogRepository.findByHumanAction(humanAction, pageable);
        } else {
            result = decisionLogRepository.findAll(pageable);
        }
        return ApiResponse.ok(result);
    }

    @Operation(summary = "获取决策日志详情")
    @GetMapping("/{id}")
    public ApiResponse<DecisionLog> getById(@PathVariable Long id) {
        return decisionLogRepository.findById(id)
            .map(ApiResponse::ok)
            .orElse(ApiResponse.fail(404, "决策日志不存在"));
    }

    @Operation(summary = "记录决策")
    @PostMapping
    public ApiResponse<Map<String, Object>> create(@RequestBody CreateDecisionLogRequest req, Authentication auth) {
        DecisionLog log = new DecisionLog();
        log.setSourceType(req.getSourceType());
        log.setSourceId(req.getSourceId());
        log.setGameId(req.getGameId());
        log.setAiSuggestion(req.getAiSuggestion());
        log.setAiSuggestionType(req.getAiSuggestionType());
        log.setOperatorName(auth.getName());
        DecisionLog saved = decisionLogRepository.save(log);
        return ApiResponse.ok(Map.of("id", saved.getId()));
    }

    @Operation(summary = "更新决策行动")
    @PutMapping("/{id}/action")
    public ApiResponse<Void> updateAction(@PathVariable Long id,
            @RequestBody UpdateDecisionActionRequest req, Authentication auth) {
        return decisionLogRepository.findById(id).map(log -> {
            log.setHumanAction(req.getHumanAction());
            log.setHumanNote(req.getHumanNote());
            log.setModifiedAction(req.getModifiedAction());
            log.setOperatorName(auth.getName());
            decisionLogRepository.save(log);
            return ApiResponse.<Void>ok();
        }).orElse(ApiResponse.fail(404, "决策日志不存在"));
    }

    @Operation(summary = "更新决策效果")
    @PutMapping("/{id}/effect")
    public ApiResponse<Void> updateEffect(@PathVariable Long id,
            @RequestBody UpdateDecisionEffectRequest req) {
        return decisionLogRepository.findById(id).map(log -> {
            log.setEffectMetricBefore(req.getEffectMetricBefore());
            log.setEffectMetricAfter(req.getEffectMetricAfter());
            log.setEffectEvaluation(req.getEffectEvaluation());
            log.setEffectNote(req.getEffectNote());
            decisionLogRepository.save(log);
            return ApiResponse.<Void>ok();
        }).orElse(ApiResponse.fail(404, "决策日志不存在"));
    }

    @Operation(summary = "获取决策统计")
    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalDecisions", decisionLogRepository.count());
        stats.put("accepted", decisionLogRepository.countByHumanAction("accepted"));
        stats.put("rejected", decisionLogRepository.countByHumanAction("rejected"));
        stats.put("modified", decisionLogRepository.countByHumanAction("modified"));
        stats.put("positiveEffect", decisionLogRepository.countByEffectEvaluation("positive"));
        stats.put("negativeEffect", decisionLogRepository.countByEffectEvaluation("negative"));
        stats.put("neutralEffect", decisionLogRepository.countByEffectEvaluation("neutral"));
        return ApiResponse.ok(stats);
    }
}
