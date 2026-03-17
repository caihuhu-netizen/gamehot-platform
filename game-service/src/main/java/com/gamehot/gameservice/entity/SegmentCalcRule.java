package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "segment_calc_rules")
public class SegmentCalcRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_type", nullable = false)
    private Integer ruleType;

    @Column(name = "target_layer", nullable = false)
    private Integer targetLayer;

    @Column(name = "purchase_amount", length = 50)
    private String purchaseAmount;

    @Column(name = "streak_login_times")
    private Integer streakLoginTimes;

    @Column(name = "total_login_times")
    private Integer totalLoginTimes;

    @Column(name = "online_duration")
    private Integer onlineDuration;

    @Column(name = "avg_daily_online_time")
    private Integer avgDailyOnlineTime;

    @Column(name = "complete_level_num")
    private Integer completeLevelNum;

    @Column(name = "avg_daily_complete_level_num")
    private Integer avgDailyCompleteLevelNum;

    @Column(name = "refresh_time")
    private Integer refreshTime = 86400;

    @Column(name = "is_active")
    private Integer isActive = 1;

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
