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
@Table(name = "experiment_variants")
public class ExperimentVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "experiment_id", nullable = false)
    private Long experimentId;

    @Column(name = "variant_code", nullable = false, length = 100)
    private String variantCode;

    @Column(name = "variant_name", nullable = false, length = 200)
    private String variantName;

    @Column(name = "traffic_percent", precision = 5, scale = 2)
    private BigDecimal trafficPercent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "override_config", columnDefinition = "json")
    private Map<String, Object> overrideConfig;

    @Column(name = "is_control")
    private Integer isControl = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
