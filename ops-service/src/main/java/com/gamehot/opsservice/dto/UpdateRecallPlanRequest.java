package com.gamehot.opsservice.dto;

import lombok.Data;

@Data
public class UpdateRecallPlanRequest {
    private String name;
    private String channel;
    private String targetSegment;
    private String triggerCondition;
    private Integer triggerDays;
    private String reward;
    private String rewardConfig;
    private String message;
    private String status; // active, paused, completed, draft
    private String startDate;
    private String endDate;
}
