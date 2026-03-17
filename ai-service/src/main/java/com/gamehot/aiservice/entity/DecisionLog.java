package com.gamehot.aiservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Entity
@Table(name = "ai_decision_logs")
public class DecisionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_type", length = 50)
    private String sourceType;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "ai_suggestion", columnDefinition = "TEXT")
    private String aiSuggestion;

    @Column(name = "ai_suggestion_type", length = 50)
    private String aiSuggestionType;

    @Column(name = "human_action", length = 20)
    private String humanAction;

    @Column(name = "human_note", columnDefinition = "TEXT")
    private String humanNote;

    @Column(name = "modified_action", columnDefinition = "TEXT")
    private String modifiedAction;

    @Column(name = "operator_id")
    private Long operatorId;

    @Column(name = "operator_name", length = 100)
    private String operatorName;

    @Column(name = "effect_metric_before", columnDefinition = "JSON")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> effectMetricBefore;

    @Column(name = "effect_metric_after", columnDefinition = "JSON")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> effectMetricAfter;

    @Column(name = "effect_evaluation", length = 20)
    private String effectEvaluation;

    @Column(name = "effect_note", columnDefinition = "TEXT")
    private String effectNote;

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
