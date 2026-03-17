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
@Table(name = "difficulty_curve_templates")
public class DifficultyCurveTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_code", nullable = false, length = 100)
    private String templateCode;

    @Column(name = "segment_level", nullable = false, length = 50)
    private String segmentLevel;

    @Column(name = "scope_type", length = 50)
    private String scopeType = "GLOBAL";

    @Column(name = "scope_id")
    private Long scopeId = 0L;

    @Column(name = "cycle_length")
    private Integer cycleLength = 7;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "level_configs", columnDefinition = "json")
    private Object levelConfigs;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "calibration_config", columnDefinition = "json")
    private Map<String, Object> calibrationConfig;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "monetize_trigger_config", columnDefinition = "json")
    private Map<String, Object> monetizeTriggerConfig;

    @Column(name = "is_default")
    private Integer isDefault = 0;

    @Column(name = "effective_from")
    private LocalDateTime effectiveFrom;

    @Column(name = "effective_to")
    private LocalDateTime effectiveTo;

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
