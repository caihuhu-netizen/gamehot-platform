package com.gamehot.opsservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreateWebhookConfigRequest {
    private String name;
    private String webhookUrl;
    private String secret;
    private List<String> eventTypes;
    private String description;
}
