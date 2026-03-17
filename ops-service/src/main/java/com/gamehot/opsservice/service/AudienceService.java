package com.gamehot.opsservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gamehot.opsservice.dto.CreateAudienceGroupRequest;
import com.gamehot.opsservice.model.AudienceGroup;
import com.gamehot.opsservice.repository.AudienceGroupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AudienceService {

    private final AudienceGroupRepository audienceGroupRepository;
    private final ObjectMapper objectMapper;

    public List<AudienceGroup> listGroups(Integer gameId) {
        if (gameId != null) return audienceGroupRepository.findByGameIdAndDeletedOrderByCreatedAtDesc(gameId, 0);
        return audienceGroupRepository.findByDeletedOrderByCreatedAtDesc(0);
    }

    public Optional<AudienceGroup> getGroup(Long id) {
        return audienceGroupRepository.findByIdAndDeleted(id, 0);
    }

    @Transactional
    public AudienceGroup createGroup(CreateAudienceGroupRequest req, String createdBy) {
        AudienceGroup group = new AudienceGroup();
        group.setName(req.getName());
        group.setDescription(req.getDescription());
        group.setMatchType(req.getMatchType() != null ? req.getMatchType() : "all");
        group.setGameId(req.getGameId());
        group.setCreatedBy(createdBy);
        try {
            group.setConditions(objectMapper.writeValueAsString(req.getConditions()));
        } catch (Exception e) {
            group.setConditions("[]");
        }
        return audienceGroupRepository.save(group);
    }

    @Transactional
    public void updateGroup(Long id, Map<String, Object> updates) {
        AudienceGroup group = audienceGroupRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Audience group not found: " + id));
        if (updates.containsKey("name")) group.setName((String) updates.get("name"));
        if (updates.containsKey("description")) group.setDescription((String) updates.get("description"));
        if (updates.containsKey("matchType")) group.setMatchType((String) updates.get("matchType"));
        if (updates.containsKey("status")) group.setStatus((String) updates.get("status"));
        if (updates.containsKey("conditions")) {
            try {
                group.setConditions(objectMapper.writeValueAsString(updates.get("conditions")));
            } catch (Exception ignored) { log.warn("Caught exception: {}", ignored.getMessage()); }
        }
        audienceGroupRepository.save(group);
    }

    @Transactional
    public void deleteGroup(Long id) {
        AudienceGroup group = audienceGroupRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Audience group not found: " + id));
        group.setDeleted(1);
        audienceGroupRepository.save(group);
    }

    @Transactional
    public Map<String, Object> calculateCount(Long id) {
        AudienceGroup group = audienceGroupRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Audience group not found: " + id));
        // Simulated count calculation
        int estimated = (int)(Math.random() * 10000) + 100;
        group.setUserCount(estimated);
        group.setLastCalculatedAt(LocalDateTime.now());
        audienceGroupRepository.save(group);
        return Map.of("audienceId", id, "userCount", estimated, "calculatedAt", LocalDateTime.now().toString());
    }

    public Map<String, Object> previewCount(List<CreateAudienceGroupRequest.AudienceCondition> conditions, String matchType) {
        // Simulated preview
        int estimated = (int)(Math.random() * 5000) + 50;
        return Map.of("estimatedCount", estimated, "matchType", matchType != null ? matchType : "all");
    }

    public Map<String, Object> getUserIds(Long id, int limit, int offset) {
        AudienceGroup group = audienceGroupRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Audience group not found: " + id));
        // Simulated user ID list
        List<String> userIds = new ArrayList<>();
        int total = group.getUserCount() != null ? group.getUserCount() : 0;
        for (int i = offset; i < Math.min(offset + limit, total); i++) {
            userIds.add("user_" + (i + 1));
        }
        return Map.of("userIds", userIds, "total", total, "limit", limit, "offset", offset);
    }

    public List<Map<String, Object>> getFieldRegistry() {
        // Standard condition fields
        return List.of(
                Map.of("field", "last_active_days", "label", "最后活跃距今天数", "type", "number"),
                Map.of("field", "total_purchases", "label", "累计购买次数", "type", "number"),
                Map.of("field", "total_spend", "label", "累计消费金额", "type", "number"),
                Map.of("field", "country", "label", "国家/地区", "type", "string"),
                Map.of("field", "platform", "label", "平台", "type", "enum", "options", List.of("ios", "android")),
                Map.of("field", "app_version", "label", "App版本", "type", "string"),
                Map.of("field", "level", "label", "当前关卡", "type", "number"),
                Map.of("field", "register_days", "label", "注册距今天数", "type", "number")
        );
    }

    public List<Map<String, Object>> getOperators() {
        return List.of(
                Map.of("operator", "eq", "label", "等于"),
                Map.of("operator", "ne", "label", "不等于"),
                Map.of("operator", "gt", "label", "大于"),
                Map.of("operator", "lt", "label", "小于"),
                Map.of("operator", "gte", "label", "大于等于"),
                Map.of("operator", "lte", "label", "小于等于"),
                Map.of("operator", "in", "label", "属于"),
                Map.of("operator", "not_in", "label", "不属于"),
                Map.of("operator", "contains", "label", "包含"),
                Map.of("operator", "not_contains", "label", "不包含")
        );
    }
}
