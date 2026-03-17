package com.gamehot.aiservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreateKnowledgeRequest {
    private String title;
    private String category;
    private String content;
    private List<String> tags;
    private Long relatedGameId;
    private String relatedModule;
}
