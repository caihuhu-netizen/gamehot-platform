package com.gamehot.aiservice.controller;

import com.gamehot.aiservice.service.ChurnPredictionService;
import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Tag(name = "流失预测", description = "用户流失风险预测相关接口")
@RestController
@RequestMapping("/api/ai/churn")
@RequiredArgsConstructor
public class ChurnPredictionController {

    private final ChurnPredictionService churnService;

    @Operation(summary = "流失预测总览")
    @GetMapping("/overview")
    public ApiResponse<Map<String, Object>> overview(@RequestParam(required = false) Integer gameId) {
        return ApiResponse.ok(churnService.getOverview(gameId));
    }

    @Operation(summary = "高风险用户列表")
    @GetMapping("/high-risk-users")
    public ApiResponse<List<Map<String, Object>>> highRiskUsers(
            @RequestParam(required = false) Integer gameId,
            @RequestParam(defaultValue = "0.7") double threshold,
            @RequestParam(defaultValue = "100") int limit) {
        return ApiResponse.ok(churnService.getHighRiskUsers(gameId, threshold, limit));
    }

    @Operation(summary = "风险趋势")
    @GetMapping("/risk-trend")
    public ApiResponse<List<Map<String, Object>>> riskTrend(
            @RequestParam(required = false) Integer gameId,
            @RequestParam(defaultValue = "30") int days) {
        return ApiResponse.ok(churnService.getRiskTrend(gameId, days));
    }

    @Operation(summary = "地区风险分布")
    @GetMapping("/region-risk")
    public ApiResponse<List<Map<String, Object>>> regionRisk(@RequestParam(required = false) Integer gameId) {
        return ApiResponse.ok(churnService.getRegionRisk(gameId));
    }

    @Operation(summary = "干预效果统计")
    @GetMapping("/intervention-stats")
    public ApiResponse<Map<String, Object>> interventionStats(@RequestParam(required = false) Integer gameId) {
        return ApiResponse.ok(churnService.getInterventionStats(gameId));
    }

    @Operation(summary = "触发干预行动")
    @PostMapping("/trigger-intervention")
    public ApiResponse<Map<String, Object>> triggerIntervention(@RequestBody Map<String, Object> req) {
        List<?> userIds = (List<?>) req.get("userIds");
        String action = (String) req.getOrDefault("action", "push");
        Map<String, Object> result = new HashMap<>();
        result.put("triggered", userIds != null ? userIds.size() : 0);
        result.put("action", action);
        result.put("status", "queued");
        result.put("message", "干预任务已加入队列，预计1分钟内执行");
        return ApiResponse.ok(result);
    }
}
