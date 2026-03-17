package com.gamehot.opsservice.controller;

import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api")
@Tag(name = "Health", description = "健康检查")
public class HealthController {

    @GetMapping("/health")
    @Operation(summary = "服务健康检查")
    public ApiResponse<Map<String, Object>> health() {
        return ApiResponse.ok(Map.of(
                "service", "ops-service",
                "status", "UP",
                "timestamp", LocalDateTime.now().toString()
        ));
    }
}
