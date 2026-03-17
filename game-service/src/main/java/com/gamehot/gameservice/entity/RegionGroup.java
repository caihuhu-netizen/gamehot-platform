package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "region_groups")
public class RegionGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_code", nullable = false, length = 50, unique = true)
    private String groupCode;

    @Column(name = "group_name", nullable = false, length = 200)
    private String groupName;

    @Column(name = "default_currency", length = 10)
    private String defaultCurrency = "USD";

    @Column(name = "default_language", length = 10)
    private String defaultLanguage = "en";

    @Column(name = "price_level", length = 20)
    private String priceLevel = "MID";

    @Column(name = "has_ads_enabled")
    private Integer hasAdsEnabled = 1;

    @Column(name = "has_iap_enabled")
    private Integer hasIapEnabled = 1;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
