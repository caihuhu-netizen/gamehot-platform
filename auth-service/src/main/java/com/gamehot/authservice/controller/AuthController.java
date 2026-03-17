package com.gamehot.authservice.controller;

import com.gamehot.authservice.service.AuthService;
import com.gamehot.authservice.service.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    /**
     * 获取飞书登录 URL
     * GET /api/auth/feishu/url?returnPath=/dashboard
     */
    @GetMapping("/feishu/url")
    public ResponseEntity<Map<String, String>> getFeishuLoginUrl(
            @RequestParam(defaultValue = "/") String returnPath) {
        String url = authService.getFeishuLoginUrl(returnPath);
        return ResponseEntity.ok(Map.of("url", url));
    }

    /**
     * 飞书 OAuth 回调
     * GET /api/feishu/callback?code=xxx&state=xxx
     */
    @GetMapping("/feishu/callback")
    public void feishuCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpServletResponse response) throws IOException {

        if ("access_denied".equals(error)) {
            response.sendRedirect(frontendUrl + "/?feishu_error=access_denied");
            return;
        }

        if (code == null) {
            response.sendRedirect(frontendUrl + "/?feishu_error=missing_code");
            return;
        }

        try {
            String jwt = authService.feishuLogin(code);

            // 设置 JWT Cookie（30天）
            Cookie cookie = new Cookie("auth_token", jwt);
            cookie.setHttpOnly(true);
            cookie.setSecure(true);
            cookie.setPath("/");
            cookie.setMaxAge(30 * 24 * 60 * 60);
            response.addCookie(cookie);

            // 解析 returnPath
            String returnPath = "/";
            if (state != null) {
                try {
                    String decoded = java.net.URLDecoder.decode(state, "UTF-8");
                    if (decoded.contains("returnPath")) {
                        returnPath = decoded.replaceAll(".*\"returnPath\":\"([^\"]+)\".*", "$1");
                    }
                } catch (Exception e) {
                    log.warn("解析 state 失败: {}", e.getMessage());
                }
            }

            response.sendRedirect(frontendUrl + returnPath);
        } catch (Exception e) {
            log.error("飞书 OAuth 回调失败: {}", e.getMessage());
            response.sendRedirect(frontendUrl + "/?feishu_error=callback_failed");
        }
    }

    /**
     * 获取当前登录用户信息
     * GET /api/auth/me
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null || !jwtService.isValid(token)) {
            return ResponseEntity.status(401).body(Map.of("error", "未登录"));
        }
        var claims = jwtService.parseToken(token);
        return ResponseEntity.ok(Map.of(
                "openId", claims.getSubject(),
                "name", claims.get("name", String.class),
                "role", claims.get("role", String.class)
        ));
    }

    /**
     * 登出
     * POST /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("auth_token", "");
        cookie.setMaxAge(0);
        cookie.setPath("/");
        response.addCookie(cookie);
        return ResponseEntity.ok(Map.of("message", "已登出"));
    }

    private String extractToken(HttpServletRequest request) {
        // 从 Cookie 取
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if ("auth_token".equals(c.getName())) return c.getValue();
            }
        }
        // 从 Authorization Header 取
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            return auth.substring(7);
        }
        return null;
    }
}
