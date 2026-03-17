package com.gamehot.opsservice.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class CreateAlertRuleRequest {
    private String ruleName;
    private String ruleType; // revenue, retention, cpi, fill_rate, custom
    private String metric;
    private String operator; // gt, lt, gte, lte, deviation_pct
    private BigDecimal threshold;
    private Integer comparisonWindow;
    private String severity; // critical, warning, info
    private Integer gameId;
    private Integer notifyOwner;
}
