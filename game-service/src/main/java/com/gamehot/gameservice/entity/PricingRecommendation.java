package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "pricing_recommendations")
public class PricingRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "layer_level")
    private Integer layerLevel;

    @Column(name = "layer_name", length = 100)
    private String layerName;

    @Column(name = "current_avg_price", length = 50)
    private String currentAvgPrice;

    @Column(name = "recommended_price", length = 50)
    private String recommendedPrice;

    @Column(name = "price_change_percent", length = 50)
    private String priceChangePercent;

    @Column(name = "expected_revenue_impact", length = 50)
    private String expectedRevenueImpact;

    @Column(columnDefinition = "text")
    private String reasoning;

    @Column(name = "model_version", length = 50)
    private String modelVersion;

    @Column(length = 50)
    private String status = "pending";

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
