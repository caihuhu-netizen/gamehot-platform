package com.gamehot.opsservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "feishu_webhook_configs")
public class FeishuWebhookConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(name = "webhook_url", nullable = false, length = 500)
    private String webhookUrl;

    @Column(length = 200)
    private String secret;

    @Column(name = "event_types", columnDefinition = "JSON")
    private String eventTypes;

    @Column(length = 500)
    private String description;

    @Column
    private Integer enabled = 1;

    @Column(name = "created_by")
    private Integer createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
