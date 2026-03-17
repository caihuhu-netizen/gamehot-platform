package com.gamehot.common.response;

import lombok.Data;

@Data
public class ApiResponse<T> {
    private int code;
    private String message;
    private T data;

    public static <T> ApiResponse<T> ok(T data) {
        ApiResponse<T> r = new ApiResponse<>();
        r.code = 200;
        r.message = "success";
        r.data = data;
        return r;
    }

    public static <T> ApiResponse<T> ok() {
        return ok(null);
    }

    public static <T> ApiResponse<T> fail(int code, String message) {
        ApiResponse<T> r = new ApiResponse<>();
        r.code = code;
        r.message = message;
        return r;
    }

    public static <T> ApiResponse<T> fail(String message) {
        return fail(400, message);
    }

    public static <T> ApiResponse<T> unauthorized() {
        return fail(401, "未登录或token已过期");
    }

    public static <T> ApiResponse<T> forbidden() {
        return fail(403, "无权限访问");
    }
}
