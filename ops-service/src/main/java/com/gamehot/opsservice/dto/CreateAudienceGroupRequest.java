package com.gamehot.opsservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreateAudienceGroupRequest {
    private String name;
    private String description;
    private List<AudienceCondition> conditions;
    private String matchType; // all, any
    private Integer gameId;

    @Data
    public static class AudienceCondition {
        private String field;
        private String operator;
        private Object value;
    }
}
