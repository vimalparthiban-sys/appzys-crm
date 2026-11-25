package com.appzys.crm.controller;

import com.appzys.crm.dto.InviteExchangeRequest;
import com.appzys.crm.dto.InviteExchangeResponse;
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

    @PostMapping("/exchange")
    public ResponseEntity<InviteExchangeResponse> exchange(
            @Valid @RequestBody InviteExchangeRequest request,
            HttpServletRequest httpRequest
    ) {
        AuthSessionService.ExchangeResult result = authSessionService.exchangeInvite(request, httpRequest);

        if (result.rateLimited()) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header(HttpHeaders.RETRY_AFTER, String.valueOf(result.retryAfterSeconds()))
                    .body(result.response());
        }

        if (result.success()) {
            return ResponseEntity.ok(result.response());
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result.response());
        }
    }

    @GetMapping("/check")
    public ResponseEntity<?> check(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            if (authSessionService.validateMemberToken(token)) {
                var sessionOpt = authSessionService.getSessionFromToken(token);
                return ResponseEntity.ok(Map.of(
                        "authenticated", true,
                        "memberId", sessionOpt.map(AuthSessionService.CachedSession::memberId).orElse("unknown"),
                        "memberName", sessionOpt.map(AuthSessionService.CachedSession::memberName).orElse("Team Member"),
                        "message", "Session active"
                ));
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "authenticated", false,
                "message", "Not authenticated"
        ));
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "APPZYS Client Acquisition CRM",
                "authMode", "Permanent Access with One-Time Activation"
        ));
    }
}
