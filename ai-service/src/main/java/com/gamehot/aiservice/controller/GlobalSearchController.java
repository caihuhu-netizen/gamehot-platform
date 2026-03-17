package com.gamehot.aiservice.controller;

import com.gamehot.aiservice.entity.SearchHistory;
import com.gamehot.aiservice.repository.*;
import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Tag(name = "全局搜索", description = "全局搜索相关接口")
@RestController
@RequestMapping("/api/ai/search")
@RequiredArgsConstructor
public class GlobalSearchController {

    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final OptimizationSuggestionRepository suggestionRepository;
    private final DecisionLogRepository decisionLogRepository;
    private final SearchHistoryRepository searchHistoryRepository;

    @Operation(summary = "全局搜索")
    @GetMapping
    public ApiResponse<Map<String, Object>> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "20") int limit,
            Authentication auth) {

        List<Map<String, Object>> results = new ArrayList<>();

        // 搜索知识库
        knowledgeBaseRepository.searchByKeyword(keyword).stream().limit(limit / 2).forEach(kb -> {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("type", "knowledge");
            r.put("id", kb.getId());
            r.put("title", kb.getTitle());
            r.put("snippet", kb.getContent() != null
                ? kb.getContent().substring(0, Math.min(100, kb.getContent().length())) + "..."
                : "");
            r.put("url", "/knowledge/" + kb.getId());
            results.add(r);
        });

        // 搜索优化建议（title 包含关键词）
        suggestionRepository.findAll().stream()
            .filter(s -> s.getTitle() != null && s.getTitle().contains(keyword))
            .limit(limit / 4)
            .forEach(s -> {
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("type", "suggestion");
                r.put("id", s.getId());
                r.put("title", s.getTitle());
                r.put("snippet", s.getDescription() != null
                    ? s.getDescription().substring(0, Math.min(100, s.getDescription().length())) + "..."
                    : "");
                r.put("url", "/optimization/suggestions/" + s.getId());
                results.add(r);
            });

        // 保存搜索历史
        SearchHistory history = new SearchHistory();
        history.setUserId(auth.getName());
        history.setKeyword(keyword);
        history.setResultCount(results.size());
        searchHistoryRepository.save(history);

        return ApiResponse.ok(Map.of(
            "results", results.subList(0, Math.min(limit, results.size())),
            "total", results.size()
        ));
    }

    @Operation(summary = "获取搜索历史")
    @GetMapping("/history")
    public ApiResponse<List<SearchHistory>> getHistory(Authentication auth) {
        return ApiResponse.ok(
            searchHistoryRepository.findByUserIdOrderByCreatedAtDesc(auth.getName())
        );
    }
}
