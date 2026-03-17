package com.gamehot.gameservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.gameservice.entity.GameProject;
import com.gamehot.gameservice.repository.GameProjectRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "GameProject", description = "游戏项目管理")
@RestController
@RequestMapping("/api/game/projects")
@RequiredArgsConstructor
public class GameProjectController {

    private final GameProjectRepository gameProjectRepository;

    @Operation(summary = "获取游戏项目列表")
    @GetMapping
    public ApiResponse<List<GameProject>> list() {
        List<GameProject> projects = gameProjectRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        return ApiResponse.ok(projects);
    }

    @Operation(summary = "获取游戏项目详情")
    @GetMapping("/{id}")
    public ApiResponse<GameProject> getById(@PathVariable Long id) {
        return gameProjectRepository.findById(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail("游戏项目不存在"));
    }

    @Operation(summary = "创建游戏项目")
    @PostMapping
    public ApiResponse<GameProject> create(@RequestBody GameProject body) {
        String sdkApiKey = "gk_" + body.getGameCode() + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String sdkSecret = "gs_" + body.getGameCode() + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 24);
        body.setSdkApiKey(sdkApiKey);
        body.setSdkSecret(sdkSecret);
        GameProject saved = gameProjectRepository.save(body);
        return ApiResponse.ok(saved);
    }

    @Operation(summary = "更新游戏项目")
    @PutMapping("/{id}")
    public ApiResponse<GameProject> update(@PathVariable Long id, @RequestBody GameProject body) {
        return gameProjectRepository.findById(id).map(existing -> {
            if (body.getGameName() != null) existing.setGameName(body.getGameName());
            if (body.getGameIcon() != null) existing.setGameIcon(body.getGameIcon());
            if (body.getGenre() != null) existing.setGenre(body.getGenre());
            if (body.getPlatform() != null) existing.setPlatform(body.getPlatform());
            if (body.getBundleId() != null) existing.setBundleId(body.getBundleId());
            if (body.getStoreUrl() != null) existing.setStoreUrl(body.getStoreUrl());
            if (body.getTimezone() != null) existing.setTimezone(body.getTimezone());
            if (body.getStatus() != null) existing.setStatus(body.getStatus());
            if (body.getSettings() != null) existing.setSettings(body.getSettings());
            return ApiResponse.ok(gameProjectRepository.save(existing));
        }).orElse(ApiResponse.fail("游戏项目不存在"));
    }

    @Operation(summary = "删除游戏项目")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        if (!gameProjectRepository.existsById(id)) {
            return ApiResponse.fail("游戏项目不存在");
        }
        gameProjectRepository.deleteById(id);
        return ApiResponse.ok();
    }

    @Operation(summary = "重新生成 SDK Key")
    @PostMapping("/{id}/regenerate-keys")
    public ApiResponse<Map<String, String>> regenerateKeys(@PathVariable Long id) {
        return gameProjectRepository.findById(id).map(game -> {
            String sdkApiKey = "gk_" + game.getGameCode() + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
            String sdkSecret = "gs_" + game.getGameCode() + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 24);
            game.setSdkApiKey(sdkApiKey);
            game.setSdkSecret(sdkSecret);
            gameProjectRepository.save(game);
            Map<String, String> result = new HashMap<>();
            result.put("sdkApiKey", sdkApiKey);
            result.put("sdkSecret", sdkSecret);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("游戏项目不存在"));
    }

    @Operation(summary = "SDK 访问日志（mock）")
    @GetMapping("/{gameId}/access-logs")
    public ApiResponse<Map<String, Object>> accessLogs(
            @PathVariable Long gameId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int pageSize) {
        // TODO: implement real SDK access log tracking
        Map<String, Object> result = new HashMap<>();
        result.put("data", List.of());
        result.put("total", 0);
        result.put("page", page);
        result.put("pageSize", pageSize);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "SDK 访问统计（mock）")
    @GetMapping("/{gameId}/access-stats")
    public ApiResponse<Map<String, Object>> accessStats(@PathVariable Long gameId) {
        // TODO: implement real SDK access stats
        Map<String, Object> result = new HashMap<>();
        result.put("totalRequests", 0);
        result.put("todayRequests", 0);
        result.put("activeDevices", 0);
        return ApiResponse.ok(result);
    }
}
