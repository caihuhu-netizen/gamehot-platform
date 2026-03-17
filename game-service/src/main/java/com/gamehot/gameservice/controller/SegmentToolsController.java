package com.gamehot.gameservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.gameservice.entity.SegmentCalcRule;
import com.gamehot.gameservice.entity.SegmentLayerLogic;
import com.gamehot.gameservice.repository.SegmentBehaviorStrategyRepository;
import com.gamehot.gameservice.repository.SegmentCalcRuleRepository;
import com.gamehot.gameservice.repository.SegmentLayerLogicRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "SegmentTools", description = "分群工具（Excel导入导出/模拟器）")
@RestController
@RequestMapping("/api/game/segments/tools")
@RequiredArgsConstructor
public class SegmentToolsController {

    private final SegmentLayerLogicRepository layerLogicRepo;
    private final SegmentBehaviorStrategyRepository behaviorRepo;
    private final SegmentCalcRuleRepository calcRuleRepo;

    @Operation(summary = "导出分层配置Excel（mock，返回下载URL）")
    @PostMapping("/export-excel")
    public ApiResponse<Map<String, Object>> exportExcel(@RequestBody(required = false) Map<String, Object> body) {
        // TODO: implement real Excel export using Apache POI
        Map<String, Object> result = new HashMap<>();
        result.put("url", "");
        result.put("filename", "分层配置_" + java.time.LocalDate.now() + ".xlsx");
        result.put("message", "Excel导出功能开发中，请使用列表接口获取数据");
        return ApiResponse.ok(result);
    }

    @Operation(summary = "导入预览（解析但不写入）")
    @PostMapping("/import-preview")
    public ApiResponse<Map<String, Object>> importPreview(@RequestBody Map<String, Object> body) {
        // TODO: implement Excel parsing with Apache POI
        Map<String, Object> result = new HashMap<>();
        result.put("parsed", Map.of("logicCount", 0, "behaviorCount", 0, "calcCount", 0));
        result.put("diff", Map.of("logic", List.of(), "behavior", List.of(), "calc", List.of()));
        result.put("errors", List.of("Excel导入预览功能开发中"));
        return ApiResponse.ok(result);
    }

    @Operation(summary = "导入应用（解析并写入DB）")
    @PostMapping("/import-apply")
    public ApiResponse<Map<String, Object>> importApply(@RequestBody Map<String, Object> body) {
        // TODO: implement Excel parsing with Apache POI and upsert logic
        Map<String, Object> result = new HashMap<>();
        result.put("success", false);
        result.put("errors", List.of("Excel导入功能开发中"));
        result.put("stats", null);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "分群模拟器 - 预测用户归属层级")
    @PostMapping("/simulate")
    public ApiResponse<Map<String, Object>> simulate(@RequestBody SimulateRequest request) {
        List<SegmentCalcRule> rules = calcRuleRepo.findByIsActive(1);
        SimulationResult simResult = simulateSegment(request, rules);

        // Get layer logic for matched layer
        SegmentLayerLogic matchedLayer = layerLogicRepo.findByLayerId(simResult.getResultLayer()).orElse(null);

        // Get behavior strategies for matched layer
        List<Object> behaviors = new ArrayList<>();
        if (simResult.getResultLayer() > 0) {
            behaviorRepo.findByLayerId(simResult.getResultLayer()).forEach(b -> {
                Map<String, Object> bMap = new HashMap<>();
                bMap.put("giftType", b.getGiftType());
                bMap.put("pushGiftPlace", b.getPushGiftPlace());
                bMap.put("cooldownRule", b.getCooldownRule());
                behaviors.add(bMap);
            });
        }

        Map<String, Object> result = new HashMap<>();
        result.put("resultLayer", simResult.getResultLayer());
        result.put("matchType", simResult.getMatchType());
        result.put("matchedRuleId", simResult.getMatchedRuleId());
        result.put("details", simResult.getDetails());
        result.put("layerInfo", matchedLayer != null ? Map.of(
                "layerName", matchedLayer.getLayerName(),
                "interstitialAdFirstLevel", matchedLayer.getInterstitialAdFirstLevel(),
                "interstitialAdFrequency", matchedLayer.getInterstitialAdFrequency(),
                "pushGifts", matchedLayer.getPushGifts()
        ) : null);
        result.put("behaviorStrategies", behaviors);
        return ApiResponse.ok(result);
    }

