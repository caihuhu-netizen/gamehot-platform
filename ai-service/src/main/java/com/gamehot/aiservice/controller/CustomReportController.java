package com.gamehot.aiservice.controller;

import com.gamehot.aiservice.dto.CreateReportRequest;
import com.gamehot.aiservice.entity.CustomReport;
import com.gamehot.aiservice.repository.CustomReportRepository;
import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Tag(name = "自定义报表", description = "自定义报表相关接口")
@RestController
@RequestMapping("/api/ai/reports")
@RequiredArgsConstructor
public class CustomReportController {

    private final CustomReportRepository customReportRepository;

    @Operation(summary = "获取报表列表")
    @GetMapping
    public ApiResponse<List<CustomReport>> list(
            @RequestParam(required = false) Long gameId, Authentication auth) {
        if (gameId != null) {
            return ApiResponse.ok(customReportRepository.findAccessible(gameId, auth.getName()));
        }
        return ApiResponse.ok(customReportRepository.findByCreatedBy(auth.getName()));
    }

    @Operation(summary = "获取报表详情")
    @GetMapping("/{id}")
    public ApiResponse<CustomReport> getById(@PathVariable Long id) {
        return customReportRepository.findById(id)
            .map(ApiResponse::ok)
            .orElse(ApiResponse.fail(404, "报表不存在"));
    }

    @Operation(summary = "创建报表")
    @PostMapping
    public ApiResponse<CustomReport> create(@RequestBody CreateReportRequest req, Authentication auth) {
        CustomReport report = new CustomReport();
        report.setName(req.getName());
        report.setDescription(req.getDescription());
        report.setChartType(req.getChartType());
        report.setMetrics(req.getMetrics());
        report.setDimensions(req.getDimensions());
        report.setFilters(req.getFilters());
        report.setDateRange(req.getDateRange());
        report.setSortBy(req.getSortBy());
        report.setSortOrder(req.getSortOrder());
        report.setIsPublic(req.getIsPublic() != null ? req.getIsPublic() : 0);
        report.setGameId(req.getGameId());
        report.setCreatedBy(auth.getName());
        return ApiResponse.ok(customReportRepository.save(report));
    }

    @Operation(summary = "更新报表")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return customReportRepository.findById(id).map(report -> {
            if (body.containsKey("name")) report.setName((String) body.get("name"));
            if (body.containsKey("description")) report.setDescription((String) body.get("description"));
            if (body.containsKey("chartType")) report.setChartType((String) body.get("chartType"));
            if (body.containsKey("dateRange")) report.setDateRange((String) body.get("dateRange"));
            if (body.containsKey("sortBy")) report.setSortBy((String) body.get("sortBy"));
            if (body.containsKey("sortOrder")) report.setSortOrder((String) body.get("sortOrder"));
            if (body.containsKey("isPublic")) report.setIsPublic((Integer) body.get("isPublic"));
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> metrics = (List<Map<String, Object>>) body.get("metrics");
            if (metrics != null) report.setMetrics(metrics);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> dimensions = (List<Map<String, Object>>) body.get("dimensions");
            if (dimensions != null) report.setDimensions(dimensions);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> filters = (List<Map<String, Object>>) body.get("filters");
            if (filters != null) report.setFilters(filters);
            customReportRepository.save(report);
            return ApiResponse.<Void>ok();
        }).orElse(ApiResponse.fail(404, "报表不存在"));
    }

    @Operation(summary = "删除报表")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        customReportRepository.deleteById(id);
        return ApiResponse.ok();
    }

    @Operation(summary = "执行/预览报表")
    @PostMapping("/{id}/execute")
    public ApiResponse<Map<String, Object>> execute(@PathVariable Long id) {
        return customReportRepository.findById(id).map(report -> {
            // TODO: 接入真实查询引擎
            // 当前返回 mock 数据
            List<Map<String, Object>> mockData = new ArrayList<>();
            for (int i = 1; i <= 5; i++) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("date", "2026-03-" + String.format("%02d", i));
                row.put("value", (long)(Math.random() * 10000));
                mockData.add(row);
            }
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("reportId", id);
            result.put("reportName", report.getName());
            result.put("data", mockData);
            result.put("total", mockData.size());
            result.put("executedAt", new java.util.Date());
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail(404, "报表不存在"));
    }

    @Operation(summary = "导出报表")
    @PostMapping("/{id}/export")
    public ApiResponse<Map<String, Object>> export(@PathVariable Long id,
            @RequestParam(defaultValue = "csv") String format) {
        return customReportRepository.findById(id).map(report -> {
            // TODO: 接入真实导出逻辑
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("reportId", id);
            result.put("format", format);
            result.put("downloadUrl", "/api/ai/reports/" + id + "/download?format=" + format);
            result.put("message", "报表导出任务已创建");
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail(404, "报表不存在"));
    }
}
