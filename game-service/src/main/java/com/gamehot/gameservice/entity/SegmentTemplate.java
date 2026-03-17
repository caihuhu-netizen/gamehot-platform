package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Entity
@Table(name = "segment_templates")
public class SegmentTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_name", nullable = false, length = 200)
    private String templateName;

    @Column(name = "game_type", length = 50)
    private String gameType;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "layer_config", columnDefinition = "json")
    private Object layerConfig;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "behavior_config", columnDefinition = "json")
    private Map<String, Object> behaviorConfig;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "calc_rule_config", columnDefinition = "json")
    private Map<String, Object> calcRuleConfig;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tags", columnDefinition = "json")
    private List<String> tags;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
