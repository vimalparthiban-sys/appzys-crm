package com.appzys.crm.service;

import com.appzys.crm.dto.AuthLoginRequest;
import com.appzys.crm.dto.AuthResponseDto;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class AuthSessionService {

    @Value("${crm.security.username:}")
    private String expectedUsername;

    @Value("${crm.security.password:}")
    private String expectedPassword;

    @Value("${crm.security.auth-secret:}")
    private String authSecret;

    @Value("${crm.security.token-validity-hours:336}") // Default 14 days for Remember Device
    private int tokenValidityHours;

    @Value("${crm.security.max-login-attempts:5}")
    private int maxLoginAttempts;

    @Value("${crm.security.lockout-minutes:15}")
    private int lockoutMinutes;

    // In-memory active session registry (Single-instance setup)
    private final Map<String, SessionInfo> sessionRegistry = new ConcurrentHashMap<>();

    // IP-based Rate limiting tracker
    private final Map<String, RateLimitTracker> rateLimitMap = new ConcurrentHashMap<>();

    @PostConstruct
    public void validateSecurityConfiguration() {
        if (expectedUsername == null || expectedUsername.trim().isEmpty()) {
            throw new IllegalStateException("CRITICAL CONFIGURATION ERROR: CRM_ACCESS_USERNAME must be explicitly set via environment variable.");
        }
        if (expectedPassword == null || expectedPassword.trim().length() < 12) {
            throw new IllegalStateException("CRITICAL CONFIGURATION ERROR: CRM_ACCESS_PASSWORD must be explicitly set and be at least 12 characters long.");
        }
        if (authSecret == null || authSecret.trim().length() < 32) {
            throw new IllegalStateException("CRITICAL CONFIGURATION ERROR: CRM_AUTH_SECRET must be explicitly set and be at least 32 characters long.");
        }
        log.info("Production security configuration validated successfully for user: [{}]. Weak default fallbacks removed.", expectedUsername);
    }

    public record SessionInfo(
            String sessionId,
            String username,
            long createdAt,
            long expiresAt,
            String ipAddress,
            String userAgent,
            long lastActiveAt
    ) {}

    public static class RateLimitTracker {
        private int failedAttempts = 0;
        private long lockedUntil = 0;

        public synchronized boolean isLocked() {
            if (lockedUntil > 0 && System.currentTimeMillis() < lockedUntil) {
                return true;
            }
            if (lockedUntil > 0 && System.currentTimeMillis() >= lockedUntil) {
                failedAttempts = 0;
                lockedUntil = 0;
            }
            return false;
        }

        public synchronized long getRemainingLockoutSeconds() {
            if (isLocked()) {
                return Math.max(1, (lockedUntil - System.currentTimeMillis()) / 1000);
            }
            return 0;
        }

        public synchronized void recordFailure(int maxAttempts, int lockoutMinutes) {
            failedAttempts++;
            if (failedAttempts >= maxAttempts) {
                lockedUntil = System.currentTimeMillis() + (lockoutMinutes * 60L * 1000L);
            }
        }

        public synchronized void reset() {
            failedAttempts = 0;
            lockedUntil = 0;
        }

        public synchronized int getFailedAttempts() {
            return failedAttempts;
        }
    }

    public record LoginResult(
            boolean authenticated,
            boolean rateLimited,
            long retryAfterSeconds,
            AuthResponseDto responseDto
    ) {}

    /**
     * Authenticate single-user credentials with rate limiting, anti-spoof IP tracking, and constant-time comparison.
     */
    public LoginResult authenticate(AuthLoginRequest request, HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        RateLimitTracker tracker = rateLimitMap.computeIfAbsent(clientIp, k -> new RateLimitTracker());

        if (tracker.isLocked()) {
            long remainingSec = tracker.getRemainingLockoutSeconds();
            log.warn("Login blocked by rate limiter for client IP: {}. Lockout active for {}s", clientIp, remainingSec);
            return new LoginResult(
                    false,
                    true,
                    remainingSec,
                    AuthResponseDto.builder()
                            .authenticated(false)
                            .message("Too many failed login attempts. Account locked. Please wait " + remainingSec + " seconds before retrying.")
                            .build()
            );
        }

        boolean usernameMatches = constantTimeEquals(request.getUsername(), expectedUsername);
        boolean passwordMatches = constantTimeEquals(request.getPassword(), expectedPassword);

        if (!usernameMatches || !passwordMatches) {
            tracker.recordFailure(maxLoginAttempts, lockoutMinutes);
            int attemptsLeft = Math.max(0, maxLoginAttempts - tracker.getFailedAttempts());
            log.warn("Failed login attempt from client IP: {}. Attempts remaining before lockout: {}", clientIp, attemptsLeft);

            if (tracker.isLocked()) {
                long remainingSec = tracker.getRemainingLockoutSeconds();
                return new LoginResult(
                        false,
                        true,
                        remainingSec,
                        AuthResponseDto.builder()
                                .authenticated(false)
                                .message("Account locked due to 5 consecutive failed attempts. Please retry after " + remainingSec + " seconds.")
                                .build()
                );
            }

            return new LoginResult(
                    false,
                    false,
                    0,
                    AuthResponseDto.builder()
                            .authenticated(false)
                            .message("Invalid username or password. " + attemptsLeft + " attempt(s) remaining.")
                            .build()
            );
        }

        // Successful authentication: Reset IP rate limiter
        tracker.reset();

        // Consistent Token Expiration based on Remember Device option
        boolean remember = Boolean.TRUE.equals(request.getRememberDevice());
        long validityMillis = remember
                ? ((long) tokenValidityHours * 3600L * 1000L) // 14 days
                : (24L * 3600L * 1000L);                      // 24 hours

        long now = System.currentTimeMillis();
        long expiresAt = now + validityMillis;
        String sessionId = UUID.randomUUID().toString();

        String userAgent = httpRequest.getHeader("User-Agent");
        SessionInfo sessionInfo = new SessionInfo(
                sessionId,
                expectedUsername,
                now,
                expiresAt,
                clientIp,
                userAgent != null ? userAgent : "Unknown",
                now
        );

        sessionRegistry.put(sessionId, sessionInfo);

        // Generate signed token: payload.signature
        String token = createSignedToken(sessionId, expiresAt);

        log.info("Single-user login successful from IP: {}, session: {}, remember: {}, expires in: {}s",
                clientIp, sessionId, remember, validityMillis / 1000L);

        AuthResponseDto dto = AuthResponseDto.builder()
                .authenticated(true)
                .token(token)
                .username(expectedUsername)
                .expiresInSeconds(validityMillis / 1000L)
                .message("Login successful")
                .build();

        return new LoginResult(true, false, 0, dto);
    }

    /**
     * Validates bearer token against HMAC-SHA256 signature and in-memory session registry.
     */
    public boolean validateToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        try {
            String[] parts = token.split("\\.");
            if (parts.length != 2) {
                return false;
            }

            String payloadBase64 = parts[0];
            String signatureBase64 = parts[1];

            // Verify signature using constant-time comparison
            byte[] expectedSig = computeHmacSha256(payloadBase64.getBytes(StandardCharsets.UTF_8));
            byte[] providedSig = Base64.getUrlDecoder().decode(signatureBase64);

            if (!MessageDigest.isEqual(expectedSig, providedSig)) {
                return false;
            }

            // Unpack payload: sessionId:expiresAt
            String payload = new String(Base64.getUrlDecoder().decode(payloadBase64), StandardCharsets.UTF_8);
            String[] payloadParts = payload.split(":");
            if (payloadParts.length != 2) {
                return false;
            }

            String sessionId = payloadParts[0];
            long expiresAt = Long.parseLong(payloadParts[1]);

            // Server-side strict expiration enforcement
            if (System.currentTimeMillis() > expiresAt) {
                sessionRegistry.remove(sessionId);
                return false;
            }

            // Verify session existence in active registry
            SessionInfo session = sessionRegistry.get(sessionId);
            if (session == null) {
                return false;
            }

            // Touch lastActiveAt
            sessionRegistry.put(sessionId, new SessionInfo(
                    session.sessionId(),
                    session.username(),
                    session.createdAt(),
                    session.expiresAt(),
                    session.ipAddress(),
                    session.userAgent(),
                    System.currentTimeMillis()
            ));

            return true;
        } catch (Exception e) {
            log.debug("Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Revokes active session ID and removes from in-memory registry.
     */
    public void revokeSession(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        try {
            String[] parts = token.split("\\.");
            if (parts.length == 2) {
                String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
                String[] payloadParts = payload.split(":");
                if (payloadParts.length == 2) {
                    String sessionId = payloadParts[0];
                    sessionRegistry.remove(sessionId);
                    log.info("Session {} revoked successfully on logout.", sessionId);
                }
            }
        } catch (Exception e) {
            log.warn("Error revoking session: {}", e.getMessage());
        }
    }

    public int getActiveSessionCount() {
        long now = System.currentTimeMillis();
        sessionRegistry.entrySet().removeIf(entry -> entry.getValue().expiresAt() < now);
        return sessionRegistry.size();
    }

    private String createSignedToken(String sessionId, long expiresAt) {
        String payload = sessionId + ":" + expiresAt;
        String payloadBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        byte[] sig = computeHmacSha256(payloadBase64.getBytes(StandardCharsets.UTF_8));
        String sigBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(sig);
        return payloadBase64 + "." + sigBase64;
    }

    private byte[] computeHmacSha256(byte[] data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(authSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            return mac.doFinal(data);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to calculate HMAC-SHA256", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(aBytes, bBytes);
    }

    /**
     * Hardened client IP extraction:
     * Resolves the genuine client IP through the trusted reverse proxy chain (Render Envoy / Cloudflare).
     * 
     * Security protections:
     * 1. Direct callers cannot spoof IPs using X-Forwarded-For or X-Real-IP:
     *    If the direct peer (request.getRemoteAddr()) is NOT a trusted proxy, all forwarding headers are ignored.
     * 2. When behind a trusted proxy (Render edge proxy), X-Forwarded-For is evaluated from right to left,
     *    taking the immediate non-internal hop appended by the trusted proxy.
     * 3. Untrusted X-Real-IP fallback is completely removed to prevent client injection.
     */
    public String extractClientIp(HttpServletRequest request) {
        String peerIp = request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";

        // If the immediate connection does not come from a trusted proxy,
        // treat it as a direct connection and ignore all forwarding headers completely.
        if (!isTrustedProxy(peerIp)) {
            return sanitizeIp(peerIp);
        }

        // Connection is from a trusted proxy (e.g. Render edge router).
        // Inspect X-Forwarded-For: The reverse proxy appends the client IP at the end.
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            String[] hops = xForwardedFor.split(",");
            // Traverse from rightmost (appended by closest trusted proxy) to leftmost
            for (int i = hops.length - 1; i >= 0; i--) {
                String candidate = sanitizeIp(hops[i].trim());
                if (!candidate.isEmpty() && !isTrustedProxy(candidate)) {
                    // First non-trusted-proxy IP from the right is the genuine client IP
                    return candidate;
                }
            }
            // If all hops are private/proxy IPs, take the rightmost non-empty IP
            String rightmost = sanitizeIp(hops[hops.length - 1].trim());
            if (!rightmost.isEmpty()) {
                return rightmost;
            }
        }

        return sanitizeIp(peerIp);
    }

    public boolean isTrustedProxy(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }
        String clean = sanitizeIp(ip);
        return clean.equals("127.0.0.1") ||
               clean.equals("::1") ||
               clean.equals("0:0:0:0:0:0:0:1") ||
               clean.startsWith("10.") ||
               clean.startsWith("192.168.") ||
               clean.startsWith("169.254.") ||
               isRfc1918ClassB(clean);
    }

    private boolean isRfc1918ClassB(String ip) {
        if (ip.startsWith("172.")) {
            String[] parts = ip.split("\\.");
            if (parts.length >= 2) {
                try {
                    int secondOctet = Integer.parseInt(parts[1]);
                    return secondOctet >= 16 && secondOctet <= 31;
                } catch (NumberFormatException ignored) {}
            }
        }
        return false;
    }

    private String sanitizeIp(String ip) {
        if (ip == null) return "";
        String clean = ip.trim();
        if (clean.contains(":") && !clean.contains("::")) {
            clean = clean.substring(0, clean.indexOf(':'));
        }
        return clean;
    }
}
