package com.gamehot.dataservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "cost_entries")
public class CostEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "game_id")
    private Integer gameId = 0;

    @Column(name = "cost_date", nullable = false)
    private LocalDate costDate;

    @Column(name = "amount", precision = 14, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency", length = 10)
    private String currency = "USD";

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "source", length = 50)
    private String source = "MANUAL";

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "deleted")
    private Integer deleted = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
