package com.gamehot.aiservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Entity
@Table(name = "ai_perf_snapshots")
public class PerfSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "heap_used_mb")
    private Double heapUsedMb;

    @Column(name = "heap_total_mb")
    private Double heapTotalMb;

    @Column(name = "rss_mb")
    private Double rssMb;

    @Column(name = "cache_hit_rate")
    private Double cacheHitRate;

    @Column(name = "avg_query_ms")
    private Double avgQueryMs;

    @Column(name = "total_queries")
    private Long totalQueries;

    @Column(name = "slow_queries")
    private Long slowQueries;

    @Column(name = "extra", columnDefinition = "JSON")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> extra;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
