package com.gamehot.common.dto;

import lombok.Data;
import java.util.Map;

/**
 * 时间序列数据点 DTO
 * 用于图表/趋势数据，替代裸 Map
 */
@Data
public class TimeSeriesPoint {
    private String date;
    private double value;
    private String label;
    private Map<String, Object> extra;

    public static TimeSeriesPoint of(String date, double value) {
        TimeSeriesPoint p = new TimeSeriesPoint();
        p.date = date;
        p.value = value;
        return p;
    }
}
