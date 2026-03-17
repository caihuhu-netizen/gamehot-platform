package com.gamehot.opsservice.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreatePushTaskRequest {
    private String name;
    private String type; // system, marketing, recall, event
    private String title;
    private String content;
    private String targetType; // all, segment, audience, custom
    private String targetConfig; // JSON string
    private String scheduledAt; // ISO datetime string
    private Integer gameId;
}
