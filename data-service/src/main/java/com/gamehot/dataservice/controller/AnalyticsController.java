package com.gamehot.dataservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.dataservice.dto.CohortLtvDTO;
import com.gamehot.dataservice.dto.CohortRetentionDTO;
import com.gamehot.dataservice.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Analytics Controller - 数据分析接口
 * 基路径: /api/data/analytics
 */
@Tag(name = "Analytics", description = "数据分析接口：Cohort留存/LTV/生命周期/洞察/KPI下钻/异常检测")
@RestController
@RequestMapping("/api/data/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * 付费 vs 非付费用户对比
     */
    @Operation(summary = "付费用户对比", description = "对比付费用户与非付费用户的关键行为指标")
    @GetMapping("/paying-comparison")
    public ApiResponse<Object> payingComparison(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(analyticsService.getPayingComparison(gameId));
    }

    /**
     * 留存对比
     */
    @Operation(summary = "留存对比", description = "对比不同分组用户的D1/D3/D7/D14/D30留存率")
    @GetMapping("/retention-comparison")
    public ApiResponse<Object> retentionComparison(
        @Parameter(description = "天数窗口，默认7") @RequestParam(defaultValue = "7") int days,
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(analyticsService.getRetentionComparison(days));
    }

    /**
     * 付费路径漏斗
     */
    @Operation(summary = "付费路径漏斗", description = "展示用户从注册到付费的转化漏斗数据")
    @GetMapping("/payment-funnel")
    public ApiResponse<Object> paymentFunnel(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(analyticsService.getPaymentFunnel());
    }

    /**
     * Cohort 留存矩阵
     */
    @Operation(summary = "Cohort留存矩阵", description = "按安装日期的队列留存分析，支持日期范围和地区筛选")
    @GetMapping("/cohort-retention")
    public ApiResponse<List<CohortRetentionDTO>> cohortRetention(
        @Parameter(description = "开始日期 YYYY-MM-DD") @RequestParam(required = false) String startDate,
        @Parameter(description = "结束日期 YYYY-MM-DD") @RequestParam(required = false) String endDate,
        @Parameter(description = "地区代码") @RequestParam(required = false) String region,
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(analyticsService.getCohortRetention(startDate, endDate, region));
    }

    /**
     * Cohort LTV 分析
     */
    @Operation(summary = "Cohort LTV分析", description = "按安装日期的队列LTV（生命周期价值）分析")
    @GetMapping("/cohort-ltv")
    public ApiResponse<List<CohortLtvDTO>> cohortLtv(
        @Parameter(description = "开始日期 YYYY-MM-DD") @RequestParam(required = false) String startDate,
        @Parameter(description = "结束日期 YYYY-MM-DD") @RequestParam(required = false) String endDate,
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(analyticsService.getCohortLtv(startDate, endDate));
    }

    /**
     * 用户生命周期阶段分布
     */
    @Operation(summary = "生命周期阶段分布", description = "展示用户在各生命周期阶段的分布及漏斗数据")
    @GetMapping("/lifecycle-stages")
    public ApiResponse<Object> lifecycleStages(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(analyticsService.getLifecycleStages());
    }

    /**
     * 按分群的生命周期
     */
    @Operation(summary = "按分群的生命周期", description = "展示各用户分群（L1-L5）在不同生命周期阶段的分布")
    @GetMapping("/lifecycle-by-segment")
    public ApiResponse<Object> lifecycleBySegment(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(analyticsService.getLifecycleBySegment());
    }

    /**
     * 智能运营建议
     */
    @Operation(summary = "智能运营建议", description = "基于多维度数据自动生成运营优化建议，按严重程度排序")
    @GetMapping("/product-insights")
    public ApiResponse<List<Map<String, Object>>> productInsights(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(analyticsService.getProductInsights());
    }

    /**
     * KPI 下钻分析
     */
    @Operation(summary = "KPI下钻", description = "对指定KPI指标进行多维下钻分析，支持 revenue/users/arpu/experiments")
    @GetMapping("/kpi-drill-down")
    public ApiResponse<Object> kpiDrillDown(
        @Parameter(description = "KPI类型: revenue|users|arpu|experiments") @RequestParam String kpiType,
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(analyticsService.getKpiDrillDown(kpiType));
    }

    /**
     * 异常检测
     */
    @Operation(summary = "KPI异常检测", description = "自动检测收入/DAU/付费率等核心KPI的异常波动")
    @GetMapping("/detect-anomalies")
    public ApiResponse<List<Map<String, Object>>> detectAnomalies(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(analyticsService.detectAnomalies());
    }

    /**
     * 关卡级洞察
     */
    @Operation(summary = "关卡级洞察", description = "分析各关卡的通过率、尝试次数、变现触发效果等")
    @GetMapping("/level-insights")
    public ApiResponse<Object> levelInsights(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(analyticsService.getLevelInsights());
    }
}
