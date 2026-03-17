package com.gamehot.gameservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.gameservice.entity.GameServiceConfig;
import com.gamehot.gameservice.repository.GameServiceConfigRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "GameServiceConfig", description = "游戏第三方服务配置（AppFlyer/AppLovin等）")
@RestController
@RequestMapping("/api/game/service-configs")
@RequiredArgsConstructor
public class GameServiceConfigController {

    private final GameServiceConfigRepository configRepository;

    // Service type metadata
    private static final Map<String, Map<String, Object>> SERVICE_TYPE_META = Map.of(
            "APPSFLYER", Map.of("label", "AppsFlyer", "category", "attribution", "description", "移动端归因追踪服务"),
            "APPLOVIN", Map.of("label", "AppLovin MAX", "category", "ads", "description", "广告变现平台"),
            "FIREBASE", Map.of("label", "Firebase", "category", "analytics", "description", "Firebase分析与推送"),
            "ADJUST", Map.of("label", "Adjust", "category", "attribution", "description", "移动端归因服务"),
            "IRONSOURCE", Map.of("label", "IronSource", "category", "ads", "description", "IronSource广告平台")
    );

    @Operation(summary = "获取支持的服务类型列表")
    @GetMapping("/service-types")
    public ApiResponse<List<Map<String, Object>>> serviceTypes() {
        List<Map<String, Object>> types = SERVICE_TYPE_META.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> type = new HashMap<>(entry.getValue());
                    type.put("value", entry.getKey());
                    return type;
                })
                .collect(Collectors.toList());
        return ApiResponse.ok(types);
    }

    @Operation(summary = "获取游戏所有服务配置（脱敏）")
    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam Long gameId) {
        List<GameServiceConfig> configs = configRepository.findByGameId(gameId);
        List<Map<String, Object>> masked = configs.stream()
                .map(this::maskConfig)
                .collect(Collectors.toList());
        return ApiResponse.ok(masked);
    }

    @Operation(summary = "获取单个配置详情（脱敏）")
    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> getById(@PathVariable Long id) {
        return configRepository.findById(id)
                .map(c -> ApiResponse.ok(maskConfig(c)))
                .orElse(ApiResponse.fail("配置不存在"));
    }

    @Operation(summary = "创建服务配置")
    @PostMapping
    public ApiResponse<Map<String, Object>> create(@RequestBody GameServiceConfig body, Authentication auth) {
        // Check if same type config already exists
        if (configRepository.findByGameIdAndServiceType(body.getGameId(), body.getServiceType()).isPresent()) {
            String label = SERVICE_TYPE_META.containsKey(body.getServiceType())
                    ? (String) SERVICE_TYPE_META.get(body.getServiceType()).get("label")
                    : body.getServiceType();
            return ApiResponse.fail("该游戏已存在 " + label + " 配置，请编辑现有配置");
        }
        if (auth != null) {
            // Extract user id from authentication if available
            try {
                body.setCreatedBy(Long.parseLong(auth.getName()));
            } catch (NumberFormatException ignored) {
            }
        }
        GameServiceConfig saved = configRepository.save(body);
        Map<String, Object> result = new HashMap<>();
        result.put("id", saved.getId());
        return ApiResponse.ok(result);
    }

    @Operation(summary = "更新服务配置")
    @PutMapping("/{id}")
    public ApiResponse<Map<String, Object>> update(@PathVariable Long id, @RequestBody GameServiceConfig body) {
        return configRepository.findById(id).map(existing -> {
            if (body.getServiceName() != null) existing.setServiceName(body.getServiceName());
            if (body.getAppId() != null) existing.setAppId(body.getAppId());
            if (body.getAppName() != null) existing.setAppName(body.getAppName());
            if (body.getApiKey() != null) existing.setApiKey(body.getApiKey());
            if (body.getApiSecret() != null) existing.setApiSecret(body.getApiSecret());
            if (body.getExtraConfig() != null) existing.setExtraConfig(body.getExtraConfig());
            if (body.getStatus() != null) existing.setStatus(body.getStatus());
            configRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("配置不存在"));
    }

    @Operation(summary = "删除服务配置")
    @DeleteMapping("/{id}")
    public ApiResponse<Map<String, Object>> delete(@PathVariable Long id) {
        if (!configRepository.existsById(id)) return ApiResponse.fail("配置不存在");
        configRepository.deleteById(id);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "验证服务配置连接")
    @PostMapping("/{id}/verify")
    public ApiResponse<Map<String, Object>> verify(@PathVariable Long id) {
        return configRepository.findById(id).map(config -> {
            Map<String, Object> verifyResult = new HashMap<>();
            verifyResult.put("success", false);
            verifyResult.put("message", "暂不支持该服务类型的连接验证");

            // TODO: implement actual API verification calls for each service type
            if ("APPSFLYER".equals(config.getServiceType())) {
                if (config.getApiKey() == null || config.getAppId() == null) {
                    verifyResult.put("message", "API Key 或 App ID 未配置");
                } else {
                    // TODO: call AppsFlyer API to validate
                    verifyResult.put("message", "AppsFlyer 验证功能开发中");
                }
            } else if ("APPLOVIN".equals(config.getServiceType())) {
                if (config.getApiKey() == null) {
                    verifyResult.put("message", "Report Key 未配置");
                } else {
                    // TODO: call AppLovin API to validate
                    verifyResult.put("message", "AppLovin 验证功能开发中");
                }
            }

            config.setLastVerifiedAt(LocalDateTime.now());
            config.setLastVerifiedStatus((Boolean) verifyResult.get("success") ? "SUCCESS" : "FAILED");
            config.setLastVerifiedMessage((String) verifyResult.get("message"));
            configRepository.save(config);

            return ApiResponse.ok(verifyResult);
        }).orElse(ApiResponse.fail("配置不存在"));
    }

    @Operation(summary = "获取指定服务类型的配置状态")
    @GetMapping("/status")
    public ApiResponse<Map<String, Object>> getConfigStatus(
            @RequestParam Long gameId,
            @RequestParam String serviceType) {
        return configRepository.findByGameIdAndServiceType(gameId, serviceType).map(config -> {
            Map<String, Object> result = new HashMap<>();
            result.put("configured", true);
            result.put("status", config.getStatus());
            if (config.getLastVerifiedAt() != null) {
                result.put("lastVerified", Map.of(
                        "at", config.getLastVerifiedAt(),
                        "status", config.getLastVerifiedStatus(),
                        "message", config.getLastVerifiedMessage()
                ));
            } else {
                result.put("lastVerified", null);
            }
            return ApiResponse.ok(result);
        }).orElseGet(() -> {
            Map<String, Object> result = new HashMap<>();
            result.put("configured", false);
            result.put("status", null);
            result.put("lastVerified", null);
            return ApiResponse.ok(result);
        });
    }

    private Map<String, Object> maskConfig(GameServiceConfig config) {
        Map<String, Object> masked = new HashMap<>();
        masked.put("id", config.getId());
        masked.put("gameId", config.getGameId());
        masked.put("serviceType", config.getServiceType());
        masked.put("serviceName", config.getServiceName());
        masked.put("appId", config.getAppId());
        masked.put("appName", config.getAppName());
        masked.put("apiKey", maskKey(config.getApiKey()));
        masked.put("apiSecret", maskKey(config.getApiSecret()));
        masked.put("extraConfig", config.getExtraConfig());
        masked.put("status", config.getStatus());
        masked.put("lastVerifiedAt", config.getLastVerifiedAt());
        masked.put("lastVerifiedStatus", config.getLastVerifiedStatus());
        masked.put("lastVerifiedMessage", config.getLastVerifiedMessage());
        masked.put("createdAt", config.getCreatedAt());
        return masked;
    }

    private String maskKey(String key) {
        if (key == null || key.length() <= 8) return key;
        return key.substring(0, 4) + "****" + key.substring(key.length() - 4);
    }
}
