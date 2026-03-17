package com.gamehot.aiservice.controller;

import com.gamehot.aiservice.entity.AuditLog;
import com.gamehot.aiservice.repository.AuditLogRepository;
import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Tag(name = "审计日志", description = "操作审计日志相关接口")
@RestController
@RequestMapping("/api/ai/audit")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    @Operation(summary = "获取审计日志列表")
    @GetMapping
    public ApiResponse<Page<AuditLog>> list(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String resource,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Authentication auth) {

        // 检查管理员权限
        boolean isAdmin = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin) {
            return ApiResponse.forbidden();
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        LocalDateTime start = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime end = endDate != null ? endDate.plusDays(1).atStartOfDay() : null;

        Page<AuditLog> result = auditLogRepository.search(
            userId, action, resource, status, module, start, end, keyword, pageable
        );
        return ApiResponse.ok(result);
    }

    @Operation(summary = "获取审计日志统计")
    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> stats(
            @RequestParam(defaultValue = "7") int days, Authentication auth) {
        boolean isAdmin = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin) {
            return ApiResponse.forbidden();
        }

        LocalDateTime since = LocalDateTime.now().minusDays(days);
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalLogs", auditLogRepository.countByCreatedAtAfter(since));
        stats.put("successLogs", auditLogRepository.countByCreatedAtAfterAndStatus(since, "success"));
        stats.put("failureLogs", auditLogRepository.countByCreatedAtAfterAndStatus(since, "failure"));
        stats.put("days", days);
        return ApiResponse.ok(stats);
    }

    @Operation(summary = "记录审计日志（内部接口）")
    @PostMapping
    public ApiResponse<AuditLog> create(@RequestBody AuditLog log) {
        return ApiResponse.ok(auditLogRepository.save(log));
    }
}
