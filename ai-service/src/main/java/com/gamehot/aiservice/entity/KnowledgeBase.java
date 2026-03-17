package com.gamehot.aiservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "ai_knowledge_base")
public class KnowledgeBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "category", length = 50)
    private String category;

    @Column(name = "content", columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "tags", columnDefinition = "JSON")
    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> tags;

    @Column(name = "related_game_id")
    private Long relatedGameId;

    @Column(name = "related_module", length = 100)
    private String relatedModule;

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
