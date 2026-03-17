package com.gamehot.authservice.service;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeishuService {

    @Value("${feishu.app-id}")
    private String appId;

    @Value("${feishu.app-secret}")
    private String appSecret;

    @Value("${feishu.redirect-uri}")
    private String redirectUri;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://open.feishu.cn")
            .build();

    // tenant_access_token 缓存
    private final AtomicReference<String> cachedToken = new AtomicReference<>();
    private volatile long tokenExpiry = 0;

    // ==================== OAuth 登录 URL ====================
    public String getLoginUrl(String state) {
        return "https://accounts.feishu.cn/open-apis/authen/v1/authorize" +
                "?client_id=" + appId +
                "&redirect_uri=" + redirectUri +
                "&response_type=code" +
                "&state=" + state +
                "&scope=contact:user.base:readonly";
    }

    // ==================== Code 换 Token ====================
    public FeishuTokenResponse exchangeCode(String code) {
        Map<String, String> body = Map.of(
                "client_id", appId,
                "client_secret", appSecret,
                "code", code,
                "grant_type", "authorization_code",
                "redirect_uri", redirectUri
        );
        return webClient.post()
                .uri("/open-apis/authen/v2/oauth/token")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(FeishuTokenResponse.class)
                .block();
    }

    // ==================== 获取用户信息 ====================
    public FeishuUserInfo getUserInfo(String accessToken) {
        return webClient.get()
                .uri("https://passport.feishu.cn/suite/passport/oauth/userinfo")
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .bodyToMono(FeishuUserInfo.class)
                .block();
    }

    // ==================== Tenant Access Token ====================
    public String getTenantAccessToken() {
        if (cachedToken.get() != null && Instant.now().toEpochMilli() < tokenExpiry) {
            return cachedToken.get();
        }
        Map<String, String> body = Map.of("app_id", appId, "app_secret", appSecret);
        Map response = webClient.post()
                .uri("/open-apis/auth/v3/tenant_access_token/internal")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        String token = (String) response.get("tenant_access_token");
        Integer expire = (Integer) response.get("expire");
        cachedToken.set(token);
        tokenExpiry = Instant.now().toEpochMilli() + (expire - 300) * 1000L;
        return token;
    }

    // ==================== DTO ====================
    @Data
    public static class FeishuTokenResponse {
        private String access_token;
        private String refresh_token;
        private Integer expires_in;
        private String token_type;
    }

    @Data
    public static class FeishuUserInfo {
        private String sub;        // open_id
        private String name;
        private String picture;
        private String email;
        private String mobile;
        private String tenant_key;
        private String union_id;
        private String en_name;
    }
}
