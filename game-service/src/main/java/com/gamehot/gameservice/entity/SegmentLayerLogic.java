package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "segment_layer_logic")
public class SegmentLayerLogic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "layer_id", nullable = false)
    private Integer layerId;

    @Column(name = "layer_name", nullable = false, length = 100)
    private String layerName;

    @Column(name = "comment", columnDefinition = "text")
    private String comment;

    @Column(name = "interstitial_ad_first_level")
    private Integer interstitialAdFirstLevel = 10;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "interstitial_ad_frequency", columnDefinition = "json")
    private Object interstitialAdFrequency;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "push_gifts", columnDefinition = "json")
    private Object pushGifts;

    @Column(name = "is_active")
    private Integer isActive = 1;

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
