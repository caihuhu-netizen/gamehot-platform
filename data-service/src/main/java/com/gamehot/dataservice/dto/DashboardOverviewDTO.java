package com.gamehot.dataservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardOverviewDTO {
    private Object stats;
    private Object timeline;
    private Object enhanced;
    private Object profitData;
    private Object latestReport;
    private Object alertSummary;
}
