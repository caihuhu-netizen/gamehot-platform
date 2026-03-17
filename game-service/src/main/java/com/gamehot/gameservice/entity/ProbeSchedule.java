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
@Table(name = "probe_schedules")
public class ProbeSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "probe_code", nullable = false, length = 100)
    private String probeCode;

    @Column(name = "probe_type", nullable = false, length = 50)
    private String probeType;

    @Column(name = "level_id", nullable = false)
    private Long levelId;

    @Column(name = "scope_type", length = 50)
    private String scopeType = "GLOBAL";

    @Column(name = "scope_id")
    private Long scopeId = 0L;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "trigger_conditions", columnDefinition = "json")
    private Map<String, Object> triggerConditions;

    @Column(name = "insert_ratio", precision = 5, scale = 4)
    private BigDecimal insertRatio = new BigDecimal("0.13");

    @Column(name = "control_group_ratio", precision = 5, scale = 4)
    private BigDecimal controlGroupRatio = new BigDecimal("0.10");

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "active_days", columnDefinition = "json")
    private Object activeDays;

    @Column(name = "cooldown_levels")
    private Integer cooldownLevels = 3;

    @Column(name = "is_active")
    private Integer isActive = 1;

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
