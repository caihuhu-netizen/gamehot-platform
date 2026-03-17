package com.gamehot.aiservice.dto;

import lombok.Data;
import java.util.Map;

@Data
public class CreateDecisionLogRequest {
    private String sourceType;
    private Long sourceId;
    private Long gameId;
    private String aiSuggestion;
    private String aiSuggestionType;
}
