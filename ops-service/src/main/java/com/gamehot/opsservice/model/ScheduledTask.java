package com.gamehot.opsservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "scheduled_tasks")
public class ScheduledTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id")
    private Integer gameId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "task_type", nullable = false, length = 100)
    private String taskType;

    @Column(nullable = false, length = 200)
    private String handler;

    @Column(name = "cron_expression", nullable = false, length = 100)
    private String cronExpression;

    @Column(length = 100)
    private String timezone = "Asia/Shanghai";

    @Column
    private Integer enabled = 1;

    @Column(name = "timeout_seconds")
    private Integer timeoutSeconds = 300;

    @Column(name = "max_retries")
    private Integer maxRetries = 3;

    @Column(columnDefinition = "JSON")
    private String config;

    @Column(name = "last_run_at")
    private LocalDateTime lastRunAt;

    @Column(name = "last_run_status", length = 20)
    private String lastRunStatus;

    @Column(name = "last_run_duration_ms")
    private Long lastRunDurationMs;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
