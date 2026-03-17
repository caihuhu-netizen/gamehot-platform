package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "config_snapshots")
public class ConfigSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @Column(name = "snapshot_version", nullable = false, length = 50)
    private String snapshotVersion;

    @Column(name = "snapshot_name", nullable = false, length = 200)
    private String snapshotName;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "config_type", nullable = false, length = 50)
    private String configType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config_data", columnDefinition = "longtext")
    private Object configData;

    @Column(name = "previous_version_id")
    private Long previousVersionId;

    @Column(length = 50)
    private String status = "DRAFT";

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "published_by")
    private Long publishedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
