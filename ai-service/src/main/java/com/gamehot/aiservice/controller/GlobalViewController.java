package com.gamehot.aiservice.controller;

import com.gamehot.common.response.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Tag(name = "全球视图", description = "全球统一业务视图，支持多时区、多币种")
@RestController
@RequestMapping("/api/ai/global-view")
@RequiredArgsConstructor
public class GlobalViewController {

    private final JdbcTemplate jdbc;

    // 默认汇率（以 USD 为基准，rate_to_usd = 1 USD 换多少该货币）
    private static final Map<String, Double> DEFAULT_RATES = new LinkedHashMap<>();
    static {
        DEFAULT_RATES.put("USD", 1.0);
        DEFAULT_RATES.put("CNY", 7.25);
        DEFAULT_RATES.put("EUR", 0.92);
        DEFAULT_RATES.put("JPY", 151.5);
        DEFAULT_RATES.put("KRW", 1320.0);
        DEFAULT_RATES.put("SGD", 1.35);
        DEFAULT_RATES.put("MYR", 4.72);
        DEFAULT_RATES.put("THB", 36.5);
        DEFAULT_RATES.put("VND", 25000.0);
        DEFAULT_RATES.put("IDR", 15800.0);
        DEFAULT_RATES.put("PHP", 56.5);
        DEFAULT_RATES.put("BRL", 5.0);
        DEFAULT_RATES.put("INR", 83.5);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. GET /api/ai/global-view/summary
    // ──────────────────────────────────────────────────────────────────────────
    @Operation(summary = "全球总览", description = "按地区聚合用户数、收入、ARPU 等核心指标")
    @GetMapping("/summary")
    public ApiResponse<Map<String, Object>> summary() {
        ensureDefaultRates();

        // ── 汇率 ──
        Map<String, Double> rates = loadCurrentRates();

        // ── 各地区用户数 ──
        List<Map<String, Object>> userByRegion = jdbc.queryForList(
            "SELECT region_group_code AS region, COUNT(*) AS userCount " +
            "FROM game_users WHERE deleted = 0 " +
            "GROUP BY region_group_code ORDER BY userCount DESC"
        );
        long globalDau = userByRegion.stream()
            .mapToLong(r -> toLong(r.get("userCount"))).sum();

        // ── 各货币支付总额（换算 USD）──
        List<Map<String, Object>> payByCurrency = jdbc.queryForList(
            "SELECT currency, SUM(amount) AS totalAmount " +
            "FROM user_payment_records WHERE status = 'COMPLETED' " +
            "GROUP BY currency"
        );
        double totalPaymentUsd = payByCurrency.stream().mapToDouble(r -> {
            String cur = (String) r.get("currency");
            double amt = toDouble(r.get("totalAmount"));
            return convertToUsd(amt, cur, rates);
        }).sum();

        // ── 广告收入 最近30天（换算 USD）──
        List<Map<String, Object>> adByCountry = jdbc.queryForList(
            "SELECT country_code, currency, SUM(revenue) AS totalRevenue " +
            "FROM ad_revenue_daily " +
            "WHERE revenue_date >= CURDATE() - INTERVAL 30 DAY " +
            "GROUP BY country_code, currency"
        );
        double totalAdUsd = adByCountry.stream().mapToDouble(r -> {
            String cur = (String) r.get("currency");
            double amt = toDouble(r.get("totalRevenue"));
            return convertToUsd(amt, cur, rates);
        }).sum();

        double totalRevenueUsd = totalPaymentUsd + totalAdUsd;

        // ── 各地区收入（支付，USD）──
        Map<String, Double> regionPayUsd = new HashMap<>();
        try {
            List<Map<String, Object>> payByRegion = jdbc.queryForList(
                "SELECT gu.region_group_code AS region, upr.currency, SUM(upr.amount) AS totalAmount " +
                "FROM user_payment_records upr " +
                "JOIN game_users gu ON upr.user_id = gu.user_id " +
                "WHERE upr.status = 'COMPLETED' " +
                "GROUP BY gu.region_group_code, upr.currency"
            );
            for (Map<String, Object> r : payByRegion) {
                String region = (String) r.get("region");
                if (region == null) region = "OTHER";
                double usd = convertToUsd(toDouble(r.get("totalAmount")), (String) r.get("currency"), rates);
                regionPayUsd.merge(region, usd, Double::sum);
            }
        } catch (Exception e) {
            log.warn("地区支付收入聚合异常: {}", e.getMessage());
        }

        // ── 构建 regionStats ──
        List<Map<String, Object>> regionStats = new ArrayList<>();
        for (Map<String, Object> row : userByRegion) {
            String region = (String) row.get("region");
            if (region == null) region = "OTHER";
            long userCount = toLong(row.get("userCount"));
            double revenueUsd = regionPayUsd.getOrDefault(region, 0.0);
            double arpu = userCount > 0 ? revenueUsd / userCount : 0.0;
            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("region", region);
            stat.put("userCount", userCount);
            stat.put("revenueUsd", round2(revenueUsd));
            stat.put("arpu", round2(arpu));
            regionStats.add(stat);
        }

        // ── Top 10 国家（按广告收入 USD 排序）──
        Map<String, Double> countryAdUsd = new HashMap<>();
        for (Map<String, Object> r : adByCountry) {
            String cc = (String) r.get("country_code");
            if (cc == null) cc = "UNKNOWN";
            double usd = convertToUsd(toDouble(r.get("totalRevenue")), (String) r.get("currency"), rates);
            countryAdUsd.merge(cc, usd, Double::sum);
        }
        List<Map<String, Object>> topCountries = countryAdUsd.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .limit(10)
            .map(e -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("countryCode", e.getKey());
                m.put("revenueUsd", round2(e.getValue()));
                return m;
            })
            .collect(Collectors.toList());

        // 补充国家名称
        try {
            List<Map<String, Object>> countryNames = jdbc.queryForList(
                "SELECT country_code, country_name FROM countries"
            );
            Map<String, String> nameMap = new HashMap<>();
            for (Map<String, Object> r : countryNames) {
                nameMap.put((String) r.get("country_code"), (String) r.get("country_name"));
            }
            for (Map<String, Object> tc : topCountries) {
                String cc = (String) tc.get("countryCode");
                tc.put("countryName", nameMap.getOrDefault(cc, cc));
            }
        } catch (Exception e) {
            log.warn("国家名称查询异常: {}", e.getMessage());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("regionStats", regionStats);
        result.put("topCountries", topCountries);
        result.put("totalRevenueUsd", round2(totalRevenueUsd));
        result.put("globalDau", globalDau);
        result.put("totalPaymentUsd", round2(totalPaymentUsd));
        result.put("totalAdRevenueUsd", round2(totalAdUsd));

        return ApiResponse.ok(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. GET /api/ai/global-view/currency-rates
    // ──────────────────────────────────────────────────────────────────────────
    @Operation(summary = "获取最新汇率", description = "查 currency_rates 最新一条每个 currency_code")
    @GetMapping("/currency-rates")
    public ApiResponse<Map<String, Object>> currencyRates() {
        ensureDefaultRates();
        Map<String, Double> rates = loadCurrentRates();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("rates", rates);
        result.put("baseCurrency", "USD");
        result.put("updatedAt", LocalDate.now().toString());
        return ApiResponse.ok(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. GET /api/ai/global-view/region-breakdown
    // ──────────────────────────────────────────────────────────────────────────
    @Operation(summary = "地区详情", description = "按地区返回 DAU/收入趋势，支持 regionCode/days/currency 参数")
    @GetMapping("/region-breakdown")
    public ApiResponse<Map<String, Object>> regionBreakdown(
            @RequestParam(required = false) String regionCode,
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(defaultValue = "USD") String currency) {

        ensureDefaultRates();
        Map<String, Double> rates = loadCurrentRates();
        double targetRate = rates.getOrDefault(currency, 1.0);

        // 过滤条件
        String regionFilter = "";
        if (regionCode != null && !regionCode.isBlank()) {
            regionFilter = " AND gu.region_group_code = '" + regionCode.replace("'", "") + "'";
        }

        // 按地区统计用户数
        List<Map<String, Object>> userStats = jdbc.queryForList(
            "SELECT region_group_code AS region, COUNT(*) AS userCount " +
            "FROM game_users WHERE deleted = 0 " +
            (regionCode != null && !regionCode.isBlank()
                ? " AND region_group_code = '" + regionCode.replace("'", "") + "'"
                : "") +
            " GROUP BY region_group_code"
        );

        // 广告收入趋势（最近 N 天，按日期+地区）
        List<Map<String, Object>> adTrend;
        try {
            String sql = "SELECT ard.revenue_date AS date, " +
                "COALESCE(c.region_group_id, 0) AS regionGroupId, " +
                "ard.currency, SUM(ard.revenue) AS totalRevenue " +
                "FROM ad_revenue_daily ard " +
                "LEFT JOIN countries c ON ard.country_code = c.country_code " +
                "WHERE ard.revenue_date >= CURDATE() - INTERVAL " + Math.min(days, 365) + " DAY " +
                " GROUP BY ard.revenue_date, c.region_group_id, ard.currency " +
                " ORDER BY ard.revenue_date DESC";
            adTrend = jdbc.queryForList(sql);
        } catch (Exception e) {
            log.warn("广告收入趋势查询异常: {}", e.getMessage());
            adTrend = new ArrayList<>();
        }

        // 支付收入按地区聚合
        List<Map<String, Object>> payStats;
        try {
            String paySql = "SELECT gu.region_group_code AS region, upr.currency, SUM(upr.amount) AS totalAmount " +
                "FROM user_payment_records upr " +
                "JOIN game_users gu ON upr.user_id = gu.user_id " +
                "WHERE upr.status = 'COMPLETED' " +
                "AND upr.created_at >= NOW() - INTERVAL " + Math.min(days, 365) + " DAY " +
                (regionCode != null && !regionCode.isBlank()
                    ? " AND gu.region_group_code = '" + regionCode.replace("'", "") + "'"
                    : "") +
                " GROUP BY gu.region_group_code, upr.currency";
            payStats = jdbc.queryForList(paySql);
        } catch (Exception e) {
            log.warn("地区支付统计异常: {}", e.getMessage());
            payStats = new ArrayList<>();
        }

        // 汇总各地区收入（目标货币）
        Map<String, Double> regionRevenue = new HashMap<>();
        for (Map<String, Object> r : payStats) {
            String region = (String) r.get("region");
            if (region == null) region = "OTHER";
            double usd = convertToUsd(toDouble(r.get("totalAmount")), (String) r.get("currency"), rates);
            double converted = usd * targetRate;
            regionRevenue.merge(region, converted, Double::sum);
        }

        List<Map<String, Object>> regionList = new ArrayList<>();
        for (Map<String, Object> us : userStats) {
            String region = (String) us.get("region");
            if (region == null) region = "OTHER";
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("region", region);
            m.put("userCount", toLong(us.get("userCount")));
            m.put("revenue", round2(regionRevenue.getOrDefault(region, 0.0)));
            m.put("currency", currency);
            regionList.add(m);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("regions", regionList);
        result.put("adTrend", adTrend.stream().limit(1000).collect(Collectors.toList()));
        result.put("days", days);
        result.put("currency", currency);

        return ApiResponse.ok(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. GET /api/ai/global-view/timezone-data
    // ──────────────────────────────────────────────────────────────────────────
    @Operation(summary = "时区数据", description = "返回各地区 timezone 映射表")
    @GetMapping("/timezone-data")
    public ApiResponse<Map<String, Object>> timezoneData() {
        List<Map<String, Object>> regions = new ArrayList<>();

        // 先尝试从 region_groups + countries 查
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT rg.group_code AS code, rg.group_name AS name, " +
                "MIN(c.timezone) AS timezone " +
                "FROM region_groups rg " +
                "LEFT JOIN countries c ON c.region_group_id = rg.id " +
                "GROUP BY rg.group_code, rg.group_name"
            );
            for (Map<String, Object> r : rows) {
                String code = (String) r.get("code");
                String tz = (String) r.get("timezone");
                Map<String, Object> m = buildRegionTimezone(code, (String) r.get("name"), tz);
                regions.add(m);
            }
        } catch (Exception e) {
            log.warn("时区数据查询异常: {}", e.getMessage());
        }

        // 如果表为空，返回默认时区数据
        if (regions.isEmpty()) {
            regions = getDefaultTimezones();
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("regions", regions);
        return ApiResponse.ok(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. POST /api/ai/global-view/refresh-rates
    // ──────────────────────────────────────────────────────────────────────────
    @Operation(summary = "刷新汇率", description = "从 open.er-api.com 拉取最新汇率并写入数据库")
    @PostMapping("/refresh-rates")
    public ApiResponse<Map<String, Object>> refreshRates() {
        int updated = 0;
        String source = "default";

        try {
            RestTemplate rt = new RestTemplate();
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = rt.getForObject(
                "https://open.er-api.com/v6/latest/USD",
                Map.class
            );
            if (resp != null && "success".equals(resp.get("result"))) {
                @SuppressWarnings("unchecked")
                Map<String, Object> ratesRaw = (Map<String, Object>) resp.get("rates");
                if (ratesRaw != null) {
                    LocalDate today = LocalDate.now();
                    for (Map.Entry<String, Object> entry : ratesRaw.entrySet()) {
                        String code = entry.getKey();
                        double rate = toDouble(entry.getValue());
                        upsertRate(code, rate, today);
                        updated++;
                    }
                    source = "er-api.com";
                }
            }
        } catch (Exception e) {
            log.warn("外部汇率 API 调用失败，使用默认汇率: {}", e.getMessage());
        }

        // 如果外部 API 失败，插入默认汇率
        if (updated == 0) {
            LocalDate today = LocalDate.now();
            for (Map.Entry<String, Double> entry : DEFAULT_RATES.entrySet()) {
                upsertRate(entry.getKey(), entry.getValue(), today);
                updated++;
            }
            source = "default";
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("updated", updated);
        result.put("source", source);
        result.put("date", LocalDate.now().toString());
        return ApiResponse.ok(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 私有辅助方法
    // ──────────────────────────────────────────────────────────────────────────

    /** 确保 currency_rates 表不为空 */
    private void ensureDefaultRates() {
        try {
            Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM currency_rates", Integer.class);
            if (count == null || count == 0) {
                LocalDate today = LocalDate.now();
                for (Map.Entry<String, Double> entry : DEFAULT_RATES.entrySet()) {
                    try {
                        jdbc.update(
                            "INSERT INTO currency_rates (currency_code, rate_to_usd, effective_date) " +
                            "VALUES (?, ?, ?)",
                            entry.getKey(), entry.getValue(), today.toString()
                        );
                    } catch (Exception ex) {
                        log.debug("插入默认汇率 {} 异常: {}", entry.getKey(), ex.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("检查汇率表失败: {}", e.getMessage());
        }
    }

    /** 从 DB 加载最新汇率 */
    private Map<String, Double> loadCurrentRates() {
        Map<String, Double> rates = new LinkedHashMap<>(DEFAULT_RATES);
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT t1.currency_code, t1.rate_to_usd " +
                "FROM currency_rates t1 " +
                "INNER JOIN (" +
                "  SELECT currency_code, MAX(effective_date) AS max_date " +
                "  FROM currency_rates GROUP BY currency_code" +
                ") t2 ON t1.currency_code = t2.currency_code AND t1.effective_date = t2.max_date"
            );
            for (Map<String, Object> r : rows) {
                String code = (String) r.get("currency_code");
                double rate = toDouble(r.get("rate_to_usd"));
                if (code != null && rate > 0) {
                    rates.put(code, rate);
                }
            }
        } catch (Exception e) {
            log.warn("加载汇率失败，使用默认: {}", e.getMessage());
        }
        return rates;
    }

    /** 插入或更新汇率 */
    private void upsertRate(String code, double rate, LocalDate date) {
        try {
            Integer cnt = jdbc.queryForObject(
                "SELECT COUNT(*) FROM currency_rates WHERE currency_code = ? AND effective_date = ?",
                Integer.class, code, date.toString()
            );
            if (cnt != null && cnt > 0) {
                jdbc.update(
                    "UPDATE currency_rates SET rate_to_usd = ? WHERE currency_code = ? AND effective_date = ?",
                    rate, code, date.toString()
                );
            } else {
                jdbc.update(
                    "INSERT INTO currency_rates (currency_code, rate_to_usd, effective_date) VALUES (?, ?, ?)",
                    code, rate, date.toString()
                );
            }
        } catch (Exception e) {
            log.warn("upsertRate {} 失败: {}", code, e.getMessage());
        }
    }

    /** 将任意货币金额换算为 USD */
    private double convertToUsd(double amount, String currency, Map<String, Double> rates) {
        if (currency == null || "USD".equalsIgnoreCase(currency)) return amount;
        double rate = rates.getOrDefault(currency.toUpperCase(), 1.0);
        return rate > 0 ? amount / rate : amount;
    }

    private double round2(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private long toLong(Object v) {
        if (v == null) return 0L;
        if (v instanceof Number) return ((Number) v).longValue();
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return 0L; }
    }

    private double toDouble(Object v) {
        if (v == null) return 0.0;
        if (v instanceof Number) return ((Number) v).doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }

    private Map<String, Object> buildRegionTimezone(String code, String name, String tz) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("code", code != null ? code : "OTHER");
        m.put("name", name != null ? name : code);
        m.put("timezone", tz != null ? tz : guessTimezone(code));
        m.put("utcOffset", calcUtcOffset(tz != null ? tz : guessTimezone(code)));
        return m;
    }

    private String guessTimezone(String code) {
        if (code == null) return "UTC";
        switch (code.toUpperCase()) {
            case "NA":  return "America/New_York";
            case "EU":  return "Europe/London";
            case "SEA": return "Asia/Singapore";
            case "CN":  return "Asia/Shanghai";
            case "JP":  return "Asia/Tokyo";
            default:    return "UTC";
        }
    }

    private String calcUtcOffset(String tz) {
        try {
            java.time.ZoneId zoneId = java.time.ZoneId.of(tz);
            java.time.ZoneOffset offset = zoneId.getRules().getStandardOffset(java.time.Instant.now());
            int totalSeconds = offset.getTotalSeconds();
            int hours = totalSeconds / 3600;
            int minutes = Math.abs((totalSeconds % 3600) / 60);
            return String.format("UTC%+d:%02d", hours, minutes);
        } catch (Exception e) {
            return "UTC+0:00";
        }
    }

    private List<Map<String, Object>> getDefaultTimezones() {
        List<Map<String, Object>> list = new ArrayList<>();
        String[][] defaults = {
            {"NA",  "北美",   "America/New_York"},
            {"EU",  "欧洲",   "Europe/London"},
            {"SEA", "东南亚", "Asia/Singapore"},
            {"CN",  "中国",   "Asia/Shanghai"},
            {"JP",  "日本",   "Asia/Tokyo"},
            {"KR",  "韩国",   "Asia/Seoul"},
            {"OTHER", "其他", "UTC"},
        };
        for (String[] d : defaults) {
            list.add(buildRegionTimezone(d[0], d[1], d[2]));
        }
        return list;
    }
}
