package com.gamehot.dataservice.dto;

import lombok.Data;

@Data
public class CreateCostRequest {
    private Long channelId;
    private Integer gameId;
    private String costDate; // YYYY-MM-DD
    private String spend;
    private String currency;
    private Long impressions;
    private Long clicks;
    private Long installs;
    private String campaignName;
    private String adGroupName;
    private String creativeName;
    private String countryCode;
}
