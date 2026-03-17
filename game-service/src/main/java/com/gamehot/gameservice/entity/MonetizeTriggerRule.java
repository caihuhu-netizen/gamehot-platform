package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Entity
@Table(name = "monetize_trigger_rules")
public class MonetizeTriggerRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_code", nullable = false, length = 100, unique = true)
    private String ruleCode;

    @Column(name = "rule_name", nullable = false, length = 200)
    private String ruleName;

    @Column(name = "scope_type", length = 50)
    private String scopeType = "GLOBAL";

    @Column(name = "scope_id")
    private Long scopeId = 0L;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "target_segments", columnDefinition = "json")
    private Object targetSegments;

    @Column(name = "trigger_event", nullable = false, length = 100)
    private String triggerEvent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "trigger_conditions", columnDefinition = "json")
    private Map<String, Object> triggerConditions;

    @Column(name = "popup_type", nullable = false, length = 50)
    private String popupType;

    @Column(name = "daily_limit")
    private Integer dailyLimit = 3;

    @Column(name = "total_cooldown_minutes")
    private Integer totalCooldownMinutes = 20;

    @Column(name = "after_pay_cooldown_minutes")
    private Integer afterPayCooldownMinutes = 30;

    @Column(name = "after_ad_cooldown_minutes")
    private Integer afterAdCooldownMinutes = 10;

    @Column(name = "priority")
    private Integer priority = 0;

    @Column(name = "is_active")
    private Integer isActive = 1;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

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
