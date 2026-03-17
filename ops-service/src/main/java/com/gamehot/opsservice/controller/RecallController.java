package com.gamehot.opsservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.opsservice.dto.CreateRecallPlanRequest;
import com.gamehot.opsservice.dto.UpdateRecallPlanRequest;
import com.gamehot.opsservice.model.RecallPlan;
import com.gamehot.opsservice.service.RecallService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ops/recall")
@RequiredArgsConstructor
@Tag(name = "RecallPlans", description = "用户召回计划管理")
public class RecallController {

    private final RecallService recallService;

    @GetMapping
    @Operation(summary = "召回计划列表")
    public ApiResponse<List<RecallPlan>> listPlans(
            @RequestParam(required = false) Integer gameId,
            @RequestParam(required = false) String status) {
        return ApiResponse.ok(recallService.listPlans(gameId, status));
    }

    @GetMapping("/{id}")
    @Operation(summary = "召回计划详情")
    public ApiResponse<RecallPlan> getPlan(@PathVariable Long id) {
        return recallService.getPlan(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail(404, "Recall plan not found"));
    }

    @PostMapping
    @Operation(summary = "创建召回计划")
    public ApiResponse<RecallPlan> createPlan(@RequestBody CreateRecallPlanRequest req, Authentication auth) {
        String createdBy = auth != null ? auth.getName() : "system";
        return ApiResponse.ok(recallService.createPlan(req, createdBy));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新召回计划")
    public ApiResponse<Map<String, Object>> updatePlan(@PathVariable Long id,
                                                        @RequestBody UpdateRecallPlanRequest req) {
        recallService.updatePlan(id, req);
        return ApiResponse.ok(Map.of("success", true));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除召回计划")
    public ApiResponse<Map<String, Object>> deletePlan(@PathVariable Long id) {
        recallService.deletePlan(id);
        return ApiResponse.ok(Map.of("success", true));
    }

    @PostMapping("/{id}/execute")
    @Operation(summary = "执行召回计划（异步入队）")
    public ApiResponse<Map<String, Object>> executePlan(@PathVariable Long id) {
        return ApiResponse.ok(recallService.executePlan(id));
    }

    @GetMapping("/stats")
    @Operation(summary = "召回统计数据")
    public ApiResponse<Map<String, Object>> getStats(@RequestParam(required = false) Integer gameId) {
        return ApiResponse.ok(recallService.getStats(gameId));
    }
}
