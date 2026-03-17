package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Entity
@Table(name = "game_service_configs")
public class GameServiceConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @Column(name = "service_type", nullable = false, length = 100)
    private String serviceType;

    @Column(name = "service_name", nullable = false, length = 200)
    private String serviceName;

    @Column(name = "app_id", length = 200)
    private String appId;

    @Column(name = "app_name", length = 200)
    private String appName;

    @Column(name = "api_key", length = 500)
    private String apiKey;

    @Column(name = "api_secret", length = 500)
    private String apiSecret;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extra_config", columnDefinition = "json")
    private Map<String, Object> extraConfig;

    @Column(length = 50)
    private String status = "ACTIVE";

    @Column(name = "last_verified_at")
    private LocalDateTime lastVerifiedAt;

    @Column(name = "last_verified_status", length = 50)
    private String lastVerifiedStatus;

    @Column(name = "last_verified_message", length = 500)
    private String lastVerifiedMessage;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
