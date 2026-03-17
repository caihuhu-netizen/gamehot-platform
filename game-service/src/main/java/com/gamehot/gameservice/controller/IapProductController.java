package com.gamehot.gameservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.gameservice.entity.IapProduct;
import com.gamehot.gameservice.repository.IapProductRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "IapProduct", description = "IAP产品管理")
@RestController
@RequestMapping("/api/game/monetize/iap-products")
@RequiredArgsConstructor
public class IapProductController {

    private final IapProductRepository iapProductRepository;

    @Operation(summary = "IAP产品列表")
    @GetMapping
    public ApiResponse<List<IapProduct>> list(@RequestParam(required = false) Long gameId) {
        if (gameId != null) {
            return ApiResponse.ok(iapProductRepository.findByGameId(gameId));
        }
        return ApiResponse.ok(iapProductRepository.findAll());
    }

    @Operation(summary = "IAP产品详情")
    @GetMapping("/{id}")
    public ApiResponse<IapProduct> get(@PathVariable Long id) {
        return iapProductRepository.findById(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.fail("IAP产品不存在"));
    }

    @Operation(summary = "创建IAP产品")
    @PostMapping
    public ApiResponse<IapProduct> create(@RequestBody IapProduct body) {
        return ApiResponse.ok(iapProductRepository.save(body));
    }

    @Operation(summary = "更新IAP产品")
    @PutMapping("/{id}")
    public ApiResponse<Map<String, Object>> update(@PathVariable Long id, @RequestBody IapProduct body) {
        return iapProductRepository.findById(id).map(existing -> {
            if (body.getProductName() != null) existing.setProductName(body.getProductName());
            if (body.getCategory() != null) existing.setCategory(body.getCategory());
            if (body.getPriceUsd() != null) existing.setPriceUsd(body.getPriceUsd());
            if (body.getPriceCny() != null) existing.setPriceCny(body.getPriceCny());
            if (body.getDescription() != null) existing.setDescription(body.getDescription());
            if (body.getIconUrl() != null) existing.setIconUrl(body.getIconUrl());
            if (body.getStatus() != null) existing.setStatus(body.getStatus());
            if (body.getTargetSegments() != null) existing.setTargetSegments(body.getTargetSegments());
            if (body.getSortOrder() != null) existing.setSortOrder(body.getSortOrder());
            iapProductRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("IAP产品不存在"));
    }

    @Operation(summary = "删除IAP产品")
    @DeleteMapping("/{id}")
    public ApiResponse<Map<String, Object>> delete(@PathVariable Long id) {
        if (!iapProductRepository.existsById(id)) return ApiResponse.fail("IAP产品不存在");
        iapProductRepository.deleteById(id);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "IAP产品统计（mock）")
    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> stats(@RequestParam(required = false) Long gameId) {
        // TODO: implement real IAP stats from payment data
        long total = iapProductRepository.count();
        Map<String, Object> result = new HashMap<>();
        result.put("totalProducts", total);
        result.put("activeProducts", 0);
        result.put("topSellingProducts", List.of());
        result.put("revenueByProduct", List.of());
        return ApiResponse.ok(result);
    }
}
