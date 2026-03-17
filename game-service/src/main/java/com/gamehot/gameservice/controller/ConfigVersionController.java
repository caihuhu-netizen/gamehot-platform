package com.gamehot.gameservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.gameservice.entity.ConfigSnapshot;
import com.gamehot.gameservice.repository.ConfigSnapshotRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "ConfigVersion", description = "配置版本管理（快照/发布/回滚）")
@RestController
@RequestMapping("/api/game/configs/versions")
@RequiredArgsConstructor
public class ConfigVersionController {

    private final ConfigSnapshotRepository snapshotRepository;

    @Operation(summary = "配置快照列表")
    @GetMapping
    public ApiResponse<Map<String, Object>> list(
            @RequestParam Long gameId,
            @RequestParam(required = false) String configType,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        PageRequest pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ConfigSnapshot> pageResult;
        if (configType != null && !configType.isBlank()) {
            pageResult = snapshotRepository.findByGameIdAndConfigType(gameId, configType, pageable);
        } else {
            pageResult = snapshotRepository.findByGameId(gameId, pageable);
        }
        Map<String, Object> result = new HashMap<>();
        result.put("data", pageResult.getContent());
        result.put("total", pageResult.getTotalElements());
        result.put("page", page);
        result.put("pageSize", pageSize);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "快照详情")
    @GetMapping("/{id}")
    public ApiResponse<ConfigSnapshot> getById(@PathVariable Long id) {
        return snapshotRepository.findById(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail("快照不存在"));
    }

    @Operation(summary = "获取当前激活配置")
    @GetMapping("/active")
    public ApiResponse<ConfigSnapshot> getActive(
            @RequestParam Long gameId,
            @RequestParam String configType) {
        return snapshotRepository
                .findTopByGameIdAndConfigTypeAndStatusOrderByCreatedAtDesc(gameId, configType, "PUBLISHED")
                .map(ApiResponse::ok)
                .orElse(ApiResponse.ok(null));
    }

    @Operation(summary = "创建配置快照")
    @PostMapping
    public ApiResponse<ConfigSnapshot> createSnapshot(@RequestBody Map<String, Object> body) {
        Long gameId = body.get("gameId") instanceof Number n ? n.longValue() : null;
        String snapshotVersion = (String) body.get("snapshotVersion");
        String snapshotName = (String) body.get("snapshotName");
        String description = (String) body.get("description");
        String configType = (String) body.get("configType");

        if (gameId == null || snapshotVersion == null || snapshotName == null || configType == null) {
            return ApiResponse.fail("缺少必填参数");
        }

        // Find previous version
        Page<ConfigSnapshot> existing = snapshotRepository.findByGameIdAndConfigType(
                gameId, configType, PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "createdAt")));
        Long previousVersionId = existing.hasContent() ? existing.getContent().get(0).getId() : null;

        ConfigSnapshot snapshot = new ConfigSnapshot();
        snapshot.setGameId(gameId);
        snapshot.setSnapshotVersion(snapshotVersion);
        snapshot.setSnapshotName(snapshotName);
        snapshot.setDescription(description);
        snapshot.setConfigType(configType);
        snapshot.setConfigData(Map.of("note", "Snapshot created via API", "configType", configType));
        snapshot.setPreviousVersionId(previousVersionId);
        snapshot.setStatus("DRAFT");

        return ApiResponse.ok(snapshotRepository.save(snapshot));
    }

    @Operation(summary = "发布配置快照")
    @PostMapping("/{id}/publish")
    public ApiResponse<Map<String, Object>> publish(@PathVariable Long id) {
        return snapshotRepository.findById(id).map(snapshot -> {
            if ("PUBLISHED".equals(snapshot.getStatus())) {
                return ApiResponse.<Map<String, Object>>fail("该快照已发布");
            }
            snapshot.setStatus("PUBLISHED");
            snapshot.setPublishedAt(LocalDateTime.now());
            snapshotRepository.save(snapshot);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("snapshotId", id);
            result.put("version", snapshot.getSnapshotVersion());
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("快照不存在"));
    }

    @Operation(summary = "配置回滚")
    @PostMapping("/{id}/rollback")
    public ApiResponse<Map<String, Object>> rollback(@PathVariable Long id) {
        return snapshotRepository.findById(id).map(snapshot -> {
            // Mark this snapshot as the active published version
            // TODO: In production, actually restore the config data to live tables
            snapshot.setStatus("PUBLISHED");
            snapshot.setPublishedAt(LocalDateTime.now());
            snapshotRepository.save(snapshot);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("restoredVersion", snapshot.getSnapshotVersion());
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("快照不存在"));
    }

    @Operation(summary = "比较两个快照")
    @GetMapping("/compare")
    public ApiResponse<Map<String, Object>> compare(
            @RequestParam Long snapshotIdA,
            @RequestParam Long snapshotIdB) {
        ConfigSnapshot a = snapshotRepository.findById(snapshotIdA).orElse(null);
        ConfigSnapshot b = snapshotRepository.findById(snapshotIdB).orElse(null);
        if (a == null || b == null) {
            return ApiResponse.fail("快照不存在");
        }

        // Simple diff: compare configData as JSON string
        List<Map<String, Object>> changes = computeSimpleDiff(a.getConfigData(), b.getConfigData());

        Map<String, Object> result = new HashMap<>();
        result.put("versionA", Map.of("id", a.getId(), "version", a.getSnapshotVersion(), "name", a.getSnapshotName(), "createdAt", a.getCreatedAt()));
        result.put("versionB", Map.of("id", b.getId(), "version", b.getSnapshotVersion(), "name", b.getSnapshotName(), "createdAt", b.getCreatedAt()));
        result.put("changes", changes);
        return ApiResponse.ok(result);
    }

    private List<Map<String, Object>> computeSimpleDiff(Object dataA, Object dataB) {
        List<Map<String, Object>> changes = new ArrayList<>();
        // TODO: implement deep diff
        if (dataA != null && dataB != null) {
            if (!dataA.toString().equals(dataB.toString())) {
                Map<String, Object> change = new HashMap<>();
                change.put("type", "modified");
                change.put("section", "configData");
                changes.add(change);
            }
        }
        return changes;
    }
}
