package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "iap_products")
public class IapProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false, length = 100, unique = true)
    private String productId;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(length = 50)
    private String category = "consumable";

    @Column(name = "price_usd", precision = 10, scale = 2)
    private BigDecimal priceUsd;

    @Column(name = "price_cny", precision = 10, scale = 2)
    private BigDecimal priceCny;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "icon_url", length = 500)
    private String iconUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "target_segments", columnDefinition = "json")
    private List<Integer> targetSegments;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @Column(length = 50)
    private String status = "active";

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
