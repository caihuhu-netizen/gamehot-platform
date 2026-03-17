package com.gamehot.gameservice.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "trigger_popup_bindings")
public class TriggerPopupBinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_id", nullable = false)
    private Long ruleId;

    @Column(name = "template_id", nullable = false)
    private Long templateId;

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @Column(name = "weight")
    private Integer weight = 100;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
