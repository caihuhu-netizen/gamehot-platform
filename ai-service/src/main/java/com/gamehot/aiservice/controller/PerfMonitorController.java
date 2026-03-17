package com.gamehot.aiservice.controller;

import com.gamehot.aiservice.entity.PerfSnapshot;
import com.gamehot.aiservice.repository.PerfSnapshotRepository;
import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.time.LocalDateTime;
import java.util.*;

@Tag(name = "性能监控", description = "系统性能监控相关接口")
@RestController
@RequestMapping("/api/ai/perf")
@RequiredArgsConstructor
public class PerfMonitorController {

    private final PerfSnapshotRepository perfSnapshotRepository;

    @Operation(summary = "获取实时性能指标")
    @GetMapping("/realtime")
    public ApiResponse<Map<String, Object>> realtimeStats() {
        MemoryMXBean memBean = ManagementFactory.getMemoryMXBean();
        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();

        long heapUsed = memBean.getHeapMemoryUsage().getUsed();
        long heapTotal = memBean.getHeapMemoryUsage().getCommitted();
        long heapMax = memBean.getHeapMemoryUsage().getMax();
        long nonHeap = memBean.getNonHeapMemoryUsage().getUsed();
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();

        Map<String, Object> memory = new LinkedHashMap<>();
        memory.put("heapUsedMb", Math.round(heapUsed / 1024.0 / 1024.0 * 100.0) / 100.0);
        memory.put("heapTotalMb", Math.round(heapTotal / 1024.0 / 1024.0 * 100.0) / 100.0);
        memory.put("heapMaxMb", Math.round(heapMax / 1024.0 / 1024.0 * 100.0) / 100.0);
        memory.put("nonHeapMb", Math.round(nonHeap / 1024.0 / 1024.0 * 100.0) / 100.0);
        memory.put("utilizationPercent", (int) Math.round((double) heapUsed / heapTotal * 100));

        Map<String, Object> uptime = new LinkedHashMap<>();
        uptime.put("milliseconds", uptimeMs);
        uptime.put("formatted", formatUptime(uptimeMs / 1000));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("memory", memory);
        result.put("uptime", uptime);
        result.put("availableProcessors", Runtime.getRuntime().availableProcessors());
        result.put("systemLoadAverage", osBean.getSystemLoadAverage());
        result.put("timestamp", System.currentTimeMillis());
        result.put("serviceStatus", "UP");
        return ApiResponse.ok(result);
    }

    @Operation(summary = "获取性能快照历史")
    @GetMapping("/snapshots")
    public ApiResponse<List<PerfSnapshot>> snapshotHistory(
            @RequestParam(defaultValue = "24") int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return ApiResponse.ok(perfSnapshotRepository.findByCreatedAtAfterOrderByCreatedAtAsc(since));
    }

    @Operation(summary = "获取最新性能快照")
    @GetMapping("/snapshots/latest")
    public ApiResponse<PerfSnapshot> latestSnapshot() {
        return perfSnapshotRepository.findTopByOrderByCreatedAtDesc()
            .map(ApiResponse::ok)
            .orElse(ApiResponse.fail(404, "暂无快照数据"));
    }

    @Operation(summary = "保存性能快照")
    @PostMapping("/snapshots")
    public ApiResponse<Map<String, Object>> saveSnapshot() {
        MemoryMXBean memBean = ManagementFactory.getMemoryMXBean();
        long heapUsed = memBean.getHeapMemoryUsage().getUsed();
        long heapTotal = memBean.getHeapMemoryUsage().getCommitted();

        PerfSnapshot snapshot = new PerfSnapshot();
        snapshot.setHeapUsedMb(Math.round(heapUsed / 1024.0 / 1024.0 * 100.0) / 100.0);
        snapshot.setHeapTotalMb(Math.round(heapTotal / 1024.0 / 1024.0 * 100.0) / 100.0);
        perfSnapshotRepository.save(snapshot);
        return ApiResponse.ok(Map.of("success", true, "savedAt", LocalDateTime.now().toString()));
    }

    @Operation(summary = "服务健康状态")
    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        Map<String, Object> health = new LinkedHashMap<>();
        health.put("status", "UP");
        health.put("service", "ai-service");
        health.put("version", "1.0.0");
        health.put("timestamp", System.currentTimeMillis());
        return ApiResponse.ok(health);
    }

    @Operation(summary = "慢查询日志（mock）")
    @GetMapping("/slow-queries")
    public ApiResponse<Map<String, Object>> slowQueries() {
        // TODO: 接入真实慢查询监控
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalQueries", 1250L);
        result.put("avgDurationMs", 45.2);
        result.put("slowQueryThresholdMs", 500);
        result.put("slowQueries", Collections.emptyList());
        result.put("note", "mock数据，TODO: 接入真实查询监控");
        return ApiResponse.ok(result);
    }

    private String formatUptime(long seconds) {
        long days = seconds / 86400;
        long hours = (seconds % 86400) / 3600;
        long mins = (seconds % 3600) / 60;
        long secs = seconds % 60;
        List<String> parts = new ArrayList<>();
        if (days > 0) parts.add(days + "天");
        if (hours > 0) parts.add(hours + "小时");
        if (mins > 0) parts.add(mins + "分");
        parts.add(secs + "秒");
        return String.join("", parts);
    }
}
