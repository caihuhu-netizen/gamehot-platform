package com.gamehot.aiservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Entity
@Table(name = "ai_custom_reports")
public class CustomReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "chart_type", length = 20)
    private String chartType;

    @Column(name = "metrics", columnDefinition = "JSON")
    @JdbcTypeCode(SqlTypes.JSON)
    private List<Map<String, Object>> metrics;

    @Column(name = "dimensions", columnDefinition = "JSON")
    @JdbcTypeCode(SqlTypes.JSON)
    private List<Map<String, Object>> dimensions;

    @Column(name = "filters", columnDefinition = "JSON")
    @JdbcTypeCode(SqlTypes.JSON)
    private List<Map<String, Object>> filters;

    @Column(name = "date_range", length = 50)
    private String dateRange;

    @Column(name = "sort_by", length = 100)
    private String sortBy;

    @Column(name = "sort_order", length = 10)
    private String sortOrder;

    @Column(name = "is_public")
    private Integer isPublic = 0;

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
