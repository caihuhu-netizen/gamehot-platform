package com.gamehot.aiservice.controller;

import com.gamehot.aiservice.dto.CreateKnowledgeRequest;
import com.gamehot.aiservice.entity.KnowledgeBase;
import com.gamehot.aiservice.repository.KnowledgeBaseRepository;
import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "知识库", description = "知识库管理相关接口")
@RestController
@RequestMapping("/api/ai/knowledge")
@RequiredArgsConstructor
public class KnowledgeBaseController {

    private final KnowledgeBaseRepository knowledgeBaseRepository;

    @Operation(summary = "获取知识库列表")
    @GetMapping
    public ApiResponse<List<KnowledgeBase>> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) Long gameId) {
        if (category != null) {
            return ApiResponse.ok(knowledgeBaseRepository.findByCategory(category));
        }
        if (module != null) {
            return ApiResponse.ok(knowledgeBaseRepository.findByRelatedModule(module));
        }
        if (gameId != null) {
            return ApiResponse.ok(knowledgeBaseRepository.findByRelatedGameId(gameId));
        }
        return ApiResponse.ok(knowledgeBaseRepository.findAll());
    }

    @Operation(summary = "获取知识条目详情")
    @GetMapping("/{id}")
    public ApiResponse<KnowledgeBase> getById(@PathVariable Long id) {
        return knowledgeBaseRepository.findById(id)
            .map(ApiResponse::ok)
            .orElse(ApiResponse.fail(404, "知识条目不存在"));
    }

    @Operation(summary = "搜索知识库")
    @GetMapping("/search")
    public ApiResponse<List<KnowledgeBase>> search(@RequestParam String keyword) {
        return ApiResponse.ok(knowledgeBaseRepository.searchByKeyword(keyword));
    }

    @Operation(summary = "创建知识条目")
    @PostMapping
    public ApiResponse<KnowledgeBase> create(@RequestBody CreateKnowledgeRequest req, Authentication auth) {
        KnowledgeBase kb = new KnowledgeBase();
        kb.setTitle(req.getTitle());
        kb.setCategory(req.getCategory());
        kb.setContent(req.getContent());
        kb.setTags(req.getTags());
        kb.setRelatedGameId(req.getRelatedGameId());
        kb.setRelatedModule(req.getRelatedModule());
        kb.setCreatedBy(auth.getName());
        return ApiResponse.ok(knowledgeBaseRepository.save(kb));
    }

    @Operation(summary = "更新知识条目")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return knowledgeBaseRepository.findById(id).map(kb -> {
            if (body.containsKey("title")) kb.setTitle((String) body.get("title"));
            if (body.containsKey("category")) kb.setCategory((String) body.get("category"));
            if (body.containsKey("content")) kb.setContent((String) body.get("content"));
            if (body.containsKey("relatedModule")) kb.setRelatedModule((String) body.get("relatedModule"));
            @SuppressWarnings("unchecked")
            List<String> tags = (List<String>) body.get("tags");
            if (tags != null) kb.setTags(tags);
            knowledgeBaseRepository.save(kb);
            return ApiResponse.<Void>ok();
        }).orElse(ApiResponse.fail(404, "知识条目不存在"));
    }

    @Operation(summary = "删除知识条目")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        knowledgeBaseRepository.deleteById(id);
        return ApiResponse.ok();
    }
}
