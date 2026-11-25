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
import java.util.Optional;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
@RequiredArgsConstructor
public class AuthSecurityFilter extends OncePerRequestFilter {

    private final AuthSessionService authSessionService;
    private final WebCorsConfig webCorsConfig;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // 1. Handle browser CORS preflight requests (OPTIONS)
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            setCorsHeaders(request, response);
            response.setStatus(HttpServletResponse.SC_OK);
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

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            rejectUnauthorized(request, response, "Authentication required. Please provide a valid authorization token.");
            return;
        }

        String token = authHeader.substring(7).trim();

        // 4. Dedicated AI endpoints isolation (/api/ai/**)
        if (path.startsWith("/api/ai/")) {
            Optional<String> agentOpt = authSessionService.validateAiToken(token);
            if (agentOpt.isEmpty()) {
                rejectUnauthorized(request, response, "Invalid or unauthorized AI integration credentials.");
                return;
            }
            // Bind validated agent identity to request
            request.setAttribute("authenticated_ai_agent", agentOpt.get());
            filterChain.doFilter(request, response);
            return;
        }

        // 5. Admin management endpoints (/api/admin/**)
        if (path.startsWith("/api/admin/")) {
            if (!authSessionService.validateMasterAdminKey(token)) {
                rejectUnauthorized(request, response, "Unauthorized admin access.");
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }

        // 6. Core Team CRM endpoints (/api/companies, /api/dashboard, /api/reports, etc.)
        // AI credentials CANNOT access human endpoints
        if (authSessionService.validateAiToken(token).isPresent()) {
            setCorsHeaders(request, response);
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"AI credentials are not permitted to access interactive team CRM endpoints.\"}");
            return;
        }

        // Validate human member session (Database-backed)
        if (!authSessionService.validateMemberToken(token)) {
            rejectUnauthorized(request, response, "Session expired, revoked, or invalid. Please re-authenticate.");
            return;
        }

        // Bind member session info if present
        authSessionService.getSessionFromToken(token).ifPresent(session -> {
            request.setAttribute("crm_member_id", session.memberId());
            request.setAttribute("crm_member_name", session.memberName());
        });

        filterChain.doFilter(request, response);
    }

    private void setCorsHeaders(HttpServletRequest request, HttpServletResponse response) {
        // Prevent duplicate header if CorsFilter has already attached it
        if (response.getHeader("Access-Control-Allow-Origin") != null) {
            return;
        }
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank() && webCorsConfig != null) {
            String trimmedOrigin = origin.trim();
            if (webCorsConfig.getAllowedOrigins().contains(trimmedOrigin)) {
                response.setHeader("Access-Control-Allow-Origin", trimmedOrigin);
                response.setHeader("Access-Control-Allow-Credentials", "true");
                response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
                response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, Origin, X-Requested-With");
                response.setHeader("Access-Control-Max-Age", "3600");
                response.setHeader("Vary", "Origin");
            }
        }
    }

    private boolean isPublicEndpoint(String method, String path) {
        // Invite + PIN exchange endpoint
        if ("POST".equalsIgnoreCase(method) && "/api/auth/exchange".equalsIgnoreCase(path)) {
            return true;
        }
        // Health check endpoint
        if ("GET".equalsIgnoreCase(method) && "/api/auth/health".equalsIgnoreCase(path)) {
            return true;
        }
        return false;
    }

    private void rejectUnauthorized(HttpServletRequest request, HttpServletResponse response, String message) throws IOException {
        setCorsHeaders(request, response);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(String.format(
                "{\"authenticated\":false,\"error\":\"Unauthorized\",\"message\":\"%s\"}",
                message.replace("\"", "\\\"")
        ));
    }
}
