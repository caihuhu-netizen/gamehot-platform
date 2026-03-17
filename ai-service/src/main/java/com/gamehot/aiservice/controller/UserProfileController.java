package com.gamehot.aiservice.controller;

import com.gamehot.aiservice.entity.UserProfile;
import com.gamehot.aiservice.repository.UserProfileRepository;
import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@Tag(name = "用户画像", description = "用户画像相关接口")
@RestController
@RequestMapping("/api/ai/user-profiles")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileRepository userProfileRepository;
    private final JdbcTemplate jdbc;

    @Operation(summary = "获取用户画像列表")
    @GetMapping
    public ApiResponse<Page<UserProfile>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long gameId,
            @RequestParam(required = false) String segmentLevel) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<UserProfile> result;
        if (search != null) {
            result = userProfileRepository.search(search, pageable);
        } else if (segmentLevel != null) {
            result = userProfileRepository.findBySegmentLevel(segmentLevel, pageable);
        } else if (gameId != null) {
            result = userProfileRepository.findByGameId(gameId, pageable);
        } else {
            result = userProfileRepository.findAll(pageable);
        }
        return ApiResponse.ok(result);
    }

    /**
     * 分群用户列表（从 user_segments 表查询，含分层分数字段）
     * 前端 Segments.tsx 通过 userProfiles.listSegments 调用
     * 期望字段：id, userId, segmentLevel, payScore, adScore, skillScore, churnRisk,
     *           confidence, probeCompletedCount, isInRecovery
     */
    @Operation(summary = "获取分群用户列表（含分层分数）")
    @GetMapping("/list-segments")
    public ApiResponse<Map<String, Object>> listSegments(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) Long gameId,
            @RequestParam(required = false) String segmentLevel) {
        int offset = (page - 1) * pageSize;
        StringBuilder sql = new StringBuilder(
            "SELECT id, user_id, segment_level, pay_score, ad_score, skill_score, churn_risk, " +
            "confidence, probe_completed_count, is_in_recovery, game_id " +
            "FROM user_segments WHERE deleted = 0");
        StringBuilder countSql = new StringBuilder(
            "SELECT COUNT(*) FROM user_segments WHERE deleted = 0");
        if (gameId != null) {
            sql.append(" AND game_id = ").append(gameId);
            countSql.append(" AND game_id = ").append(gameId);
        }
        if (segmentLevel != null && !segmentLevel.isBlank()) {
            sql.append(" AND segment_level = '").append(segmentLevel.replace("'", "")).append("'");
            countSql.append(" AND segment_level = '").append(segmentLevel.replace("'", "")).append("'");
        }
        sql.append(" ORDER BY churn_risk DESC LIMIT ").append(pageSize).append(" OFFSET ").append(offset);

        List<Map<String, Object>> rawRows;
        long total = 0;
        try {
            rawRows = jdbc.queryForList(sql.toString());
            Long cnt = jdbc.queryForObject(countSql.toString(), Long.class);
            total = cnt != null ? cnt : 0;
        } catch (Exception e) {
            rawRows = List.of();
        }
        List<Map<String, Object>> items = rawRows.stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", row.get("id"));
            m.put("userId", row.get("user_id"));
            m.put("segmentLevel", row.get("segment_level"));
            m.put("payScore", row.get("pay_score"));
            m.put("adScore", row.get("ad_score"));
            m.put("skillScore", row.get("skill_score"));
            m.put("churnRisk", row.get("churn_risk"));
            m.put("confidence", row.get("confidence"));
            m.put("probeCompletedCount", row.get("probe_completed_count"));
            m.put("isInRecovery", row.get("is_in_recovery"));
            m.put("gameId", row.get("game_id"));
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        result.put("total", total);
        result.put("page", page);
        result.put("pageSize", pageSize);
        result.put("totalPages", (int) Math.ceil((double) total / pageSize));
        return ApiResponse.ok(result);
    }

    @Operation(summary = "获取用户画像详情")
    @GetMapping("/{userId}")
    public ApiResponse<UserProfile> getProfile(@PathVariable String userId) {
        return userProfileRepository.findByUserId(userId)
            .map(ApiResponse::ok)
            .orElse(ApiResponse.fail(404, "用户画像不存在"));
    }

    @Operation(summary = "获取用户行为分析")
    @GetMapping("/{userId}/behavior")
    public ApiResponse<Map<String, Object>> getBehavior(@PathVariable String userId) {
        // TODO: 接入真实行为分析数据
        Map<String, Object> behavior = new LinkedHashMap<>();
        behavior.put("userId", userId);
        behavior.put("avgSessionDuration", 15.5);
        behavior.put("avgDailyLogins", 2.3);
        behavior.put("favoriteGameMode", "关卡挑战");
        behavior.put("peakActiveHour", 20);
        behavior.put("retentionD1", 0.65);
        behavior.put("retentionD7", 0.35);
        behavior.put("retentionD30", 0.18);
        behavior.put("note", "mock数据，TODO: 接入真实行为分析");
        return ApiResponse.ok(behavior);
    }

    @Operation(summary = "获取用户标签")
    @GetMapping("/{userId}/tags")
    public ApiResponse<Map<String, Object>> getTags(@PathVariable String userId) {
        return userProfileRepository.findByUserId(userId).map(profile -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("userId", userId);
            result.put("tags", profile.getTags() != null ? profile.getTags() : Collections.emptyList());
            result.put("segmentLevel", profile.getSegmentLevel());
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail(404, "用户不存在"));
    }

    @Operation(summary = "更新用户标签")
    @PutMapping("/{userId}/tags")
    public ApiResponse<Void> updateTags(@PathVariable String userId, @RequestBody Map<String, Object> body) {
        return userProfileRepository.findByUserId(userId).map(profile -> {
            @SuppressWarnings("unchecked")
            List<String> tags = (List<String>) body.get("tags");
            if (tags != null) profile.setTags(tags);
            userProfileRepository.save(profile);
            return ApiResponse.<Void>ok();
        }).orElse(ApiResponse.fail(404, "用户不存在"));
    }

    @Operation(summary = "创建或更新用户画像")
    @PostMapping
    public ApiResponse<UserProfile> upsert(@RequestBody UserProfile profile) {
        // 如果存在则更新，否则创建
        userProfileRepository.findByUserId(profile.getUserId()).ifPresent(existing -> {
            profile.setId(existing.getId());
            profile.setCreatedAt(existing.getCreatedAt());
        });
        return ApiResponse.ok(userProfileRepository.save(profile));
    }
}
