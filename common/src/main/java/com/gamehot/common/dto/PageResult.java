package com.gamehot.common.dto;

import lombok.Data;
import java.util.List;

/**
 * 通用分页结果 DTO
 * 替代直接返回 Map<String,Object> 的分页响应
 */
@Data
public class PageResult<T> {
    private List<T> items;
    private long total;
    private int page;
    private int size;

    public static <T> PageResult<T> of(List<T> items, long total, int page, int size) {
        PageResult<T> r = new PageResult<>();
        r.items = items;
        r.total = total;
        r.page = page;
        r.size = size;
        return r;
    }
}
