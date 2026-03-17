package com.gamehot.dataservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "acquisition_channels")
public class AcquisitionChannel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "channel_code", nullable = false, length = 50)
    private String channelCode;

    @Column(name = "channel_name", nullable = false, length = 100)
    private String channelName;

    @Column(name = "channel_type", nullable = false, length = 20)
    private String channelType; // PAID, ORGANIC, REFERRAL, SOCIAL, DIRECT

    @Column(name = "platform", length = 50)
    private String platform;

    @Column(name = "attribution_provider", length = 30)
    private String attributionProvider; // APPSFLYER, ADJUST, SINGULAR, BRANCH, NONE

    @Column(name = "attribution_config", columnDefinition = "JSON")
    private String attributionConfig;

    @Column(name = "game_id")
    private Integer gameId;

    @Column(name = "is_active")
    private Integer isActive = 1;

    @Column(name = "deleted")
    private Integer deleted = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
