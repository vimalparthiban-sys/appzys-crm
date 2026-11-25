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

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            rejectUnauthorized(response, "Authentication required. Please provide a valid authorization token.");
            return;
        }

        String token = authHeader.substring(7).trim();

        // 4. Dedicated AI endpoints isolation (/api/ai/**)
        if (path.startsWith("/api/ai/")) {
            Optional<String> agentOpt = authSessionService.validateAiToken(token);
            if (agentOpt.isEmpty()) {
                rejectUnauthorized(response, "Invalid or unauthorized AI integration credentials.");
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
                rejectUnauthorized(response, "Unauthorized admin access.");
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }

        // 6. Core Team CRM endpoints (/api/companies, /api/dashboard, /api/reports, etc.)
        // AI credentials CANNOT access human endpoints
        if (authSessionService.validateAiToken(token).isPresent()) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"AI credentials are not permitted to access interactive team CRM endpoints.\"}");
            return;
        }

        // Validate human member session (Database-backed)
        if (!authSessionService.validateMemberToken(token)) {
            rejectUnauthorized(response, "Session expired, revoked, or invalid. Please re-authenticate.");
            return;
        }

        // Bind member session info if present
        authSessionService.getSessionFromToken(token).ifPresent(session -> {
            request.setAttribute("crm_member_id", session.memberId());
            request.setAttribute("crm_member_name", session.memberName());
        });

        filterChain.doFilter(request, response);
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

    private void rejectUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(String.format(
                "{\"authenticated\":false,\"error\":\"Unauthorized\",\"message\":\"%s\"}",
                message.replace("\"", "\\\"")
        ));
    }
}
