package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Entity
@Table(name = "popup_templates")
public class PopupTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_code", nullable = false, length = 100, unique = true)
    private String templateCode;

    @Column(name = "popup_type", nullable = false, length = 50)
    private String popupType;

    @Column(name = "scope_type", length = 50)
    private String scopeType = "GLOBAL";

    @Column(name = "scope_id")
    private Long scopeId = 0L;

    @Column(name = "language_code", length = 10)
    private String languageCode = "en";

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "body_text", columnDefinition = "text")
    private String bodyText;

    @Column(name = "primary_button_text", nullable = false, length = 100)
    private String primaryButtonText;

    @Column(name = "secondary_button_text", length = 100)
    private String secondaryButtonText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dynamic_variables", columnDefinition = "json")
    private Map<String, Object> dynamicVariables;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ui_config", columnDefinition = "json")
    private Map<String, Object> uiConfig;

    @Column(name = "ab_variant", length = 50)
    private String abVariant;

    @Column(name = "is_active")
    private Integer isActive = 1;

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
