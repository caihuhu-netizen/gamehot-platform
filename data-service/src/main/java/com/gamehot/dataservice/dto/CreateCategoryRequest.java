package com.gamehot.dataservice.dto;

import lombok.Data;

@Data
public class CreateCategoryRequest {
    private String categoryCode;
    private String categoryName;
    private Long parentId;
    private Integer sortOrder;
}
