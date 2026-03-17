package com.gamehot.aiservice.dto;

import lombok.Data;
import java.util.Map;

@Data
public class UpdateDecisionActionRequest {
    private String humanAction;
    private String humanNote;
    private String modifiedAction;
}
