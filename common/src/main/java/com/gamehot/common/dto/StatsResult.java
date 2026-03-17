package com.gamehot.common.dto;

import lombok.Data;
import java.util.Map;

/**
 * 通用统计结果 DTO
 * 替代直接返回 Map<String,Object> 的统计响应
 */
@Data
public class StatsResult {
    private Map<String, Object> metrics;
    private String period;
    private long computedAt;

    public static StatsResult of(Map<String, Object> metrics) {
        StatsResult r = new StatsResult();
        r.metrics = metrics;
        r.computedAt = System.currentTimeMillis();
        return r;
    }
}
