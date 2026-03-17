package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Entity
@Table(name = "game_projects")
public class GameProject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_code", nullable = false, length = 50, unique = true)
    private String gameCode;

    @Column(name = "game_name", nullable = false, length = 200)
    private String gameName;

    @Column(name = "game_icon", length = 500)
    private String gameIcon;

    @Column(length = 50)
    private String genre = "CASUAL";

    @Column(length = 50)
    private String platform = "ALL";

    @Column(name = "bundle_id", length = 200)
    private String bundleId;

    @Column(name = "store_url", length = 500)
    private String storeUrl;

    @Column(length = 100)
    private String timezone = "UTC";

    @Column(name = "sdk_api_key", length = 100)
    private String sdkApiKey;

    @Column(name = "sdk_secret", length = 100)
    private String sdkSecret;

    @Column(length = 50)
    private String status = "ACTIVE";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private Map<String, Object> settings;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
