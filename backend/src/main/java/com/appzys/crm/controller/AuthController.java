package com.appzys.crm.controller;

import com.appzys.crm.dto.AuthLoginRequest;
import com.appzys.crm.dto.AuthResponseDto;
import com.appzys.crm.service.AuthSessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthSessionService authSessionService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(
            @Valid @RequestBody AuthLoginRequest request,
            HttpServletRequest httpRequest
    ) {
        AuthSessionService.LoginResult result = authSessionService.authenticate(request, httpRequest);
        
        if (result.rateLimited()) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header(HttpHeaders.RETRY_AFTER, String.valueOf(result.retryAfterSeconds()))
                    .body(result.responseDto());
        }
        
        if (result.authenticated()) {
            return ResponseEntity.ok(result.responseDto());
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result.responseDto());
        }
    }

    @GetMapping("/check")
    public ResponseEntity<?> check(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            if (authSessionService.validateToken(token)) {
                return ResponseEntity.ok(Map.of(
                        "authenticated", true,
                        "message", "Session active"
                ));
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "authenticated", false,
                "message", "Not authenticated"
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            authSessionService.revokeSession(token);
        }
        return ResponseEntity.ok(Map.of(
                "authenticated", false,
                "message", "Logged out successfully"
        ));
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "APPZYS Client Acquisition CRM",
                "activeSessions", authSessionService.getActiveSessionCount()
        ));
    }
}
