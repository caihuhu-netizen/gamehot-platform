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
@Table(name = "experiments")
public class Experiment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "experiment_code", nullable = false, length = 100, unique = true)
    private String experimentCode;

    @Column(name = "experiment_name", nullable = false, length = 200)
    private String experimentName;

    @Column(name = "experiment_type", nullable = false, length = 50)
    private String experimentType;

    @Column(name = "scope_type", length = 50)
    private String scopeType = "GLOBAL";

    @Column(name = "scope_id")
    private Long scopeId = 0L;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "target_segments", columnDefinition = "json")
    private Object targetSegments;

    @Column(name = "hypothesis", columnDefinition = "text")
    private String hypothesis;

    @Column(name = "primary_metric", nullable = false, length = 100)
    private String primaryMetric;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "secondary_metrics", columnDefinition = "json")
    private Object secondaryMetrics;

    @Column(name = "traffic_percent", precision = 5, scale = 2)
    private BigDecimal trafficPercent = new BigDecimal("1.00");

    @Column(length = 50)
    private String status = "DRAFT";

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

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
