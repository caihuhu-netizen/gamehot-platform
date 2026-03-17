package com.gamehot.opsservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "push_tasks")
public class PushTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 50)
    private String type = "system"; // system, marketing, recall, event

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "target_type", length = 50)
    private String targetType = "all"; // all, segment, audience, custom

    @Column(name = "target_config", columnDefinition = "JSON")
    private String targetConfig;

    @Column(length = 50)
    private String status = "draft"; // draft, scheduled, sending, sent, failed, cancelled

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "total_target")
    private Integer totalTarget = 0;

    @Column(name = "total_sent")
    private Integer totalSent = 0;

    @Column(name = "total_delivered")
    private Integer totalDelivered = 0;

    @Column(name = "total_opened")
    private Integer totalOpened = 0;

    @Column(name = "total_clicked")
    private Integer totalClicked = 0;

    @Column(name = "delivery_rate", precision = 5, scale = 2)
    private BigDecimal deliveryRate;

    @Column(name = "open_rate", precision = 5, scale = 2)
    private BigDecimal openRate;

    @Column(name = "click_rate", precision = 5, scale = 2)
    private BigDecimal clickRate;

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
