package com.gamehot.dataservice.dto;

import lombok.Data;

@Data
public class CreateEntryRequest {
    private Long categoryId;
    private Integer gameId;
    private String costDate; // YYYY-MM-DD
    private String amount;
    private String currency;
    private String description;
    private String source;
}
