package com.gamehot.authservice.service;

import com.gamehot.authservice.model.User;
import com.gamehot.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final FeishuService feishuService;

    /**
     * 飞书 OAuth 登录
     * code → token → 用户信息 → upsert用户 → 返回JWT
     */
    @Transactional
    public String feishuLogin(String code) {
        // 1. code 换飞书 access_token
        var tokenRes = feishuService.exchangeCode(code);
        if (tokenRes == null || tokenRes.getAccess_token() == null) {
            throw new RuntimeException("飞书 token 交换失败");
        }

        // 2. 获取飞书用户信息
        var feishuUser = feishuService.getUserInfo(tokenRes.getAccess_token());
        if (feishuUser == null || feishuUser.getSub() == null) {
            throw new RuntimeException("获取飞书用户信息失败");
        }

        log.info("飞书登录成功: openId={}, name={}", feishuUser.getSub(), feishuUser.getName());

        // 3. upsert 系统用户
        String systemOpenId = "feishu_" + feishuUser.getSub();
        User user = userRepository.findByOpenId(systemOpenId).orElse(new User());
        user.setOpenId(systemOpenId);
        user.setName(feishuUser.getName());
        user.setEmail(feishuUser.getEmail());
        user.setAvatar(feishuUser.getPicture());
        user.setLoginMethod("feishu");
        user.setLastSignedIn(LocalDateTime.now());
        if (user.getRole() == null) user.setRole("member");
        userRepository.save(user);

        // 4. 生成 JWT
        return jwtService.generateToken(systemOpenId, user.getName(), user.getRole());
    }

    /**
     * 获取飞书登录 URL
     */
    public String getFeishuLoginUrl(String returnPath) {
        String state = java.net.URLEncoder.encode(
                "{\"returnPath\":\"" + returnPath + "\"}",
                java.nio.charset.StandardCharsets.UTF_8
        );
        return feishuService.getLoginUrl(state);
    }
}
