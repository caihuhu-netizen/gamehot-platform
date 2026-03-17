package com.gamehot.dataservice.dto;

import lombok.Data;

@Data
public class DateRangeQuery {
    private Integer gameId;
    private String startDate; // YYYY-MM-DD
    private String endDate;   // YYYY-MM-DD
}
