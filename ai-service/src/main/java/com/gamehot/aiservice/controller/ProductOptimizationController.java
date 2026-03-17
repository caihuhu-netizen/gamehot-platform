package com.gamehot.aiservice.controller;

import com.gamehot.aiservice.dto.CreateSuggestionRequest;
import com.gamehot.aiservice.dto.GenerateAiSuggestionRequest;
import com.gamehot.aiservice.dto.UpdateSuggestionRequest;
import com.gamehot.aiservice.entity.OptimizationSuggestion;
import com.gamehot.aiservice.repository.OptimizationSuggestionRepository;
import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@Tag(name = "产品优化", description = "产品优化建议相关接口")
@RestController
@RequestMapping("/api/ai/optimization")
@RequiredArgsConstructor
public class ProductOptimizationController {

    private final OptimizationSuggestionRepository suggestionRepository;

    @Operation(summary = "获取优化建议列表")
    @GetMapping("/suggestions")
    public ApiResponse<Page<OptimizationSuggestion>> listSuggestions(
            @RequestParam(required = false) Long gameId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<OptimizationSuggestion> result;
        if (gameId != null && category != null) {
            result = suggestionRepository.findByGameIdAndCategory(gameId, category, pageable);
        } else if (gameId != null && status != null) {
            result = suggestionRepository.findByGameIdAndStatus(gameId, status, pageable);
        } else if (gameId != null) {
            result = suggestionRepository.findByGameId(gameId, pageable);
        } else {
            result = suggestionRepository.findAll(pageable);
        }
        return ApiResponse.ok(result);
    }

    @Operation(summary = "获取建议详情")
    @GetMapping("/suggestions/{id}")
    public ApiResponse<OptimizationSuggestion> getById(@PathVariable Long id) {
        return suggestionRepository.findById(id)
            .map(ApiResponse::ok)
            .orElse(ApiResponse.fail(404, "建议不存在"));
    }

    @Operation(summary = "获取建议统计")
    @GetMapping("/suggestions/stats")
    public ApiResponse<Map<String, Object>> getStats(@RequestParam(required = false) Long gameId) {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("open", suggestionRepository.countByStatus("open"));
        stats.put("accepted", suggestionRepository.countByStatus("accepted"));
        stats.put("inProgress", suggestionRepository.countByStatus("in_progress"));
        stats.put("implemented", suggestionRepository.countByStatus("implemented"));
        stats.put("rejected", suggestionRepository.countByStatus("rejected"));
        return ApiResponse.ok(stats);
    }

    @Operation(summary = "创建优化建议")
    @PostMapping("/suggestions")
    public ApiResponse<Map<String, Object>> createSuggestion(
            @RequestBody CreateSuggestionRequest req, Authentication auth) {
        OptimizationSuggestion s = new OptimizationSuggestion();
        s.setGameId(req.getGameId());
        s.setTitle(req.getTitle());
        s.setDescription(req.getDescription());
        s.setCategory(req.getCategory());
        s.setPriority(req.getPriority() != null ? req.getPriority() : "medium");
        s.setSource(req.getSource() != null ? req.getSource() : "manual");
        s.setDataEvidence(req.getDataEvidence());
        s.setExpectedImpact(req.getExpectedImpact());
        s.setAssignedTo(req.getAssignedTo());
        s.setStatus("open");
        OptimizationSuggestion saved = suggestionRepository.save(s);
        return ApiResponse.ok(Map.of("id", saved.getId()));
    }

    @Operation(summary = "更新优化建议")
    @PutMapping("/suggestions/{id}")
    public ApiResponse<Void> updateSuggestion(@PathVariable Long id,
            @RequestBody UpdateSuggestionRequest req) {
        return suggestionRepository.findById(id).map(s -> {
            if (req.getTitle() != null) s.setTitle(req.getTitle());
            if (req.getDescription() != null) s.setDescription(req.getDescription());
            if (req.getCategory() != null) s.setCategory(req.getCategory());
            if (req.getPriority() != null) s.setPriority(req.getPriority());
            if (req.getStatus() != null) {
                s.setStatus(req.getStatus());
                if ("implemented".equals(req.getStatus()) || "rejected".equals(req.getStatus())) {
                    s.setResolvedAt(LocalDateTime.now());
                }
            }
            if (req.getExpectedImpact() != null) s.setExpectedImpact(req.getExpectedImpact());
            if (req.getActualImpact() != null) s.setActualImpact(req.getActualImpact());
            if (req.getAssignedTo() != null) s.setAssignedTo(req.getAssignedTo());
            suggestionRepository.save(s);
            return ApiResponse.<Void>ok();
        }).orElse(ApiResponse.fail(404, "建议不存在"));
    }

    @Operation(summary = "采纳建议")
    @PostMapping("/suggestions/{id}/accept")
    public ApiResponse<Void> acceptSuggestion(@PathVariable Long id) {
        return suggestionRepository.findById(id).map(s -> {
            s.setStatus("accepted");
            suggestionRepository.save(s);
            return ApiResponse.<Void>ok();
        }).orElse(ApiResponse.fail(404, "建议不存在"));
    }

    @Operation(summary = "忽略建议")
    @PostMapping("/suggestions/{id}/ignore")
    public ApiResponse<Void> ignoreSuggestion(@PathVariable Long id) {
        return suggestionRepository.findById(id).map(s -> {
            s.setStatus("rejected");
            s.setResolvedAt(LocalDateTime.now());
            suggestionRepository.save(s);
            return ApiResponse.<Void>ok();
        }).orElse(ApiResponse.fail(404, "建议不存在"));
    }

    @Operation(summary = "删除建议")
    @DeleteMapping("/suggestions/{id}")
    public ApiResponse<Void> deleteSuggestion(@PathVariable Long id) {
        suggestionRepository.deleteById(id);
        return ApiResponse.ok();
    }

