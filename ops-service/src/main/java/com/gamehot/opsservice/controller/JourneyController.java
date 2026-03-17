package com.gamehot.opsservice.controller;

import com.gamehot.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.*;

@Tag(name = "用户旅程", description = "用户旅程编排与执行")
@RestController
@RequestMapping("/api/ops/journey")
@RequiredArgsConstructor
public class JourneyController {

    private final JdbcTemplate jdbc;

    @Operation(summary = "旅程列表")
    @GetMapping("/list")
    public ApiResponse<List<Map<String, Object>>> list(
            @RequestParam(required = false) Integer gameId,
            @RequestParam(required = false) String status) {
        StringBuilder sql = new StringBuilder(
            "SELECT id, game_id, name, description, status, trigger_type, " +
            "enrolled_count, completed_count, converted_count, created_by, created_at, updated_at " +
            "FROM user_journeys WHERE deleted = 0");
        List<Object> params = new ArrayList<>();
        if (gameId != null) { sql.append(" AND game_id = ?"); params.add(gameId); }
        if (status != null && !status.isEmpty()) { sql.append(" AND status = ?"); params.add(status); }
        sql.append(" ORDER BY updated_at DESC");
        return ApiResponse.ok(jdbc.queryForList(sql.toString(), params.toArray()));
    }

    @Operation(summary = "旅程详情（含画布）")
    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> detail(@PathVariable Long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT * FROM user_journeys WHERE id = ? AND deleted = 0", id);
        if (rows.isEmpty()) return ApiResponse.fail("旅程不存在");
        return ApiResponse.ok(rows.get(0));
    }

    @Operation(summary = "创建旅程")
    @PostMapping("/create")
    public ApiResponse<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO user_journeys (game_id, name, description, status, trigger_type, trigger_config, canvas_data, created_by)" +
                " VALUES (?,?,?,?,?,?,?,?)", Statement.RETURN_GENERATED_KEYS);
            ps.setObject(1, body.getOrDefault("gameId", 0));
            ps.setString(2, (String) body.getOrDefault("name", "新旅程"));
            ps.setString(3, (String) body.getOrDefault("description", ""));
            ps.setString(4, "draft");
            ps.setString(5, (String) body.getOrDefault("triggerType", "segment"));
            ps.setString(6, body.containsKey("triggerConfig") ? body.get("triggerConfig").toString() : "{}");
            ps.setString(7, body.containsKey("canvasData") ? body.get("canvasData").toString() : "{\"nodes\":[],\"edges\":[]}");
            ps.setString(8, (String) body.getOrDefault("createdBy", "user"));
            return ps;
        }, kh);
        Long newId = kh.getKey() != null ? kh.getKey().longValue() : 0L;
        return ApiResponse.ok(Map.of("id", newId));
    }

    @Operation(summary = "保存画布（自动保存）")
    @PutMapping("/{id}/canvas")
    public ApiResponse<Void> saveCanvas(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Object canvasData = body.get("canvasData");
        jdbc.update("UPDATE user_journeys SET canvas_data = ?, updated_at = NOW() WHERE id = ?",
            canvasData != null ? canvasData.toString() : "{}", id);
        return ApiResponse.ok();
    }

    @Operation(summary = "更新旅程状态")
    @PutMapping("/{id}/status")
    public ApiResponse<Void> updateStatus(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String status = (String) body.get("status");
        if (status == null) return ApiResponse.fail("status required");
        jdbc.update("UPDATE user_journeys SET status = ?, updated_at = NOW() WHERE id = ?", status, id);
        return ApiResponse.ok();
    }

    @Operation(summary = "更新旅程基本信息")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        jdbc.update("UPDATE user_journeys SET name=?, description=?, trigger_type=?, updated_at=NOW() WHERE id=?",
            body.get("name"), body.get("description"), body.get("triggerType"), id);
        return ApiResponse.ok();
    }

    @Operation(summary = "删除旅程")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        jdbc.update("UPDATE user_journeys SET deleted=1 WHERE id=?", id);
        return ApiResponse.ok();
    }

    @Operation(summary = "旅程统计总览")
    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> stats(@RequestParam(required = false) Integer gameId) {
        String where = gameId != null ? " AND game_id = " + gameId : "";
        Map<String, Object> result = new LinkedHashMap<>();
        String sql = "SELECT " +
            "COUNT(*) as total," +
            "SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active," +
            "SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) as draft," +
            "SUM(enrolled_count) as totalEnrolled," +
            "SUM(converted_count) as totalConverted," +
            "ROUND(SUM(converted_count)*100.0/NULLIF(SUM(enrolled_count),0),1) as overallConvRate" +
            " FROM user_journeys WHERE deleted=0" + where;
        result.putAll(jdbc.queryForMap(sql));
        return ApiResponse.ok(result);
    }

    @Operation(summary = "入组用户列表")
    @GetMapping("/{id}/enrollments")
    public ApiResponse<List<Map<String, Object>>> enrollments(
            @PathVariable Long id,
            @RequestParam(defaultValue = "20") int limit) {
        String sql = "SELECT e.*, g.country_code, g.total_pay_amount " +
            "FROM journey_enrollments e " +
            "LEFT JOIN game_users g ON e.user_id = g.user_id " +
            "WHERE e.journey_id = ? ORDER BY e.enrolled_at DESC LIMIT " + limit;
        return ApiResponse.ok(jdbc.queryForList(sql, id));
    }

    @Operation(summary = "立即激活旅程（模拟入组）")
    @PostMapping("/{id}/activate")
    public ApiResponse<Map<String, Object>> activate(@PathVariable Long id) {
        // TODO: 接入真实触发引擎，当前模拟入组
        jdbc.update("UPDATE user_journeys SET status='active', updated_at=NOW() WHERE id=?", id);
        return ApiResponse.ok(Map.of(
            "status", "active",
            "message", "旅程已激活，将按触发条件自动入组用户"
        ));
    }

    @Operation(summary = "暂停旅程")
    @PostMapping("/{id}/pause")
    public ApiResponse<Void> pause(@PathVariable Long id) {
        jdbc.update("UPDATE user_journeys SET status='paused', updated_at=NOW() WHERE id=?", id);
        return ApiResponse.ok();
    }

    @Operation(summary = "节点类型列表（前端画布用）")
    @GetMapping("/node-types")
    public ApiResponse<List<Map<String, Object>>> nodeTypes() {
        List<Map<String, Object>> types = new ArrayList<>();
        types.add(nodeType("trigger",    "触发器",   "入口节点：事件/分群/定时触发", "#8b5cf6"));
        types.add(nodeType("push",       "推送消息", "发送 App 推送通知",            "#3b82f6"));
        types.add(nodeType("wait",       "等待延迟", "等待指定时间后继续",           "#6b7280"));
        types.add(nodeType("condition",  "条件判断", "根据用户行为分支",             "#f59e0b"));
        types.add(nodeType("ab_split",   "A/B 分流", "随机分组进行 A/B 测试",        "#ec4899"));
        types.add(nodeType("coupon",     "发放优惠", "发送优惠券或奖励",             "#22c55e"));
        types.add(nodeType("tag",        "打标签",   "给用户打分群标签",             "#06b6d4"));
        types.add(nodeType("end",        "结束",     "旅程结束节点",                 "#94a3b8"));
        return ApiResponse.ok(types);
    }

    private Map<String, Object> nodeType(String type, String label, String desc, String color) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", type); m.put("label", label); m.put("description", desc); m.put("color", color);
        return m;
    }
}
