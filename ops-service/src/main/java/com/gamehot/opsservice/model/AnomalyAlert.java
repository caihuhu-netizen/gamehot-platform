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
@Table(name = "anomaly_alerts")
public class AnomalyAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id")
    private Integer gameId;

    @Column(name = "alert_type", length = 50, nullable = false)
    private String alertType; // revenue_drop, revenue_spike, retention_drop, cpi_spike, fill_rate_drop

    @Column(length = 20)
    private String severity = "warning"; // critical, warning, info

    @Column(name = "metric_name", length = 100, nullable = false)
    private String metricName;

    @Column(name = "current_value", length = 100)
    private String currentValue;

    @Column(name = "expected_value", length = 100)
    private String expectedValue;

    @Column(name = "deviation_percent", length = 50)
    private String deviationPercent;

    @Column(precision = 15, scale = 4)
    private BigDecimal threshold;

    @Column(name = "alert_date")
    private LocalDate alertDate;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 20)
    private String status = "open"; // open, acknowledged, resolved

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
