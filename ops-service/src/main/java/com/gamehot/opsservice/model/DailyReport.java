package com.gamehot.opsservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "daily_reports")
public class DailyReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @Column(name = "game_id")
    private Integer gameId;

    @Column(length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "JSON")
    private String highlights;

    @Column(columnDefinition = "JSON")
    private String anomalies;

    @Column(columnDefinition = "JSON")
    private String recommendations;

    @Column(name = "full_content", columnDefinition = "MEDIUMTEXT")
    private String fullContent;

    @Column(name = "kpi_snapshot", columnDefinition = "JSON")
    private String kpiSnapshot;

    @Column(length = 20)
    private String status = "GENERATED"; // GENERATED, SENT, FAILED

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "generation_duration_ms")
    private Long generationDurationMs;

    @Column(name = "generated_by", length = 50)
    private String generatedBy = "ai";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
