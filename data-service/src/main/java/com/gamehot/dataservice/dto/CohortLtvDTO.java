package com.gamehot.dataservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CohortLtvDTO {
    private String cohortDate;
    private Long cohortSize;
    private Double ltvD1;
    private Double ltvD3;
    private Double ltvD7;
    private Double ltvD14;
    private Double ltvD30;
    private Double ltvD1PerUser;
    private Double ltvD7PerUser;
    private Double ltvD30PerUser;
}
