package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "item_prices")
public class ItemPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "scope_type", length = 50)
    private String scopeType = "GLOBAL";

    @Column(name = "scope_id")
    private Long scopeId = 0L;

    @Column(name = "currency_code", length = 10)
    private String currencyCode = "USD";

    @Column(name = "original_price", precision = 10, scale = 2)
    private BigDecimal originalPrice;

    @Column(name = "sale_price", precision = 10, scale = 2)
    private BigDecimal salePrice;

    @Column(name = "store_product_id", length = 100)
    private String storeProductId;

    @Column(name = "price_tag", length = 50)
    private String priceTag;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
