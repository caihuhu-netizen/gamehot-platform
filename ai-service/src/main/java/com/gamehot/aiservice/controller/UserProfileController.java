package com.gamehot.aiservice.controller;

import com.gamehot.aiservice.entity.UserProfile;
import com.gamehot.aiservice.repository.UserProfileRepository;
import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Tag(name = "用户画像", description = "用户画像相关接口")
@RestController
@RequestMapping("/api/ai/user-profiles")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileRepository userProfileRepository;

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
