package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Entity
@Table(name = "pricing_strategies")
public class PricingStrategy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id")
    private Long gameId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "target_layers", columnDefinition = "json")
    private List<Integer> targetLayers;

    @Column(name = "product_type", length = 50)
    private String productType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pricing_rules", columnDefinition = "json")
    private Object pricingRules;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_analysis", columnDefinition = "json")
    private Map<String, Object> aiAnalysis;

    @Column(name = "confidence_score", length = 20)
    private String confidenceScore;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(length = 50)
    private String status = "draft";

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
