package com.gamehot.aiservice.dto;

import lombok.Data;
import java.util.Map;

@Data
public class CreateSuggestionRequest {
    private Long gameId;
    private String title;
    private String description;
    private String category;
    private String priority = "medium";
    private String source = "manual";
    private Map<String, Object> dataEvidence;
    private Map<String, Object> expectedImpact;
    private Long assignedTo;
}
