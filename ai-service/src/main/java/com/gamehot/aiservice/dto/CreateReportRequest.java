package com.gamehot.aiservice.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class CreateReportRequest {
    private String name;
    private String description;
    private String chartType;
    private List<Map<String, Object>> metrics;
    private List<Map<String, Object>> dimensions;
    private List<Map<String, Object>> filters;
    private String dateRange;
    private String sortBy;
    private String sortOrder;
    private Integer isPublic;
    private Long gameId;
}
