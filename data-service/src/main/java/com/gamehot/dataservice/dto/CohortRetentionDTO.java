package com.gamehot.dataservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CohortRetentionDTO {
    private String cohortDate;
    private Long cohortSize;
    private Long d1Retained;
    private Long d3Retained;
    private Long d7Retained;
    private Long d14Retained;
    private Long d30Retained;
    private Double d1Rate;
    private Double d3Rate;
    private Double d7Rate;
    private Double d14Rate;
    private Double d30Rate;
}
