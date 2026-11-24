package com.appzys.crm.config;

import com.appzys.crm.service.AuthSessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@RequiredArgsConstructor
public class AuthSecurityFilter extends OncePerRequestFilter {

    private final AuthSessionService authSessionService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // 1. Allow browser CORS preflight requests through without authentication
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();

        // 2. Only protect /api/** endpoints; allow static content or root paths
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 3. Whitelisted public endpoints
        if (isPublicEndpoint(request.getMethod(), path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 4. Extract and validate Bearer token
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            rejectUnauthorized(response, "Authentication required. Please log in.");
            return;
        }

        String token = authHeader.substring(7).trim();
        if (!authSessionService.validateToken(token)) {
            rejectUnauthorized(response, "Session expired or invalid token. Please log in again.");
            return;
        }

        // Authentication verified, proceed down the chain
        filterChain.doFilter(request, response);
    }

    private boolean isPublicEndpoint(String method, String path) {
        // Login endpoint
        if ("POST".equalsIgnoreCase(method) && "/api/auth/login".equalsIgnoreCase(path)) {
            return true;
        }
        // Health check endpoint
        if ("GET".equalsIgnoreCase(method) && "/api/auth/health".equalsIgnoreCase(path)) {
            return true;
        }
        return false;
    }

    private void rejectUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(String.format(
                "{\"authenticated\":false,\"error\":\"Unauthorized\",\"message\":\"%s\"}",
                message.replace("\"", "\\\"")
        ));
    }
}
