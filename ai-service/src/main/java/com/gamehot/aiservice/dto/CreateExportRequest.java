package com.gamehot.aiservice.dto;

import lombok.Data;
import java.util.Map;

@Data
public class CreateExportRequest {
    private String dataSource;
    private String dataSourceLabel;
    private String format = "csv";
    private Map<String, Object> filters;
    private Boolean enableMasking = false;
    private Long gameId;
}
