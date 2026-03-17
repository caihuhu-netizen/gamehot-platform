package com.gamehot.aiservice.dto;

import lombok.Data;
import java.util.Map;

@Data
public class UpdateDecisionEffectRequest {
    private Map<String, Object> effectMetricBefore;
    private Map<String, Object> effectMetricAfter;
    private String effectEvaluation;
    private String effectNote;
}
