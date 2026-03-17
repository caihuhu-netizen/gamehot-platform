package com.gamehot.aiservice.dto;

import lombok.Data;

@Data
public class GenerateAiSuggestionRequest {
    private Long gameId;
    private String context;
    private String focusArea = "general";
}
