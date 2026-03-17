package com.gamehot.opsservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "alert_rules")
public class AlertRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_name", nullable = false, length = 200)
    private String ruleName;

    @Column(name = "rule_type", length = 50, nullable = false)
    private String ruleType; // revenue, retention, cpi, fill_rate, custom

    @Column(length = 100, nullable = false)
    private String metric;

    @Column(length = 30, nullable = false)
    private String operator; // gt, lt, gte, lte, deviation_pct

    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal threshold;

    @Column(name = "comparison_window")
    private Integer comparisonWindow;

    @Column(length = 20)
    private String severity = "warning"; // critical, warning, info

    @Column(name = "game_id")
    private Integer gameId;

    @Column(name = "is_active")
    private Integer isActive = 1;

    @Column(name = "notify_owner")
    private Integer notifyOwner = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
