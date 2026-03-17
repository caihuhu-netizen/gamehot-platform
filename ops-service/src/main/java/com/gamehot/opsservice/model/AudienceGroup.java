package com.gamehot.opsservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "audience_groups")
public class AudienceGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "JSON", nullable = false)
    private String conditions;

    @Column(name = "match_type", length = 10)
    private String matchType = "all"; // all, any

    @Column(name = "user_count")
    private Integer userCount = 0;

    @Column(length = 20)
    private String status = "active"; // active, paused, archived

    @Column(name = "game_id")
    private Integer gameId;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column
    private Integer deleted = 0;

    @Column(name = "last_calculated_at")
    private LocalDateTime lastCalculatedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
