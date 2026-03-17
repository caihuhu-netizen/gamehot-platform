package com.gamehot.opsservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "audience_templates")
public class AudienceTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(length = 50)
    private String icon;

    @Column(columnDefinition = "JSON", nullable = false)
    private String conditions;

    @Column(name = "match_type", length = 10)
    private String matchType = "all"; // all, any

    @Column(columnDefinition = "JSON")
    private String tags;

    @Column(name = "is_builtin")
    private Integer isBuiltin = 0;

    @Column(name = "use_count")
    private Integer useCount = 0;

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
