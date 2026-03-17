package com.gamehot.dataservice.service;

import com.gamehot.dataservice.dto.CreateCategoryRequest;
import com.gamehot.dataservice.dto.CreateEntryRequest;
import com.gamehot.dataservice.model.CostCategory;
import com.gamehot.dataservice.model.CostEntry;
import com.gamehot.dataservice.repository.CostCategoryRepository;
import com.gamehot.dataservice.repository.CostEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;

/**
 * CostProfit Service - 成本利润分析服务
 * 对应 TS: costProfit router + db/costProfit.ts
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CostProfitService {

    private final CostCategoryRepository categoryRepo;
    private final CostEntryRepository entryRepo;
    private final JdbcTemplate jdbc;
    private final RedisTemplate<String, Object> redisTemplate;
    private static final Duration TTL = Duration.ofMinutes(5);
    private static final Duration TTL_LONG = Duration.ofMinutes(30);

    // ==================== 成本分类 ====================

    public List<CostCategory> listCategories() {
        String cacheKey = "cost:categories";
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return (List<CostCategory>) cached;
        List<CostCategory> result = categoryRepo.findAllActive();
        redisTemplate.opsForValue().set(cacheKey, result, TTL_LONG);
        return result;
    }

    @Transactional
    public Map<String, Object> createCategory(CreateCategoryRequest req) {
        CostCategory cat = new CostCategory();
        cat.setCategoryCode(req.getCategoryCode());
        cat.setCategoryName(req.getCategoryName());
        cat.setParentId(req.getParentId());
        cat.setSortOrder(req.getSortOrder() != null ? req.getSortOrder() : 0);
        CostCategory saved = categoryRepo.save(cat);
        redisTemplate.delete("cost:categories");
        return Map.of("id", saved.getId());
    }

    @Transactional
    public Map<String, Object> deleteCategory(Long id) {
        categoryRepo.softDelete(id);
        redisTemplate.delete("cost:categories");
        return Map.of("success", true);
    }

    // ==================== 成本录入 ====================

    public List<CostEntry> listEntries(Long categoryId, Integer gameId, String startDate, String endDate) {
        LocalDate sd = startDate != null ? LocalDate.parse(startDate) : null;
        LocalDate ed = endDate != null ? LocalDate.parse(endDate) : null;
        return entryRepo.findWithFilters(categoryId, gameId, sd, ed);
    }

    @Transactional
    public Map<String, Object> createEntry(CreateEntryRequest req) {
        CostEntry e = new CostEntry();
        e.setCategoryId(req.getCategoryId());
        e.setGameId(req.getGameId() != null ? req.getGameId() : 0);
        e.setCostDate(LocalDate.parse(req.getCostDate()));
        e.setAmount(new BigDecimal(req.getAmount()));
        e.setCurrency(req.getCurrency() != null ? req.getCurrency() : "USD");
        e.setDescription(req.getDescription());
        e.setSource(req.getSource() != null ? req.getSource() : "MANUAL");

        // Get current user name from security context
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() != null) {
            e.setCreatedBy(auth.getName());
        }

        CostEntry saved = entryRepo.save(e);
        // Invalidate profit caches
        redisTemplate.delete("profit:analysis");
        redisTemplate.delete("profit:trend");
        redisTemplate.delete("profit:breakdown");
        return Map.of("id", saved.getId());
    }

    // ==================== 利润分析 ====================

    public Map<String, Object> getProfitAnalysis(Integer gameId, String startDate, String endDate) {
        String cacheKey = String.format("profit:analysis:g%s:%s:%s",
            gameId != null ? gameId : "all", startDate != null ? startDate : "", endDate != null ? endDate : "");
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return (Map<String, Object>) cached;

        double iapRevenue = queryDouble(buildIapRevSql(startDate, endDate));
        double adRevenue = queryDouble(buildAdRevSql(gameId, startDate, endDate));
        double acquisitionCost = queryDouble(buildAcqCostSql(gameId, startDate, endDate));
        double otherCost = queryDouble(buildOtherCostSql(gameId, startDate, endDate));

        double totalRevenue = iapRevenue + adRevenue;
        double totalCost = acquisitionCost + otherCost;
        double profit = totalRevenue - totalCost;
        double margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        Map<String, Object> result = new HashMap<>();
        result.put("iapRevenue", iapRevenue);
        result.put("adRevenue", adRevenue);
        result.put("totalRevenue", totalRevenue);
        result.put("acquisitionCost", acquisitionCost);
        result.put("otherCost", otherCost);
        result.put("totalCost", totalCost);
        result.put("profit", profit);
        result.put("margin", Math.round(margin * 100.0) / 100.0);

        redisTemplate.opsForValue().set(cacheKey, result, TTL);
        return result;
    }

    // ==================== 利润趋势 ====================

    public List<Map<String, Object>> getProfitTrend(Integer gameId, String startDate, String endDate) {
        String cacheKey = String.format("profit:trend:g%s:%s:%s",
            gameId != null ? gameId : "all", startDate != null ? startDate : "", endDate != null ? endDate : "");
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return (List<Map<String, Object>>) cached;

        // IAP revenue by date
        StringBuilder iapSql = new StringBuilder(
            "SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, " +
            "COALESCE(SUM(CAST(amount_usd AS DECIMAL(12,2))), 0) as revenue " +
            "FROM user_payment_records WHERE status = 'COMPLETED'");
        if (startDate != null) iapSql.append(" AND created_at >= '").append(startDate).append("'");
        if (endDate != null) iapSql.append(" AND created_at <= '").append(endDate).append(" 23:59:59'");
        iapSql.append(" GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')");
        List<Map<String, Object>> iapByDate = queryList(iapSql.toString());

        // Ad revenue by date
        StringBuilder adSql = new StringBuilder(
            "SELECT DATE_FORMAT(revenue_date, '%Y-%m-%d') as date, " +
            "COALESCE(SUM(revenue), 0) as revenue FROM ad_revenue_daily WHERE 1=1");
        if (gameId != null) adSql.append(" AND game_id = ").append(gameId);
        if (startDate != null) adSql.append(" AND revenue_date >= '").append(startDate).append("'");
        if (endDate != null) adSql.append(" AND revenue_date <= '").append(endDate).append("'");
        adSql.append(" GROUP BY revenue_date");
        List<Map<String, Object>> adByDate = queryList(adSql.toString());

        // Acquisition cost by date
        StringBuilder acqSql = new StringBuilder(
            "SELECT DATE_FORMAT(cost_date, '%Y-%m-%d') as date, " +
            "COALESCE(SUM(spend), 0) as cost FROM acquisition_costs WHERE 1=1");
        if (gameId != null) acqSql.append(" AND game_id = ").append(gameId);
        if (startDate != null) acqSql.append(" AND cost_date >= '").append(startDate).append("'");
        if (endDate != null) acqSql.append(" AND cost_date <= '").append(endDate).append("'");
        acqSql.append(" GROUP BY cost_date");
        List<Map<String, Object>> acqByDate = queryList(acqSql.toString());

        // Other cost by date
        StringBuilder otherSql = new StringBuilder(
            "SELECT DATE_FORMAT(cost_date, '%Y-%m-%d') as date, " +
            "COALESCE(SUM(amount), 0) as cost FROM cost_entries WHERE deleted = 0");
        if (gameId != null) otherSql.append(" AND game_id = ").append(gameId);
        if (startDate != null) otherSql.append(" AND cost_date >= '").append(startDate).append("'");
        if (endDate != null) otherSql.append(" AND cost_date <= '").append(endDate).append("'");
        otherSql.append(" GROUP BY cost_date");
        List<Map<String, Object>> otherByDate = queryList(otherSql.toString());

        // Merge by date
        Map<String, double[]> dateMap = new TreeMap<>(); // [iapRev, adRev, acqCost, otherCost]
        for (Map<String, Object> r : iapByDate) {
            String d = r.get("date").toString();
            dateMap.computeIfAbsent(d, k -> new double[4])[0] = toDouble(r.get("revenue"));
        }
        for (Map<String, Object> r : adByDate) {
            String d = r.get("date").toString();
            dateMap.computeIfAbsent(d, k -> new double[4])[1] = toDouble(r.get("revenue"));
        }
        for (Map<String, Object> r : acqByDate) {
            String d = r.get("date").toString();
            dateMap.computeIfAbsent(d, k -> new double[4])[2] = toDouble(r.get("cost"));
        }
        for (Map<String, Object> r : otherByDate) {
            String d = r.get("date").toString();
            dateMap.computeIfAbsent(d, k -> new double[4])[3] = toDouble(r.get("cost"));
        }

        List<Map<String, Object>> result = dateMap.entrySet().stream().map(e -> {
            double[] v = e.getValue();
            double totalRev = v[0] + v[1];
            double totalCost = v[2] + v[3];
            Map<String, Object> row = new HashMap<>();
            row.put("date", e.getKey());
            row.put("iapRevenue", v[0]);
            row.put("adRevenue", v[1]);
            row.put("totalRevenue", totalRev);
            row.put("acqCost", v[2]);
            row.put("otherCost", v[3]);
            row.put("totalCost", totalCost);
            row.put("profit", totalRev - totalCost);
            return row;
        }).toList();

        redisTemplate.opsForValue().set(cacheKey, result, TTL);
        return result;
    }

    // ==================== 成本构成 ====================

    public List<Map<String, Object>> getCostBreakdown(Integer gameId, String startDate, String endDate) {
        String cacheKey = String.format("profit:breakdown:g%s:%s:%s",
            gameId != null ? gameId : "all", startDate != null ? startDate : "", endDate != null ? endDate : "");
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return (List<Map<String, Object>>) cached;

        StringBuilder sql = new StringBuilder(
            "SELECT ce.category_id, cc.category_name, SUM(ce.amount) as total_amount, COUNT(*) as entry_count " +
            "FROM cost_entries ce " +
            "LEFT JOIN cost_categories cc ON ce.category_id = cc.id " +
            "WHERE ce.deleted = 0");
        if (gameId != null) sql.append(" AND ce.game_id = ").append(gameId);
        if (startDate != null) sql.append(" AND ce.cost_date >= '").append(startDate).append("'");
        if (endDate != null) sql.append(" AND ce.cost_date <= '").append(endDate).append("'");
        sql.append(" GROUP BY ce.category_id, cc.category_name");

        List<Map<String, Object>> result = queryList(sql.toString());
        redisTemplate.opsForValue().set(cacheKey, result, TTL);
        return result;
    }

    // ==================== SQL builders & helpers ====================

    private String buildIapRevSql(String startDate, String endDate) {
        StringBuilder s = new StringBuilder(
            "SELECT COALESCE(SUM(CAST(amount_usd AS DECIMAL(12,2))), 0) FROM user_payment_records WHERE status = 'COMPLETED'");
        if (startDate != null) s.append(" AND created_at >= '").append(startDate).append("'");
        if (endDate != null) s.append(" AND created_at <= '").append(endDate).append(" 23:59:59'");
        return s.toString();
    }

    private String buildAdRevSql(Integer gameId, String startDate, String endDate) {
        StringBuilder s = new StringBuilder("SELECT COALESCE(SUM(revenue), 0) FROM ad_revenue_daily WHERE 1=1");
        if (gameId != null) s.append(" AND game_id = ").append(gameId);
        if (startDate != null) s.append(" AND revenue_date >= '").append(startDate).append("'");
        if (endDate != null) s.append(" AND revenue_date <= '").append(endDate).append("'");
        return s.toString();
    }

    private String buildAcqCostSql(Integer gameId, String startDate, String endDate) {
        StringBuilder s = new StringBuilder("SELECT COALESCE(SUM(spend), 0) FROM acquisition_costs WHERE 1=1");
        if (gameId != null) s.append(" AND game_id = ").append(gameId);
        if (startDate != null) s.append(" AND cost_date >= '").append(startDate).append("'");
        if (endDate != null) s.append(" AND cost_date <= '").append(endDate).append("'");
        return s.toString();
    }

    private String buildOtherCostSql(Integer gameId, String startDate, String endDate) {
        StringBuilder s = new StringBuilder("SELECT COALESCE(SUM(amount), 0) FROM cost_entries WHERE deleted = 0");
        if (gameId != null) s.append(" AND game_id = ").append(gameId);
        if (startDate != null) s.append(" AND cost_date >= '").append(startDate).append("'");
        if (endDate != null) s.append(" AND cost_date <= '").append(endDate).append("'");
        return s.toString();
    }

    private double queryDouble(String sql) {
        try {
            Object v = jdbc.queryForObject(sql, Object.class);
            return toDouble(v);
        } catch (Exception e) {
            log.warn("queryDouble failed: {}", e.getMessage());
            return 0;
        }
    }

    private List<Map<String, Object>> queryList(String sql) {
        try {
            return jdbc.queryForList(sql);
        } catch (Exception e) {
            log.warn("queryList failed: {}", e.getMessage());
            return List.of();
        }
    }

    private double toDouble(Object val) {
        if (val == null) return 0;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try { return Double.parseDouble(val.toString()); } catch (Exception e) { return 0; }
    }
}
