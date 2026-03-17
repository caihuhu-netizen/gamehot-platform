package com.gamehot.gameservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.gamehot.gameservice.entity.Country;
import com.gamehot.gameservice.entity.GameItem;
import com.gamehot.gameservice.entity.ItemPrice;
import com.gamehot.gameservice.entity.RegionGroup;
import com.gamehot.gameservice.repository.CountryRepository;
import com.gamehot.gameservice.repository.GameItemRepository;
import com.gamehot.gameservice.repository.ItemPriceRepository;
import com.gamehot.gameservice.repository.RegionGroupRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Config", description = "游戏基础配置（地区/国家/道具/价格）")
@RestController
@RequestMapping("/api/game/configs")
@RequiredArgsConstructor
public class ConfigController {

    private final RegionGroupRepository regionGroupRepository;
    private final CountryRepository countryRepository;
    private final GameItemRepository itemRepository;
    private final ItemPriceRepository itemPriceRepository;

    // ==================== Region Groups ====================

    @Operation(summary = "地区分组列表")
    @GetMapping("/region-groups")
    public ApiResponse<List<RegionGroup>> listRegionGroups() {
        return ApiResponse.ok(regionGroupRepository.findAll());
    }

    @Operation(summary = "创建地区分组")
    @PostMapping("/region-groups")
    public ApiResponse<Map<String, Object>> createRegionGroup(@RequestBody RegionGroup body) {
        regionGroupRepository.save(body);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "更新地区分组")
    @PutMapping("/region-groups/{id}")
    public ApiResponse<Map<String, Object>> updateRegionGroup(@PathVariable Long id, @RequestBody RegionGroup body) {
        return regionGroupRepository.findById(id).map(existing -> {
            if (body.getGroupName() != null) existing.setGroupName(body.getGroupName());
            if (body.getDefaultCurrency() != null) existing.setDefaultCurrency(body.getDefaultCurrency());
            if (body.getDefaultLanguage() != null) existing.setDefaultLanguage(body.getDefaultLanguage());
            if (body.getPriceLevel() != null) existing.setPriceLevel(body.getPriceLevel());
            if (body.getHasAdsEnabled() != null) existing.setHasAdsEnabled(body.getHasAdsEnabled());
            if (body.getHasIapEnabled() != null) existing.setHasIapEnabled(body.getHasIapEnabled());
            regionGroupRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("地区分组不存在"));
    }

    // ==================== Countries ====================

    @Operation(summary = "国家列表")
    @GetMapping("/countries")
    public ApiResponse<List<Country>> listCountries() {
        return ApiResponse.ok(countryRepository.findAll());
    }

    @Operation(summary = "创建国家")
    @PostMapping("/countries")
    public ApiResponse<Map<String, Object>> createCountry(@RequestBody Country body) {
        countryRepository.save(body);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "更新国家")
    @PutMapping("/countries/{id}")
    public ApiResponse<Map<String, Object>> updateCountry(@PathVariable Long id, @RequestBody Country body) {
        return countryRepository.findById(id).map(existing -> {
            if (body.getCountryName() != null) existing.setCountryName(body.getCountryName());
            if (body.getRegionGroupId() != null) existing.setRegionGroupId(body.getRegionGroupId());
            if (body.getCurrencyCode() != null) existing.setCurrencyCode(body.getCurrencyCode());
            if (body.getLanguageCode() != null) existing.setLanguageCode(body.getLanguageCode());
            if (body.getTimezone() != null) existing.setTimezone(body.getTimezone());
            if (body.getPriceMultiplier() != null) existing.setPriceMultiplier(body.getPriceMultiplier());
            if (body.getIsActive() != null) existing.setIsActive(body.getIsActive());
            countryRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("国家不存在"));
    }

    // ==================== Items ====================

    @Operation(summary = "道具列表")
    @GetMapping("/items")
    public ApiResponse<List<GameItem>> listItems() {
        return ApiResponse.ok(itemRepository.findAll());
    }

    @Operation(summary = "创建道具")
    @PostMapping("/items")
    public ApiResponse<Map<String, Object>> createItem(@RequestBody GameItem body) {
        itemRepository.save(body);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "更新道具")
    @PutMapping("/items/{id}")
    public ApiResponse<Map<String, Object>> updateItem(@PathVariable Long id, @RequestBody GameItem body) {
        return itemRepository.findById(id).map(existing -> {
            if (body.getItemName() != null) existing.setItemName(body.getItemName());
            if (body.getItemType() != null) existing.setItemType(body.getItemType());
            if (body.getDescription() != null) existing.setDescription(body.getDescription());
            if (body.getEffectConfig() != null) existing.setEffectConfig(body.getEffectConfig());
            if (body.getIsConsumable() != null) existing.setIsConsumable(body.getIsConsumable());
            itemRepository.save(existing);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            return ApiResponse.ok(result);
        }).orElse(ApiResponse.fail("道具不存在"));
    }

    // ==================== Item Prices ====================

    @Operation(summary = "道具价格列表")
    @GetMapping("/item-prices")
    public ApiResponse<List<ItemPrice>> listItemPrices(@RequestParam(required = false) Long itemId) {
        if (itemId != null) {
            return ApiResponse.ok(itemPriceRepository.findByItemId(itemId));
        }
        return ApiResponse.ok(itemPriceRepository.findAll());
    }

    @Operation(summary = "创建道具价格")
    @PostMapping("/item-prices")
    public ApiResponse<Map<String, Object>> createItemPrice(@RequestBody ItemPrice body) {
        itemPriceRepository.save(body);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return ApiResponse.ok(result);
    }
}
