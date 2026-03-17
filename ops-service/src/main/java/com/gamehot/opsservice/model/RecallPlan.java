package com.gamehot.opsservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "recall_plans")
public class RecallPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 50)
    private String channel = "push"; // push, sms, email, in_app

    @Column(name = "target_segment", length = 200)
    private String targetSegment;

    @Column(name = "trigger_condition", columnDefinition = "TEXT", nullable = false)
    private String triggerCondition;

    @Column(name = "trigger_days")
    private Integer triggerDays = 7;

    @Column(length = 200)
    private String reward;

    @Column(name = "reward_config", columnDefinition = "JSON")
    private String rewardConfig;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(length = 50)
    private String status = "draft"; // active, paused, completed, draft

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "total_targeted")
    private Integer totalTargeted = 0;

    @Column(name = "total_recalled")
    private Integer totalRecalled = 0;

    @Column(name = "total_converted")
    private Integer totalConverted = 0;

    @Column(name = "recall_rate", precision = 5, scale = 2)
    private BigDecimal recallRate;

    @Column(name = "conversion_rate", precision = 5, scale = 2)
    private BigDecimal conversionRate;

    @Column(name = "cost_per_recall", precision = 10, scale = 4)
    private BigDecimal costPerRecall;

    @Column(name = "game_id")
    private Integer gameId;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column
    private Integer deleted = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
