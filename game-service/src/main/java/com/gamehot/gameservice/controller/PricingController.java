package com.gamehot.gameservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.gameservice.entity.PricingRecommendation;
import com.gamehot.gameservice.entity.PricingStrategy;
import com.gamehot.gameservice.repository.IapProductRepository;
import com.gamehot.gameservice.repository.PricingRecommendationRepository;
import com.gamehot.gameservice.repository.PricingStrategyRepository;
import com.gamehot.gameservice.repository.SegmentLayerLogicRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Pricing", description = "定价引擎与策略管理")
@RestController
@RequestMapping("/api/game/pricing")
@RequiredArgsConstructor
public class PricingController {

    private final PricingStrategyRepository strategyRepository;
    private final PricingRecommendationRepository recommendationRepository;
    private final SegmentLayerLogicRepository layerLogicRepo;
    private final IapProductRepository iapProductRepository;

    @Operation(summary = "获取各分层付费特征（mock）")
    @GetMapping("/layer-features")
    public ApiResponse<List<Map<String, Object>>> getLayerFeatures(@RequestParam(required = false) Long gameId) {
        // TODO: compute real layer pricing features from payment/behavior data
        List<Map<String, Object>> features = new ArrayList<>();
        layerLogicRepo.findAll().forEach(layer -> {
            Map<String, Object> f = new HashMap<>();
            f.put("layerId", layer.getLayerId());
            f.put("layerName", layer.getLayerName());
            f.put("avgPurchaseAmount", 0.0);
            f.put("purchaseFrequency", 0.0);
            f.put("payingUserRatio", 0.0);
            f.put("adWatchRatio", 0.0);
            features.add(f);
        });
        return ApiResponse.ok(features);
    }

    @Operation(summary = "获取各分层付费分布（mock）")
    @GetMapping("/payment-distribution")
    public ApiResponse<List<Map<String, Object>>> getPaymentDistribution(@RequestParam(required = false) Long gameId) {
        // TODO: compute real distribution from payment data
        List<Map<String, Object>> dist = new ArrayList<>();
        layerLogicRepo.findAll().forEach(layer -> {
            Map<String, Object> d = new HashMap<>();
            d.put("layerId", layer.getLayerId());
            d.put("layerName", layer.getLayerName());
            d.put("userCount", 0);
            d.put("payingCount", 0);
            d.put("totalRevenue", 0.0);
            d.put("avgArpu", 0.0);
            d.put("priceDistribution", Map.of(
                    "0.99", 0, "2.99", 0, "4.99", 0, "9.99", 0
            ));
            dist.add(d);
        });
        return ApiResponse.ok(dist);
    }

    @Operation(summary = "定价策略列表")
    @GetMapping("/strategies")
    public ApiResponse<List<PricingStrategy>> listStrategies(@RequestParam(required = false) Long gameId) {
        if (gameId != null) {
            return ApiResponse.ok(strategyRepository.findByGameId(gameId));
        }
        return ApiResponse.ok(strategyRepository.findAll());
    }

    @Operation(summary = "定价策略详情")
    @GetMapping("/strategies/{id}")
    public ApiResponse<PricingStrategy> getStrategy(@PathVariable Long id) {
        return strategyRepository.findById(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail("定价策略不存在"));
    }

    @Operation(summary = "更新策略状态")
    @PutMapping("/strategies/{id}/status")
    public ApiResponse<Map<String, Object>> updateStrategyStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return strategyRepository.findById(id).map(existing -> {
            existing.setStatus(body.get("status"));
            strategyRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("定价策略不存在"));
    }

    @Operation(summary = "定价推荐列表")
    @GetMapping("/recommendations")
    public ApiResponse<List<PricingRecommendation>> listRecommendations(@RequestParam(required = false) Long gameId) {
        if (gameId != null) {
            return ApiResponse.ok(recommendationRepository.findByGameId(gameId));
        }
        return ApiResponse.ok(recommendationRepository.findAll());
    }

    @Operation(summary = "更新推荐状态")
    @PutMapping("/recommendations/{id}/status")
    public ApiResponse<Map<String, Object>> updateRecommendation(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return recommendationRepository.findById(id).map(existing -> {
            existing.setStatus(body.get("status"));
            recommendationRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("推荐不存在"));
    }

    @Operation(summary = "获取分层收入基线（mock）")
    @GetMapping("/revenue-baseline")
    public ApiResponse<List<Map<String, Object>>> getRevenueBaseline(@RequestParam(required = false) Long gameId) {
        // TODO: compute real revenue baseline from payment data
        List<Map<String, Object>> baseline = new ArrayList<>();
        layerLogicRepo.findAll().forEach(layer -> {
            Map<String, Object> b = new HashMap<>();
            b.put("layerId", layer.getLayerId());
            b.put("layerName", layer.getLayerName());
            b.put("monthlyRevenue", 0.0);
            b.put("userCount", 0);
            b.put("arpu", 0.0);
            b.put("arppu", 0.0);
            baseline.add(b);
        });
        return ApiResponse.ok(baseline);
    }

    @Operation(summary = "价格模拟（mock，不调用AI）")
    @PostMapping("/simulate")
    public ApiResponse<Map<String, Object>> simulatePricing(@RequestBody Map<String, Object> body) {
        // TODO: implement LLM-based price simulation
        Map<String, Object> result = new HashMap<>();
        result.put("summary", "价格模拟功能需要配置AI服务后使用");
        result.put("totalRevenueChange", "N/A");
        result.put("layerResults", List.of());
        result.put("monthlyProjection", List.of());
        result.put("riskAssessment", Map.of(
                "overallRisk", "unknown",
                "warnings", List.of("AI服务未配置"),
                "opportunities", List.of()
        ));
        return ApiResponse.ok(result);
    }

    @Operation(summary = "AI生成定价建议（mock，不调用AI）")
    @PostMapping("/generate-advice")
    public ApiResponse<Map<String, Object>> generatePricingAdvice(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        // TODO: implement AI-powered pricing advice generation
        // Create a draft strategy record
        PricingStrategy strategy = new PricingStrategy();
        strategy.setGameId(body.get("gameId") instanceof Number n ? n.longValue() : null);
        strategy.setName("分层定价建议 - " + java.time.LocalDate.now());
        strategy.setDescription("AI定价建议功能需要配置AI服务后使用");
        strategy.setProductType(body.getOrDefault("productType", "iap").toString());
        strategy.setStatus("draft");
        if (auth != null) strategy.setCreatedBy(auth.getName());
        PricingStrategy saved = strategyRepository.save(strategy);

        Map<String, Object> advice = new HashMap<>();
        advice.put("summary", "AI定价建议功能需要配置AI服务后使用");
        advice.put("overallConfidence", 0);
        advice.put("recommendations", List.of());
        advice.put("keyInsights", List.of("请配置AI服务以获取智能定价建议"));
        advice.put("riskWarnings", List.of());

        Map<String, Object> result = new HashMap<>();
        result.put("strategyId", saved.getId());
        result.put("advice", advice);
        return ApiResponse.ok(result);
    }
}
