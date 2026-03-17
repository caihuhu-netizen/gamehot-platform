package com.gamehot.opsservice.dto;

import lombok.Data;

@Data
public class UpdatePushTaskRequest {
    private String name;
    private String type;
    private String title;
    private String content;
    private String targetType;
    private String targetConfig;
    private String scheduledAt;
    private String status; // draft, scheduled, sending, sent, failed, cancelled
}