    private SimulationResult simulateSegment(SimulateRequest input, List<SegmentCalcRule> rules) {
        // Upgrade rules: ruleType=1, sort by targetLayer DESC
        List<SegmentCalcRule> upgradeRules = rules.stream()
                .filter(r -> r.getRuleType() == 1)
                .sorted((a, b) -> b.getTargetLayer() - a.getTargetLayer())
                .toList();

        // Downgrade rules: ruleType=2, sort by targetLayer ASC
        List<SegmentCalcRule> downgradeRules = rules.stream()
                .filter(r -> r.getRuleType() == 2)
                .sorted((a, b) -> a.getTargetLayer() - b.getTargetLayer())
                .toList();

        int matchedLayer = 0;
        String matchType = "default";
        Long matchedRuleId = null;
        List<Map<String, Object>> matchDetails = new ArrayList<>();

        // Try upgrade rules first
        for (SegmentCalcRule rule : upgradeRules) {
            List<Map<String, Object>> checks = new ArrayList<>();
            boolean allPass = true;

            if (rule.getPurchaseAmount() != null) {
                double threshold = Double.parseDouble(rule.getPurchaseAmount());
                boolean pass = input.getPurchaseAmount() >= threshold;
                checks.add(Map.of("field", "付费金额", "value", input.getPurchaseAmount(), "threshold", threshold, "pass", pass));
                if (!pass) allPass = false;
            }
            if (rule.getStreakLoginTimes() != null) {
                boolean pass = input.getStreakLoginTimes() >= rule.getStreakLoginTimes();
                checks.add(Map.of("field", "连续登录次数", "value", input.getStreakLoginTimes(), "threshold", rule.getStreakLoginTimes(), "pass", pass));
                if (!pass) allPass = false;
            }
            if (rule.getTotalLoginTimes() != null) {
                boolean pass = input.getTotalLoginTimes() >= rule.getTotalLoginTimes();
                checks.add(Map.of("field", "总登录次数", "value", input.getTotalLoginTimes(), "threshold", rule.getTotalLoginTimes(), "pass", pass));
                if (!pass) allPass = false;
            }
            if (rule.getOnlineDuration() != null) {
                boolean pass = input.getOnlineDuration() >= rule.getOnlineDuration();
                checks.add(Map.of("field", "在线总时长", "value", input.getOnlineDuration(), "threshold", rule.getOnlineDuration(), "pass", pass));
                if (!pass) allPass = false;
            }
            if (rule.getCompleteLevelNum() != null) {
                boolean pass = input.getCompleteLevelNum() >= rule.getCompleteLevelNum();
                checks.add(Map.of("field", "闯关总次数", "value", input.getCompleteLevelNum(), "threshold", rule.getCompleteLevelNum(), "pass", pass));
                if (!pass) allPass = false;
            }

            if (allPass && !checks.isEmpty()) {
                matchedLayer = rule.getTargetLayer();
                matchType = "upgrade";
                matchedRuleId = rule.getId();
                matchDetails.addAll(checks);
                break;
            }
        }

        // Try downgrade if no upgrade matched
        if ("default".equals(matchType)) {
            for (SegmentCalcRule rule : downgradeRules) {
                List<Map<String, Object>> checks = new ArrayList<>();
                boolean anyBelow = false;

                if (rule.getStreakLoginTimes() != null) {
                    boolean pass = input.getStreakLoginTimes() >= rule.getStreakLoginTimes();
                    checks.add(Map.of("field", "连续登录次数", "value", input.getStreakLoginTimes(), "threshold", rule.getStreakLoginTimes(), "pass", pass));
                    if (!pass) anyBelow = true;
                }
                if (rule.getTotalLoginTimes() != null) {
                    boolean pass = input.getTotalLoginTimes() >= rule.getTotalLoginTimes();
                    checks.add(Map.of("field", "总登录次数", "value", input.getTotalLoginTimes(), "threshold", rule.getTotalLoginTimes(), "pass", pass));
                    if (!pass) anyBelow = true;
                }
                if (rule.getCompleteLevelNum() != null) {
                    boolean pass = input.getCompleteLevelNum() >= rule.getCompleteLevelNum();
                    checks.add(Map.of("field", "闯关总次数", "value", input.getCompleteLevelNum(), "threshold", rule.getCompleteLevelNum(), "pass", pass));
                    if (!pass) anyBelow = true;
                }

                if (anyBelow && !checks.isEmpty()) {
                    matchedLayer = rule.getTargetLayer();
                    matchType = "downgrade";
                    matchedRuleId = rule.getId();
                    matchDetails.addAll(checks);
                    break;
                }
            }
        }

        return new SimulationResult(matchedLayer, matchType, matchedRuleId, matchDetails);
    }

    @Data
    public static class SimulateRequest {
        private double purchaseAmount = 0;
        private int streakLoginTimes = 0;
        private int totalLoginTimes = 0;
        private int onlineDuration = 0;
        private int avgDailyOnlineTime = 0;
        private int completeLevelNum = 0;
        private int avgDailyCompleteLevelNum = 0;
        private Long gameId;
    }

    @Data
    private static class SimulationResult {
        private final int resultLayer;
        private final String matchType;
        private final Long matchedRuleId;
        private final List<Map<String, Object>> details;
    }
}