    @Operation(summary = "AI生成优化建议")
    @PostMapping("/suggestions/generate")
    public ApiResponse<Map<String, Object>> generateAiSuggestions(
            @RequestBody GenerateAiSuggestionRequest req, Authentication auth) {
        // TODO: 接入真实 LLM
        // 当前返回 mock 数据
        List<Map<String, Object>> mockSuggestions = new ArrayList<>();

        Map<String, Object> s1 = new LinkedHashMap<>();
        s1.put("title", "提升次日留存率");
        s1.put("description", "根据数据分析，第2-3关卡难度偏高导致新用户流失，建议适当降低关卡难度并增加引导教程。");
        s1.put("category", "retention");
        s1.put("priority", "high");
        s1.put("expectedImpact", Map.of("metric", "D1留存率", "currentValue", "35%", "targetValue", "45%", "timeframe", "2周"));
        mockSuggestions.add(s1);

        Map<String, Object> s2 = new LinkedHashMap<>();
        s2.put("title", "优化付费转化节点");
        s2.put("description", "分析显示用户在第5关后付费意愿最高，建议在此节点增加礼包推送和限时优惠。");
        s2.put("category", "monetization");
        s2.put("priority", "high");
        s2.put("expectedImpact", Map.of("metric", "付费转化率", "currentValue", "2.5%", "targetValue", "4%", "timeframe", "1个月"));
        mockSuggestions.add(s2);

        Map<String, Object> s3 = new LinkedHashMap<>();
        s3.put("title", "增强社交功能促进裂变");
        s3.put("description", "当前游戏缺少社交分享机制，建议添加好友邀请奖励和排行榜功能。");
        s3.put("category", "acquisition");
        s3.put("priority", "medium");
        s3.put("expectedImpact", Map.of("metric", "新增用户", "currentValue", "500/天", "targetValue", "750/天", "timeframe", "1个月"));
        mockSuggestions.add(s3);

        // 保存到数据库
        List<Long> createdIds = new ArrayList<>();
        for (Map<String, Object> sug : mockSuggestions) {
            OptimizationSuggestion entity = new OptimizationSuggestion();
            entity.setGameId(req.getGameId());
            entity.setTitle((String) sug.get("title"));
            entity.setDescription((String) sug.get("description"));
            entity.setCategory((String) sug.get("category"));
            entity.setPriority((String) sug.get("priority"));
            entity.setSource("ai_analysis");
            @SuppressWarnings("unchecked")
            Map<String, Object> impact = (Map<String, Object>) sug.get("expectedImpact");
            entity.setExpectedImpact(impact);
            entity.setStatus("open");
            createdIds.add(suggestionRepository.save(entity).getId());
        }

        return ApiResponse.ok(Map.of("suggestions", mockSuggestions, "createdIds", createdIds));
    }

// ==================== Versions ====================

    @Operation(summary = "版本列表")
    @GetMapping("/versions")
    public ApiResponse<List<Map<String, Object>>> listVersions(
            @RequestParam(required = false) Long gameId,
            @RequestParam(defaultValue = "50") int limit) {
        // TODO: 接入真实版本表
        return ApiResponse.ok(java.util.Collections.emptyList());
    }

    @Operation(summary = "创建版本")
    @PostMapping("/versions")
    public ApiResponse<Map<String, Object>> createVersion(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id", System.currentTimeMillis());
        result.put("versionCode", body.get("versionCode"));
        result.put("releaseNotes", body.get("changeLog"));
        result.put("changeType", body.get("changeType"));
        result.put("releaseDate", body.get("releaseDate"));
        result.put("verificationStatus", "pending");
        result.put("createdAt", java.time.LocalDateTime.now().toString());
        return ApiResponse.ok(result);
    }

    @Operation(summary = "版本指标")
    @GetMapping("/versions/metrics")
    public ApiResponse<List<Map<String, Object>>> getVersionMetrics(
            @RequestParam(required = false) Long gameId,
            @RequestParam(required = false) String versionCode) {
        return ApiResponse.ok(java.util.Collections.emptyList());
    }

    // ==================== Effects ====================

    @Operation(summary = "效果验证列表")
    @GetMapping("/effects")
    public ApiResponse<List<Map<String, Object>>> listEffects(
            @RequestParam(required = false) Long gameId) {
        return ApiResponse.ok(java.util.Collections.emptyList());
    }

    @Operation(summary = "分析版本效果")
    @PostMapping("/effects/analyze")
    public ApiResponse<Map<String, Object>> analyzeVersionEffect(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("status", "analyzing");
        result.put("message", "效果分析已提交，预计1-2分钟完成");
        return ApiResponse.ok(result);
    }

    // ==================== Suggestions (别名) ====================

    @Operation(summary = "AI生成建议（别名）")
    @PostMapping("/suggestions/generate-ai")
    public ApiResponse<Map<String, Object>> generateAiSuggestionsAlias(
            @RequestBody GenerateAiSuggestionRequest req, Authentication auth) {
        return generateAiSuggestions(req, auth);
    }

    @Operation(summary = "更新建议状态（别名）")
    @PutMapping("/suggestions/update")
    public ApiResponse<Void> updateSuggestionAlias(@RequestBody Map<String, Object> body) {
        Object idObj = body.get("id");
        if (idObj == null) return ApiResponse.fail("id is required");
        Long id = Long.valueOf(idObj.toString());
        UpdateSuggestionRequest req = new UpdateSuggestionRequest();
        if (body.get("status") != null) req.setStatus((String) body.get("status"));
        if (body.get("priority") != null) req.setPriority((String) body.get("priority"));
        return updateSuggestion(id, req);
    }
}
