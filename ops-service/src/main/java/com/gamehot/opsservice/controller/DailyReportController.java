package com.gamehot.opsservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.opsservice.model.DailyReport;
import com.gamehot.opsservice.service.DailyReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ops/daily-report")
@RequiredArgsConstructor
@Tag(name = "DailyReport", description = "运营日报管理")
public class DailyReportController {

    private final DailyReportService dailyReportService;

    @GetMapping
    @Operation(summary = "日报列表")
    public ApiResponse<List<DailyReport>> listReports(
            @RequestParam(required = false) Integer gameId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Integer limit) {
        return ApiResponse.ok(dailyReportService.listReports(gameId, startDate, endDate, limit));
    }

    @GetMapping("/{id}")
    @Operation(summary = "日报详情")
    public ApiResponse<DailyReport> getReport(@PathVariable Long id) {
        return dailyReportService.getReport(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail(404, "Daily report not found"));
    }

    @PostMapping("/generate")
    @Operation(summary = "触发生成日报（异步）")
    public ApiResponse<Map<String, Object>> generateReport(
            @RequestParam(required = false) String reportDate,
            @RequestParam(required = false) Integer gameId) {
        return ApiResponse.ok(dailyReportService.generateReport(reportDate, gameId));
    }

    @PostMapping("/{id}/send-notification")
    @Operation(summary = "发送日报通知（飞书）")
    public ApiResponse<Map<String, Object>> sendNotification(@PathVariable Long id) {
        return ApiResponse.ok(dailyReportService.sendNotification(id));
    }
}
