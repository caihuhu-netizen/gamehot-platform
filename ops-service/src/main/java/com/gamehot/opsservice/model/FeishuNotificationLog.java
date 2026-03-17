package com.gamehot.opsservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "feishu_notification_logs")
public class FeishuNotificationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "webhook_config_id")
    private Long webhookConfigId;

    @Column(name = "event_type", length = 100)
    private String eventType;

    @Column(length = 200)
    private String title;

    @Column(name = "message_body", columnDefinition = "TEXT")
    private String messageBody;

    @Column(name = "http_status")
    private Integer httpStatus;

    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody;

    @Column(length = 20)
    private String status = "success"; // success, failed

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
