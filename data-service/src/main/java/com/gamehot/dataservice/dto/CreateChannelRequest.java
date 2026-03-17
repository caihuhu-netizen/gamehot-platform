package com.gamehot.dataservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateChannelRequest {
    private String channelCode;
    private String channelName;
    private String channelType; // PAID, ORGANIC, REFERRAL, SOCIAL, DIRECT
    private String platform;
    private String attributionProvider; // APPSFLYER, ADJUST, SINGULAR, BRANCH, NONE
    private String attributionConfig;   // JSON string
    private Integer gameId;
}
