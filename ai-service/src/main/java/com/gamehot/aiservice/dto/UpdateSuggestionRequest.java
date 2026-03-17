package com.gamehot.aiservice.dto;

import lombok.Data;
import java.util.Map;

@Data
public class UpdateSuggestionRequest {
    private String title;
    private String description;
    private String category;
    private String priority;
    private String status;
    private Long targetVersionId;
    private Long implementedVersionId;
    private Map<String, Object> expectedImpact;
    private Map<String, Object> actualImpact;
    private Long assignedTo;
}
