package com.gamehot.opsservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "push_templates")
public class PushTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 50)
    private String category = "custom"; // system, marketing, recall, event, custom

    @Column(length = 50)
    private String channel = "push"; // push, in_app, email, sms

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(columnDefinition = "JSON")
    private String variables;

    @Column(length = 500)
    private String description;

    @Column(name = "use_count")
    private Integer useCount = 0;

    @Column(name = "game_id")
    private Integer gameId;

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
