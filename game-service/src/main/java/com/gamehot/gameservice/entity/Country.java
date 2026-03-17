package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Entity
@Table(name = "countries")
public class Country {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "country_code", nullable = false, length = 10, unique = true)
    private String countryCode;

    @Column(name = "country_name", nullable = false, length = 200)
    private String countryName;

    @Column(name = "region_group_id", nullable = false)
    private Long regionGroupId;

    @Column(name = "currency_code", length = 10)
    private String currencyCode = "USD";

    @Column(name = "language_code", length = 10)
    private String languageCode = "en";

    @Column(length = 100)
    private String timezone = "UTC";

    @Column(name = "price_multiplier", precision = 10, scale = 4)
    private BigDecimal priceMultiplier = BigDecimal.ONE;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ad_network_priority", columnDefinition = "json")
    private Map<String, Object> adNetworkPriority;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "legal_config", columnDefinition = "json")
    private Map<String, Object> legalConfig;

    @Column(name = "is_active")
    private Integer isActive = 1;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
