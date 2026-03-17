package com.gamehot.opsservice.dto;

import lombok.Data;

@Data
public class CreateScheduledTaskRequest {
    private Integer gameId;
    private String name;
    private String description;
    private String taskType;
    private String handler;
    private String cronExpression;
    private String timezone;
    private Integer enabled;
    private Integer timeoutSeconds;
    private Integer maxRetries;
    private String config; // JSON string
}
