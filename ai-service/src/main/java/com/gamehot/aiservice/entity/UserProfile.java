package com.gamehot.aiservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Entity
@Table(name = "ai_user_profiles")
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 100, unique = true)
    private String userId;

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "nickname", length = 100)
    private String nickname;

    @Column(name = "segment_level", length = 50)
    private String segmentLevel;

    @Column(name = "tags", columnDefinition = "JSON")
    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> tags;

    @Column(name = "total_pay_amount", precision = 12, scale = 2)
    private BigDecimal totalPayAmount;

    @Column(name = "pay_count")
    private Integer payCount;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "register_at")
    private LocalDateTime registerAt;

    @Column(name = "extra", columnDefinition = "JSON")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> extra;

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
