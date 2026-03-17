package com.gamehot.dataservice.dto;

import lombok.Data;

@Data
public class UpdateChannelRequest {
    private String channelName;
    private String channelType;
    private String platform;
    private String attributionProvider;
    private String attributionConfig;
    private Integer isActive;
}
