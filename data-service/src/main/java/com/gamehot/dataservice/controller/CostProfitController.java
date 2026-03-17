package com.gamehot.dataservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.dataservice.dto.CreateCategoryRequest;
import com.gamehot.dataservice.dto.CreateEntryRequest;
import com.gamehot.dataservice.model.CostCategory;
import com.gamehot.dataservice.model.CostEntry;
import com.gamehot.dataservice.service.CostProfitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * CostProfit Controller - 成本利润管理接口
 * 基路径: /api/data/cost-profit
 */
@Tag(name = "CostProfit", description = "成本分类管理、成本录入与盈亏分析接口")
@RestController
@RequestMapping("/api/data/cost-profit")
@RequiredArgsConstructor
public class CostProfitController {

    private final CostProfitService costProfitService;

    // ==================== 成本分类 ====================

    /**
     * 成本分类列表
     */
    @Operation(summary = "成本分类列表", description = "获取所有成本分类，按 sortOrder 升序排列")
    @GetMapping("/categories")
    public ApiResponse<List<CostCategory>> listCategories(
        @Parameter(description = "游戏ID（暂时忽略，分类全局共享）") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(costProfitService.listCategories());
    }

    /**
     * 创建成本分类
     */
    @Operation(summary = "创建成本分类", description = "创建成本分类，支持多级分类（parentId）")
    @PostMapping("/categories")
    public ApiResponse<Map<String, Object>> createCategory(@RequestBody CreateCategoryRequest req) {
        return ApiResponse.ok(costProfitService.createCategory(req));
    }

    // ==================== 成本明细 ====================

    /**
     * 成本明细列表
     */
    @Operation(summary = "成本明细列表", description = "查询成本录入明细，支持按分类/游戏/日期过滤")
    @GetMapping("/entries")
    public ApiResponse<List<CostEntry>> listEntries(
        @Parameter(description = "成本分类ID") @RequestParam(required = false) Long categoryId,
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId,
        @Parameter(description = "开始日期 YYYY-MM-DD") @RequestParam(required = false) String startDate,
        @Parameter(description = "结束日期 YYYY-MM-DD") @RequestParam(required = false) String endDate
    ) {
        return ApiResponse.ok(costProfitService.listEntries(categoryId, gameId, startDate, endDate));
    }

    /**
     * 录入成本
     */
    @Operation(summary = "录入成本", description = "录入一条成本记录，自动记录操作人")
    @PostMapping("/entries")
    public ApiResponse<Map<String, Object>> createEntry(@RequestBody CreateEntryRequest req) {
        return ApiResponse.ok(costProfitService.createEntry(req));
    }

    // ==================== 利润分析 ====================

    /**
     * 盈亏分析
     */
    @Operation(summary = "盈亏分析", description = "汇总IAP收入/广告收入/获客成本/其他成本，计算综合盈亏和利润率")
    @GetMapping("/profit-analysis")
    public ApiResponse<Map<String, Object>> profitAnalysis(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId,
        @Parameter(description = "开始日期 YYYY-MM-DD") @RequestParam(required = false) String startDate,
        @Parameter(description = "结束日期 YYYY-MM-DD") @RequestParam(required = false) String endDate
    ) {
        return ApiResponse.ok(costProfitService.getProfitAnalysis(gameId, startDate, endDate));
    }

    /**
     * 盈亏趋势
     */
    @Operation(summary = "盈亏趋势", description = "按天展示收入/成本/利润趋势，便于时序分析")
    @GetMapping("/profit-trend")
    public ApiResponse<List<Map<String, Object>>> profitTrend(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId,
        @Parameter(description = "开始日期 YYYY-MM-DD") @RequestParam(required = false) String startDate,
        @Parameter(description = "结束日期 YYYY-MM-DD") @RequestParam(required = false) String endDate
    ) {
        return ApiResponse.ok(costProfitService.getProfitTrend(gameId, startDate, endDate));
    }

    /**
     * 成本构成（按分类汇总）
     */
    @Operation(summary = "成本构成", description = "按成本分类汇总，展示各类成本占比")
    @GetMapping("/cost-breakdown")
    public ApiResponse<List<Map<String, Object>>> costBreakdown(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId,
        @Parameter(description = "开始日期 YYYY-MM-DD") @RequestParam(required = false) String startDate,
        @Parameter(description = "结束日期 YYYY-MM-DD") @RequestParam(required = false) String endDate
    ) {
        return ApiResponse.ok(costProfitService.getCostBreakdown(gameId, startDate, endDate));
    }
}
