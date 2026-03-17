package com.gamehot.aiservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Entity
@Table(name = "ai_export_tasks")
public class ExportTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", length = 100)
    private String userId;

    @Column(name = "data_source", length = 100)
    private String dataSource;

    @Column(name = "data_source_label", length = 200)
    private String dataSourceLabel;

    @Column(name = "format", length = 10)
    private String format;

    @Column(name = "filters", columnDefinition = "JSON")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> filters;

    @Column(name = "status", length = 20)
    private String status = "pending";

    @Column(name = "total_rows")
    private Long totalRows;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @Column(name = "file_key", length = 300)
    private String fileKey;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
