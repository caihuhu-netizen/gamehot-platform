package com.gamehot.dataservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.dataservice.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Dashboard Controller - 仪表盘数据接口
 * 基路径: /api/data/dashboard
 */
@Tag(name = "Dashboard", description = "仪表盘综合数据接口")
@RestController
@RequestMapping("/api/data/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * 综合概览（DAU/收入/留存/LTV）
     * 支持 gameId + 日期范围，单次请求返回全量 dashboard 数据
     */
    @Operation(summary = "综合概览", description = "一次性返回 stats/timeline/enhanced/profit/report/alert 全量数据")
    @GetMapping("/overview")
    public ApiResponse<Map<String, Object>> overview(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId,
        @Parameter(description = "开始日期 YYYY-MM-DD") @RequestParam(required = false) String startDate,
        @Parameter(description = "结束日期 YYYY-MM-DD") @RequestParam(required = false) String endDate
    ) {
        return ApiResponse.ok(dashboardService.getOverview(gameId, startDate, endDate));
    }

    /**
     * 核心指标统计
     */
    @Operation(summary = "核心指标统计", description = "返回分层分布、总用户数、总收入、运行实验数、活跃规则数")
    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> stats(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId,
        @Parameter(description = "开始日期 YYYY-MM-DD") @RequestParam(required = false) String startDate,
        @Parameter(description = "结束日期 YYYY-MM-DD") @RequestParam(required = false) String endDate
    ) {
        return ApiResponse.ok(dashboardService.getDashboardStats(gameId, startDate, endDate));
    }

    /**
     * 收入时序图
     */
    @Operation(summary = "收入时序图", description = "返回按天聚合的收入、付费次数、广告观看等时序数据")
    @GetMapping("/revenue-timeline")
    public ApiResponse<List<Map<String, Object>>> revenueTimeline(
        @Parameter(description = "天数，默认30") @RequestParam(defaultValue = "30") int days,
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId,
        @Parameter(description = "开始日期 YYYY-MM-DD") @RequestParam(required = false) String startDate,
        @Parameter(description = "结束日期 YYYY-MM-DD") @RequestParam(required = false) String endDate
    ) {
        return ApiResponse.ok(dashboardService.getRevenueTimeline(days, gameId, startDate, endDate));
    }

    /**
     * 审批看板统计
     */
    @Operation(summary = "审批看板统计", description = "返回待审批/已审批/已拒绝等状态分布")
    @GetMapping("/approval-dashboard")
    public ApiResponse<Object> approvalDashboard(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(dashboardService.getApprovalDashboardStats(gameId));
    }
}
