package com.gamehot.opsservice.dto;

import lombok.Data;

@Data
public class CreatePushTemplateRequest {
    private String name;
    private String category; // system, marketing, recall, event, custom
    private String channel; // push, in_app, email, sms
    private String title;
    private String content;
    private String variables; // JSON string
    private String description;
    private Integer gameId;
}
