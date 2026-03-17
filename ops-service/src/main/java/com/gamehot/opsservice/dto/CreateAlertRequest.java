package com.gamehot.opsservice.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class CreateAlertRequest {
    private Integer gameId;
    private String alertType; // revenue_drop, revenue_spike, retention_drop, cpi_spike, fill_rate_drop
    private String severity; // critical, warning, info
    private String metricName;
    private String currentValue;
    private String expectedValue;
    private String deviationPercent;
    private BigDecimal threshold;
    private String alertDate; // YYYY-MM-DD
    private String description;
}
