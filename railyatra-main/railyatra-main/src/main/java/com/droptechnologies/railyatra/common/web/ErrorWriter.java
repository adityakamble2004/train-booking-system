package com.droptechnologies.railyatra.common.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.Instant;

public final class ErrorWriter {

    private ErrorWriter() {}

    public static void write(HttpServletRequest req, HttpServletResponse res,
                             int status, String code, String message) throws IOException {
        String path = req.getRequestURI().replace("\\", "\\\\").replace("\"", "\\\"");
        res.setStatus(status);
        res.setContentType("application/json");
        res.setCharacterEncoding("UTF-8");
        res.getWriter().write("{\"timestamp\":\"" + Instant.now() + "\",\"status\":" + status
                + ",\"code\":\"" + code + "\",\"message\":\"" + message
                + "\",\"path\":\"" + path + "\",\"fieldErrors\":[]}");
    }
}