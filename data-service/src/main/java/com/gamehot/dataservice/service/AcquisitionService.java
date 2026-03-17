package com.gamehot.dataservice.service;

import com.gamehot.dataservice.dto.CreateChannelRequest;
import com.gamehot.dataservice.dto.CreateCostRequest;
import com.gamehot.dataservice.dto.UpdateChannelRequest;
import com.gamehot.dataservice.model.AcquisitionChannel;
import com.gamehot.dataservice.model.AcquisitionCost;
import com.gamehot.dataservice.repository.AcquisitionChannelRepository;
import com.gamehot.dataservice.repository.AcquisitionCostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;

/**
 * Acquisition Service - 获客/渠道分析服务
 * 对应 TS: acquisition router + db/acquisition.ts
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AcquisitionService {

    private final AcquisitionChannelRepository channelRepo;
    private final AcquisitionCostRepository costRepo;
    private final JdbcTemplate jdbc;
    private final RedisTemplate<String, Object> redisTemplate;
    private static final Duration TTL = Duration.ofMinutes(5);

    // ==================== 渠道管理 ====================

    public List<AcquisitionChannel> listChannels(Integer gameId) {
        if (gameId != null) {
            return channelRepo.findAllActiveByGameId(gameId);
        }
        return channelRepo.findAllActive();
    }

    @Transactional
    public Map<String, Object> createChannel(CreateChannelRequest req) {
        AcquisitionChannel ch = new AcquisitionChannel();
        ch.setChannelCode(req.getChannelCode());
        ch.setChannelName(req.getChannelName());
        ch.setChannelType(req.getChannelType());
        ch.setPlatform(req.getPlatform());
        ch.setAttributionProvider(req.getAttributionProvider());
        ch.setAttributionConfig(req.getAttributionConfig());
        ch.setGameId(req.getGameId() != null ? req.getGameId() : 0);
        AcquisitionChannel saved = channelRepo.save(ch);
        return Map.of("id", saved.getId());
    }

    @Transactional
    public Map<String, Object> updateChannel(Long id, UpdateChannelRequest req) {
        AcquisitionChannel ch = channelRepo.findActiveById(id)
            .orElseThrow(() -> new IllegalArgumentException("Channel not found: " + id));
        if (req.getChannelName() != null) ch.setChannelName(req.getChannelName());
        if (req.getChannelType() != null) ch.setChannelType(req.getChannelType());
        if (req.getPlatform() != null) ch.setPlatform(req.getPlatform());
        if (req.getAttributionProvider() != null) ch.setAttributionProvider(req.getAttributionProvider());
        if (req.getAttributionConfig() != null) ch.setAttributionConfig(req.getAttributionConfig());
        if (req.getIsActive() != null) ch.setIsActive(req.getIsActive());
        channelRepo.save(ch);
        return Map.of("success", true);
    }

    @Transactional
    public Map<String, Object> deleteChannel(Long id) {
        channelRepo.softDelete(id);
        return Map.of("success", true);
    }

    // ==================== 获客成本 ====================

    public List<AcquisitionCost> listCosts(Long channelId, Integer gameId, String startDate, String endDate) {
        LocalDate sd = startDate != null ? LocalDate.parse(startDate) : null;
        LocalDate ed = endDate != null ? LocalDate.parse(endDate) : null;
        return costRepo.findWithFilters(channelId, gameId, sd, ed);
    }

    @Transactional
    public Map<String, Object> createCost(CreateCostRequest req) {
        AcquisitionCost c = new AcquisitionCost();
        c.setChannelId(req.getChannelId());
        c.setGameId(req.getGameId() != null ? req.getGameId() : 0);
        c.setCostDate(LocalDate.parse(req.getCostDate()));
        c.setSpend(new BigDecimal(req.getSpend()));
        c.setCurrency(req.getCurrency() != null ? req.getCurrency() : "USD");
        c.setImpressions(req.getImpressions() != null ? req.getImpressions() : 0L);
        c.setClicks(req.getClicks() != null ? req.getClicks() : 0L);
        long installs = req.getInstalls() != null ? req.getInstalls() : 0L;
        c.setInstalls(installs);
        double spend = Double.parseDouble(req.getSpend());
        if (installs > 0) {
            c.setCpi(BigDecimal.valueOf(spend / installs));
        }
        c.setCampaignName(req.getCampaignName());
        c.setAdGroupName(req.getAdGroupName());
        c.setCreativeName(req.getCreativeName());
        c.setCountryCode(req.getCountryCode());
        AcquisitionCost saved = costRepo.save(c);
        return Map.of("id", saved.getId());
    }

    // ==================== ROI 分析 ====================

    public List<Map<String, Object>> getROI(Integer gameId, String startDate, String endDate) {
        String cacheKey = String.format("acquisition:roi:g%s:%s:%s",
            gameId != null ? gameId : "all", startDate != null ? startDate : "", endDate != null ? endDate : "");
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return (List<Map<String, Object>>) cached;

        // Get cost by channel
        StringBuilder costSql = new StringBuilder(
            "SELECT channel_id, SUM(spend) as total_spend, SUM(installs) as total_installs " +
            "FROM acquisition_costs WHERE 1=1");
        if (gameId != null) costSql.append(" AND game_id = ").append(gameId);
        if (startDate != null) costSql.append(" AND cost_date >= '").append(startDate).append("'");
        if (endDate != null) costSql.append(" AND cost_date <= '").append(endDate).append("'");
        costSql.append(" GROUP BY channel_id");

        List<Map<String, Object>> costByChannel;
        try {
            costByChannel = jdbc.queryForList(costSql.toString());
        } catch (Exception e) {
            log.error("ROI cost query failed: {}", e.getMessage());
            costByChannel = List.of();
        }

        // Get revenue by channel from attributions
        StringBuilder revSql = new StringBuilder(
            "SELECT channel_id, SUM(total_revenue) as total_revenue, " +
            "AVG(ltv7) as avg_ltv7, AVG(ltv30) as avg_ltv30, AVG(ltv90) as avg_ltv90, " +
            "COUNT(*) as user_count, " +
            "SUM(is_retained_d1) as retained_d1, SUM(is_retained_d7) as retained_d7, SUM(is_retained_d30) as retained_d30 " +
            "FROM user_attributions WHERE 1=1");
        if (gameId != null) revSql.append(" AND game_id = ").append(gameId);
        if (startDate != null) revSql.append(" AND install_time >= '").append(startDate).append("'");
        if (endDate != null) revSql.append(" AND install_time <= '").append(endDate).append("'");
        revSql.append(" GROUP BY channel_id");

        List<Map<String, Object>> revByChannel;
        try {
            revByChannel = jdbc.queryForList(revSql.toString());
        } catch (Exception e) {
            log.warn("ROI attribution query failed (table may not exist): {}", e.getMessage());
            revByChannel = List.of();
        }

        Map<Object, Map<String, Object>> costMap = new HashMap<>();
        for (Map<String, Object> r : costByChannel) {
            costMap.put(r.get("channel_id"), r);
        }
        Map<Object, Map<String, Object>> revMap = new HashMap<>();
        for (Map<String, Object> r : revByChannel) {
            revMap.put(r.get("channel_id"), r);
        }

        List<AcquisitionChannel> channels = listChannels(gameId);
        List<Map<String, Object>> result = channels.stream().map(ch -> {
            Map<String, Object> cost = costMap.getOrDefault(ch.getId(), Map.of());
            Map<String, Object> rev = revMap.getOrDefault(ch.getId(), Map.of());

            double spend = toDouble(cost.get("total_spend"));
            double revenue = toDouble(rev.get("total_revenue"));
            long installs = toLong(cost.get("total_installs"));
            long userCount = toLong(rev.get("user_count"));

            Map<String, Object> row = new HashMap<>();
            row.put("channelId", ch.getId());
            row.put("channelCode", ch.getChannelCode());
            row.put("channelName", ch.getChannelName());
            row.put("channelType", ch.getChannelType());
            row.put("platform", ch.getPlatform());
            row.put("totalSpend", spend);
            row.put("totalInstalls", installs);
            row.put("cpi", installs > 0 ? Math.round(spend / installs * 10000.0) / 10000.0 : 0);
            row.put("totalRevenue", revenue);
            row.put("roas", spend > 0 ? Math.round(revenue / spend * 10000.0) / 10000.0 : 0);
            row.put("avgLtv7", toDouble(rev.get("avg_ltv7")));
            row.put("avgLtv30", toDouble(rev.get("avg_ltv30")));
            row.put("avgLtv90", toDouble(rev.get("avg_ltv90")));
            row.put("userCount", userCount);
            long d1 = toLong(rev.get("retained_d1"));
            long d7 = toLong(rev.get("retained_d7"));
            long d30 = toLong(rev.get("retained_d30"));
            row.put("retentionD1", userCount > 0 ? Math.round(d1 * 10000.0 / userCount) / 100.0 : 0);
            row.put("retentionD7", userCount > 0 ? Math.round(d7 * 10000.0 / userCount) / 100.0 : 0);
            row.put("retentionD30", userCount > 0 ? Math.round(d30 * 10000.0 / userCount) / 100.0 : 0);
            return row;
        }).toList();

        redisTemplate.opsForValue().set(cacheKey, result, TTL);
        return result;
    }

    // ==================== Helpers ====================

    private long toLong(Object val) {
        if (val == null) return 0;
        if (val instanceof Number) return ((Number) val).longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return 0; }
    }

    private double toDouble(Object val) {
        if (val == null) return 0;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try { return Double.parseDouble(val.toString()); } catch (Exception e) { return 0; }
    }
}
