package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Entity
@Table(name = "game_levels")
public class GameLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "level_code", nullable = false, length = 50)
    private String levelCode;

    @Column(name = "level_name", nullable = false, length = 200)
    private String levelName;

    @Column(name = "difficulty_score", precision = 10, scale = 2)
    private BigDecimal difficultyScore;

    @Column(name = "color_count")
    private Integer colorCount = 4;

    @Column(name = "grid_size", length = 20)
    private String gridSize = "6x6";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "obstacle_types", columnDefinition = "json")
    private Map<String, Object> obstacleTypes;

    @Column(name = "target_pass_rate", precision = 5, scale = 2)
    private BigDecimal targetPassRate;

    @Column(name = "is_monetize_point")
    private Integer isMonetizePoint = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "recommended_segments", columnDefinition = "json")
    private Map<String, Object> recommendedSegments;

    @Column(name = "probe_type", length = 50)
    private String probeType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "layout_config", columnDefinition = "json")
    private Map<String, Object> layoutConfig;

    @Column(name = "optimal_moves")
    private Integer optimalMoves;

    @Column(name = "avg_moves")
    private Integer avgMoves;

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
