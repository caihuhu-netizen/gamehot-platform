package com.gamehot.opsservice.dto;

import lombok.Data;

@Data
public class CreateRecallPlanRequest {
    private String name;
    private String channel; // push, sms, email, in_app
    private String targetSegment;
    private String triggerCondition;
    private Integer triggerDays;
    private String reward;
    private String rewardConfig; // JSON string
    private String message;
    private String startDate; // YYYY-MM-DD
    private String endDate;   // YYYY-MM-DD
    private Integer gameId;
}
