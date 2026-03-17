package com.gamehot.opsservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreateAudienceTemplateRequest {
    private String name;
    private String description;
    private String category;
    private String icon;
    private List<AudienceCondition> conditions;
    private String matchType; // all, any
    private List<String> tags;

    @Data
    public static class AudienceCondition {
        private String field;
        private String operator;
        private Object value;
    }
}
