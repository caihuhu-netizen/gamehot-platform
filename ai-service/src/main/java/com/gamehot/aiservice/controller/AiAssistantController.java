package com.gamehot.aiservice.controller;

import com.gamehot.aiservice.dto.ChatRequest;
import com.gamehot.aiservice.entity.ChatSession;
import com.gamehot.aiservice.repository.ChatSessionRepository;
import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Tag(name = "AI助手", description = "AI对话助手相关接口")
@RestController
@RequestMapping("/api/ai/assistant")
@RequiredArgsConstructor
public class AiAssistantController {

    private final ChatSessionRepository chatSessionRepository;

    @Operation(summary = "获取会话列表")
    @GetMapping("/sessions")
    public ApiResponse<List<ChatSession>> listSessions(Authentication auth) {
        String userId = auth.getName();
        return ApiResponse.ok(chatSessionRepository.findByUserIdOrderByUpdatedAtDesc(userId));
    }

    @Operation(summary = "获取会话详情")
    @GetMapping("/sessions/{sessionId}")
    public ApiResponse<ChatSession> getSession(@PathVariable Long sessionId, Authentication auth) {
        String userId = auth.getName();
        return chatSessionRepository.findByIdAndUserId(sessionId, userId)
            .map(ApiResponse::ok)
            .orElse(ApiResponse.fail(404, "会话不存在"));
    }

    @Operation(summary = "删除会话")
    @DeleteMapping("/sessions/{sessionId}")
    public ApiResponse<Void> deleteSession(@PathVariable Long sessionId, Authentication auth) {
        String userId = auth.getName();
        chatSessionRepository.findByIdAndUserId(sessionId, userId).ifPresent(chatSessionRepository::delete);
        return ApiResponse.ok();
    }

    @Operation(summary = "发送消息（AI对话）")
    @PostMapping("/chat")
    public ApiResponse<Map<String, Object>> chat(@RequestBody ChatRequest req, Authentication auth) {
        String userId = auth.getName();
        ChatSession session;
        List<Map<String, Object>> messages = new ArrayList<>();

        if (req.getSessionId() != null) {
            session = chatSessionRepository.findByIdAndUserId(req.getSessionId(), userId)
                .orElse(new ChatSession());
            if (session.getMessages() != null) {
                messages = new ArrayList<>(session.getMessages());
            }
        } else {
            session = new ChatSession();
            session.setUserId(userId);
        }

        // 添加用户消息
        Map<String, Object> userMsg = new LinkedHashMap<>();
        userMsg.put("role", "user");
        userMsg.put("content", req.getMessage());
        userMsg.put("timestamp", System.currentTimeMillis());
        messages.add(userMsg);

        // TODO: 接入真实 LLM
        // 当前返回 mock 回复
        String mockReply = "感谢您的提问！您问到了：" + req.getMessage() + "\n\n" +
            "作为 GAMEHOT CDP 系统的 AI 运营助手，我可以帮您查询数据、分析趋势、提供运营建议。" +
            "真实 LLM 接入后，我将能够执行 SQL 查询并给出专业分析。";

        // 添加助手回复
        Map<String, Object> assistantMsg = new LinkedHashMap<>();
        assistantMsg.put("role", "assistant");
        assistantMsg.put("content", mockReply);
        assistantMsg.put("timestamp", System.currentTimeMillis());
        messages.add(assistantMsg);

        // 保存会话
        String title = req.getMessage().length() > 50
            ? req.getMessage().substring(0, 50)
            : req.getMessage();
        session.setUserId(userId);
        session.setTitle(title);
        session.setMessages(messages);
        chatSessionRepository.save(session);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sessionId", session.getId());
        result.put("reply", mockReply);
        result.put("queryResult", null);
        return ApiResponse.ok(result);
    }
}
