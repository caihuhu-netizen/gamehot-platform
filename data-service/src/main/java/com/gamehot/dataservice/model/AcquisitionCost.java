package com.gamehot.dataservice.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "acquisition_costs")
public class AcquisitionCost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "channel_id", nullable = false)
    private Long channelId;

    @Column(name = "game_id")
    private Integer gameId = 0;

    @Column(name = "cost_date", nullable = false)
    private LocalDate costDate;

    @Column(name = "spend", precision = 14, scale = 4)
    private BigDecimal spend;

    @Column(name = "currency", length = 10)
    private String currency = "USD";

    @Column(name = "impressions")
    private Long impressions = 0L;

    @Column(name = "clicks")
    private Long clicks = 0L;

    @Column(name = "installs")
    private Long installs = 0L;

    @Column(name = "cpi", precision = 14, scale = 4)
    private BigDecimal cpi;

    @Column(name = "campaign_name", length = 200)
    private String campaignName;

    @Column(name = "ad_group_name", length = 200)
    private String adGroupName;

    @Column(name = "creative_name", length = 200)
    private String creativeName;

    @Column(name = "country_code", length = 5)
    private String countryCode;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
