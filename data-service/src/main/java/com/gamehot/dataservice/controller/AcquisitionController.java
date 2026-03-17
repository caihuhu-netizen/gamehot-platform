package com.gamehot.dataservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.dataservice.dto.CreateChannelRequest;
import com.gamehot.dataservice.dto.CreateCostRequest;
import com.gamehot.dataservice.dto.UpdateChannelRequest;
import com.gamehot.dataservice.model.AcquisitionChannel;
import com.gamehot.dataservice.model.AcquisitionCost;
import com.gamehot.dataservice.service.AcquisitionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Acquisition Controller - 获客渠道管理接口
 * 基路径: /api/data/acquisition
 */
@Tag(name = "Acquisition", description = "获客渠道管理与ROI分析接口")
@RestController
@RequestMapping("/api/data/acquisition")
@RequiredArgsConstructor
public class AcquisitionController {

    private final AcquisitionService acquisitionService;

    // ==================== 渠道管理 ====================

    /**
     * 渠道列表
     */
    @Operation(summary = "渠道列表", description = "获取所有获客渠道列表，支持按游戏ID过滤")
    @GetMapping("/channels")
    public ApiResponse<List<AcquisitionChannel>> listChannels(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId
    ) {
        return ApiResponse.ok(acquisitionService.listChannels(gameId));
    }

    /**
     * 创建渠道
     */
    @Operation(summary = "创建渠道", description = "创建新的获客渠道，支持 PAID/ORGANIC/REFERRAL/SOCIAL/DIRECT 类型")
    @PostMapping("/channels")
    public ApiResponse<Map<String, Object>> createChannel(@RequestBody CreateChannelRequest req) {
        return ApiResponse.ok(acquisitionService.createChannel(req));
    }

    /**
     * 更新渠道
     */
    @Operation(summary = "更新渠道", description = "更新获客渠道信息，支持部分更新")
    @PutMapping("/channels/{id}")
    public ApiResponse<Map<String, Object>> updateChannel(
        @Parameter(description = "渠道ID") @PathVariable Long id,
        @RequestBody UpdateChannelRequest req
    ) {
        return ApiResponse.ok(acquisitionService.updateChannel(id, req));
    }

    /**
     * 删除渠道（软删除）
     */
    @Operation(summary = "删除渠道", description = "软删除获客渠道（将 deleted 标记为1）")
    @DeleteMapping("/channels/{id}")
    public ApiResponse<Map<String, Object>> deleteChannel(
        @Parameter(description = "渠道ID") @PathVariable Long id
    ) {
        return ApiResponse.ok(acquisitionService.deleteChannel(id));
    }

    // ==================== 获客成本 ====================

    /**
     * 获客成本列表
     */
    @Operation(summary = "获客成本列表", description = "查询获客成本记录，支持按渠道/游戏/日期过滤")
    @GetMapping("/costs")
    public ApiResponse<List<AcquisitionCost>> listCosts(
        @Parameter(description = "渠道ID") @RequestParam(required = false) Long channelId,
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId,
        @Parameter(description = "开始日期 YYYY-MM-DD") @RequestParam(required = false) String startDate,
        @Parameter(description = "结束日期 YYYY-MM-DD") @RequestParam(required = false) String endDate
    ) {
        return ApiResponse.ok(acquisitionService.listCosts(channelId, gameId, startDate, endDate));
    }

    /**
     * 录入成本
     */
    @Operation(summary = "录入获客成本", description = "录入单条获客成本记录，包含花费/展示/点击/安装数据")
    @PostMapping("/costs")
    public ApiResponse<Map<String, Object>> createCost(@RequestBody CreateCostRequest req) {
        return ApiResponse.ok(acquisitionService.createCost(req));
    }

    // ==================== ROI 分析 ====================

    /**
     * 渠道 ROI 分析
     */
    @Operation(summary = "渠道ROI分析", description = "分析各渠道的ROI/ROAS/CPI/LTV/留存率等核心指标")
    @GetMapping("/roi")
    public ApiResponse<List<Map<String, Object>>> getROI(
        @Parameter(description = "游戏ID") @RequestParam(required = false) Integer gameId,
        @Parameter(description = "开始日期 YYYY-MM-DD") @RequestParam(required = false) String startDate,
        @Parameter(description = "结束日期 YYYY-MM-DD") @RequestParam(required = false) String endDate
    ) {
        return ApiResponse.ok(acquisitionService.getROI(gameId, startDate, endDate));
    }
}
