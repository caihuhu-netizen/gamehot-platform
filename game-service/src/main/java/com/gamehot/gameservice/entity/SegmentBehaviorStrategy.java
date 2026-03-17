package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "segment_behavior_strategies")
public class SegmentBehaviorStrategy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "strategy_id", nullable = false, length = 100)
    private String strategyId;

    @Column(name = "layer_id", nullable = false)
    private Integer layerId;

    @Column(name = "gift_type", nullable = false, length = 100)
    private String giftType;

    @Column(name = "first_push_condition_type", length = 100)
    private String firstPushConditionType;

    @Column(name = "first_push_condition_param")
    private Integer firstPushConditionParam;

    @Column(name = "push_condition_type", length = 100)
    private String pushConditionType;

    @Column(name = "push_condition_param")
    private Integer pushConditionParam;

    @Column(name = "push_gift_id")
    private Long pushGiftId;

    @Column(name = "push_gift_place", length = 100)
    private String pushGiftPlace;

    @Column(name = "cooldown_rule", length = 100)
    private String cooldownRule;

    @Column(name = "cooldown_rule_param1")
    private Integer cooldownRuleParam1;

    @Column(name = "cooldown_rule_param2")
    private Integer cooldownRuleParam2;

    @Column(name = "is_active")
    private Integer isActive = 1;

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
