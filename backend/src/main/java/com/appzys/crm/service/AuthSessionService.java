package com.appzys.crm.service;

import com.appzys.crm.dto.InviteExchangeRequest;
import com.appzys.crm.dto.InviteExchangeResponse;
import com.appzys.crm.model.AuthInvite;
import com.appzys.crm.model.Employee;
import com.appzys.crm.model.MemberSession;
import com.appzys.crm.repository.AuthInviteRepository;
import com.appzys.crm.repository.EmployeeRepository;
import com.appzys.crm.repository.MemberSessionRepository;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class AuthSessionService {

    private final AuthInviteRepository authInviteRepository;
    private final MemberSessionRepository memberSessionRepository;
    private final EmployeeRepository employeeRepository;

    public AuthSessionService() {
        this(null, null, null);
    }

    @Autowired
    public AuthSessionService(AuthInviteRepository authInviteRepository,
                              MemberSessionRepository memberSessionRepository,
                              EmployeeRepository employeeRepository) {
        this.authInviteRepository = authInviteRepository;
        this.memberSessionRepository = memberSessionRepository;
        this.employeeRepository = employeeRepository;
    }

    @Value("${crm.security.auth-secret:local-development-transient-secret-key-minimum-32-chars}")
    private String authSecret;

    @Value("${crm.security.master-admin-key:appzys-master-admin-key-minimum-32-chars}")
    private String masterAdminKey;

    @Value("${crm.security.token-validity-hours:720}") // Retained for compatibility
    private int tokenValidityHours;

    @Value("${crm.security.max-login-attempts:5}")
    private int maxLoginAttempts;

    @Value("${crm.security.lockout-minutes:15}")
    private int lockoutMinutes;

    @Value("${crm.ai.antigravity-key:ag-ai-key-sec-antigravity-crm-2026-v2}")
    private String aiAntigravityKey;

    @Value("${crm.ai.chatgpt-key:cg-ai-key-sec-chatgptwork-crm-2026-v2}")
    private String aiChatgptKey;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom secureRandom = new SecureRandom();

    // Multi-instance synchronization: 5-second TTL ensures any backend instance re-validates against TiDB
    private static final long CACHE_TTL_MILLIS = 5000L;

    // Fast in-memory cache backed by TiDB Cloud database
    private final Map<String, CachedSession> sessionCache = new ConcurrentHashMap<>();
    private final Map<String, CachedStatus> employeeStatusCache = new ConcurrentHashMap<>();
    private final Map<String, RateLimitTracker> rateLimitMap = new ConcurrentHashMap<>();

    // Administrative staging of initial enrollment links (never logged, queryable only by Master Admin)
    private final Map<String, AdminInviteRecord> initialInviteLinks = new LinkedHashMap<>();

    public record CachedSession(
            String sessionId,
            String memberId,
            String memberName,
            boolean isPermanent,
            long expiresAtMillis,
            boolean isRevoked,
            long cachedAtMillis
    ) {
        public boolean isStale() {
            return (System.currentTimeMillis() - cachedAtMillis) > CACHE_TTL_MILLIS;
        }
    }

    public record CachedStatus(boolean active, long cachedAtMillis) {
        public boolean isStale() {
            return (System.currentTimeMillis() - cachedAtMillis) > CACHE_TTL_MILLIS;
        }
    }

    public record AdminInviteRecord(
            String memberId,
            String memberName,
            String rawCode,
            String rawPin,
            LocalDateTime createdAt
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

    @PostConstruct
    public void init() {
        boolean isProduction = System.getenv("RENDER") != null ||
                "prod".equalsIgnoreCase(System.getenv("CRM_ENV")) ||
                "production".equalsIgnoreCase(System.getenv("CRM_ENV"));

        if (isProduction) {
            if (authSecret == null || authSecret.trim().length() < 32 ||
                    "local-development-transient-secret-key-minimum-32-chars".equals(authSecret.trim())) {
                throw new IllegalStateException("CRITICAL CONFIGURATION ERROR: CRM_AUTH_SECRET must be explicitly set and at least 32 characters in production.");
            }
            if (masterAdminKey == null || masterAdminKey.trim().length() < 32 ||
                    "appzys-master-admin-key-minimum-32-chars".equals(masterAdminKey.trim())) {
                throw new IllegalStateException("CRITICAL CONFIGURATION ERROR: CRM_MASTER_ADMIN_KEY must be explicitly set and at least 32 characters in production.");
            }
            if (aiAntigravityKey == null || aiAntigravityKey.trim().length() < 32) {
                throw new IllegalStateException("CRITICAL CONFIGURATION ERROR: CRM_AI_ANTIGRAVITY_KEY must be set in production.");
            }
            if (aiChatgptKey == null || aiChatgptKey.trim().length() < 32) {
                throw new IllegalStateException("CRITICAL CONFIGURATION ERROR: CRM_AI_CHATGPT_KEY must be set in production.");
            }
        }

        // Initialize 4 team member records and initial invites if database has none
        initializeMemberInvitesIfEmpty();
        log.info("AuthSessionService initialized successfully. Mode: {}", isProduction ? "PRODUCTION" : "LOCAL_DEV");
    }

    /**
     * Seeds initial 4 employee identities (ACTIVE) and initial enrollment invites if database is fresh.
     * Ensures NO secrets or PINs are emitted in logs.
     */
    @Transactional
    public synchronized void initializeMemberInvitesIfEmpty() {
        if (employeeRepository == null || authInviteRepository == null) return;
        try {
            String[][] members = {
                    {"emp1", "Vimal P"},
                    {"emp2", "Madhan"},
                    {"emp3", "Employee 3"},
                    {"emp4", "Employee 4"}
            };

            for (String[] m : members) {
                String memberId = m[0];
                String memberName = m[1];
                if (!employeeRepository.existsById(memberId)) {
                    employeeRepository.save(Employee.builder()
                            .memberId(memberId)
                            .memberName(memberName)
                            .status("ACTIVE")
                            .build());
                } else if ("emp2".equals(memberId)) {
                    // Ensure emp2 name is synchronized to Madhan
                    employeeRepository.findById(memberId).ifPresent(emp -> {
                        if (!"Madhan".equals(emp.getMemberName())) {
                            emp.setMemberName("Madhan");
                            employeeRepository.save(emp);
                        }
                    });
                }
            }

            long inviteCount = authInviteRepository.count();
            if (inviteCount > 0) {
                return; // Invites already exist
            }

            // Single Employee Onboarding: Only emp2 (Madhan) receives an initial enrollment invitation.
            // emp1, emp3, and emp4 remain in crm_employees as ACTIVE accounts, but receive ZERO invitations.
            String initialOnboardingMemberId = "emp2";
            String initialOnboardingMemberName = getMemberName(initialOnboardingMemberId);
            if (initialOnboardingMemberName == null || initialOnboardingMemberName.isBlank() || "emp2".equals(initialOnboardingMemberName)) {
                initialOnboardingMemberName = "Madhan";
            }

            log.info("Seeding single initial employee enrollment record for [{}] ({}) (no secrets logged)...", initialOnboardingMemberName, initialOnboardingMemberId);

            byte[] codeBytes = new byte[16];
            secureRandom.nextBytes(codeBytes);
            String rawCode = "INV-" + Base64.getUrlEncoder().withoutPadding().encodeToString(codeBytes);

            int pinNum = 100000 + secureRandom.nextInt(900000);
            String rawPin = String.valueOf(pinNum);

            String inviteHash = sha256(rawCode);
            String pinHash = passwordEncoder.encode(rawPin);

            AuthInvite invite = AuthInvite.builder()
                    .memberId(initialOnboardingMemberId)
                    .memberName(initialOnboardingMemberName)
                    .inviteHash(inviteHash)
                    .pinHash(pinHash)
                    .expiresAt(LocalDateTime.now().plusYears(1)) // Valid until consumed or revoked
                    .isConsumed(false)
                    .build();

            authInviteRepository.save(invite);
            initialInviteLinks.put(initialOnboardingMemberId, new AdminInviteRecord(initialOnboardingMemberId, initialOnboardingMemberName, rawCode, rawPin, LocalDateTime.now()));
            // CRITICAL HYGIENE: Never log raw PIN or invite code
            log.info("Seeded initial enrollment invitation record strictly for employee [{}] ({})", initialOnboardingMemberName, initialOnboardingMemberId);
        } catch (Exception e) {
            log.warn("Database employee/invite seeding deferred: {}", e.getMessage());
        }
    }

    /**
     * Master-admin query for initial invite records.
     */
    public Map<String, AdminInviteRecord> getInitialInviteLinks() {
        return Collections.unmodifiableMap(initialInviteLinks);
    }

    /**
     * Purges transient initial invite secrets from in-memory cache after administrator retrieval.
     */
    public void purgeInitialInviteLinks() {
        initialInviteLinks.clear();
        log.info("Administrative purge: Transient setup invitation credentials purged from memory.");
    }

    public record ExchangeResult(
            boolean success,
            boolean rateLimited,
            long retryAfterSeconds,
            InviteExchangeResponse response
    ) {}

    /**
     * Atomically exchange an invite code + 6-digit PIN for a PERMANENT device session.
     * Enforces:
     * 1. Rate limiting on PIN attempts (5 max, 15m lockout)
     * 2. Employee must be in ACTIVE status
     * 3. Atomic database consumption (no replay or race conditions)
     * 4. Issuance of permanent session (no periodic reactivation or daily PIN requirement)
     */
    @Transactional
    public ExchangeResult exchangeInvite(InviteExchangeRequest request, HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        RateLimitTracker tracker = rateLimitMap.computeIfAbsent(clientIp, k -> new RateLimitTracker());

        if (tracker.isLocked()) {
            long remaining = tracker.getRemainingLockoutSeconds();
            return new ExchangeResult(false, true, remaining,
                    InviteExchangeResponse.builder()
                            .authenticated(false)
                            .message("Too many failed attempts. Device locked for " + remaining + " seconds.")
                            .build()
            );
        }

        String inviteHash = sha256(request.getInviteCode().trim());
        Optional<AuthInvite> inviteOpt = authInviteRepository.findByInviteHashAndIsConsumedFalse(inviteHash);

        if (inviteOpt.isEmpty()) {
            tracker.recordFailure(maxLoginAttempts, lockoutMinutes);
            int left = Math.max(0, maxLoginAttempts - tracker.getFailedAttempts());
            return new ExchangeResult(false, tracker.isLocked(), tracker.getRemainingLockoutSeconds(),
                    InviteExchangeResponse.builder()
                            .authenticated(false)
                            .message("Invalid, expired, or already consumed invitation link. " + left + " attempt(s) remaining.")
                            .build()
            );
        }

        AuthInvite invite = inviteOpt.get();

        // Check if employee account is revoked
        if (employeeRepository != null) {
            Optional<Employee> empOpt = employeeRepository.findById(invite.getMemberId());
            if (empOpt.isEmpty() || !empOpt.get().isActive()) {
                return new ExchangeResult(false, false, 0,
                        InviteExchangeResponse.builder()
                                .authenticated(false)
                                .message("This employee account has been revoked by the administrator.")
                                .build()
                );
            }
        }

        // Check expiration
        if (invite.getExpiresAt() != null && invite.getExpiresAt().isBefore(LocalDateTime.now())) {
            return new ExchangeResult(false, false, 0,
                    InviteExchangeResponse.builder()
                            .authenticated(false)
                            .message("This invitation link has expired. Please contact the administrator.")
                            .build()
            );
        }

        // Verify 6-digit PIN with BCrypt
        if (!passwordEncoder.matches(request.getPin().trim(), invite.getPinHash())) {
            tracker.recordFailure(maxLoginAttempts, lockoutMinutes);
            int left = Math.max(0, maxLoginAttempts - tracker.getFailedAttempts());
            if (tracker.isLocked()) {
                long remaining = tracker.getRemainingLockoutSeconds();
                return new ExchangeResult(false, true, remaining,
                        InviteExchangeResponse.builder()
                                .authenticated(false)
                                .message("Account locked due to 5 failed attempts. Please retry after " + remaining + " seconds.")
                                .build()
                );
            }
            return new ExchangeResult(false, false, 0,
                    InviteExchangeResponse.builder()
                            .authenticated(false)
                            .message("Incorrect 6-digit activation PIN. " + left + " attempt(s) remaining.")
                            .build()
            );
        }

        // Atomic database consumption (Race-condition protection)
        int updated = authInviteRepository.consumeAtomic(inviteHash, LocalDateTime.now());
        if (updated == 0) {
            return new ExchangeResult(false, false, 0,
                    InviteExchangeResponse.builder()
                            .authenticated(false)
                            .message("Invitation link has already been consumed.")
                            .build()
            );
        }

        // Success: Reset rate limiter
        tracker.reset();

        // Create PERMANENT individual device session in TiDB database
        String sessionId = UUID.randomUUID().toString();
        String userAgent = httpRequest.getHeader("User-Agent");
        String deviceName = parseDeviceName(userAgent);

        MemberSession session = MemberSession.builder()
                .sessionId(sessionId)
                .memberId(invite.getMemberId())
                .memberName(invite.getMemberName())
                .deviceName(deviceName)
                .isPermanent(true)
                .expiresAt(null) // NULL indicates permanent session
                .isRevoked(false)
                .userAgent(userAgent != null ? userAgent : "Unknown Device")
                .ipAddress(clientIp)
                .build();

        memberSessionRepository.save(session);

        // Cache in memory with timestamp
        long nowMillis = System.currentTimeMillis();
        sessionCache.put(sessionId, new CachedSession(
                sessionId,
                invite.getMemberId(),
                invite.getMemberName(),
                true,
                0L,
                false,
                nowMillis
        ));
        employeeStatusCache.put(invite.getMemberId(), new CachedStatus(true, nowMillis));

        // Create permanent signed token: payload.signature (expiresAt = 0 for permanent)
        String token = createSignedToken(sessionId, 0L);

        log.info("Employee [{}] ({}) permanently enrolled device '{}' (session: {}) from IP: {}",
                invite.getMemberName(), invite.getMemberId(), deviceName, sessionId, clientIp);

        return new ExchangeResult(true, false, 0,
                InviteExchangeResponse.builder()
                        .authenticated(true)
                        .token(token)
                        .memberId(invite.getMemberId())
                        .memberName(invite.getMemberName())
                        .expiresInSeconds(-1L) // -1 indicates permanent session until revoked
                        .message("Device enrollment successful. Permanent access granted.")
                        .build()
        );
    }

    /**
     * Validates member session token on EVERY protected API request.
     * Enforces:
     * 1. Cryptographic signature check
     * 2. Device session not revoked in TiDB
     * 3. Employee account is in ACTIVE status (not revoked)
     * 4. Multi-instance & restart survival via TiDB backing
     */
    public boolean validateMemberToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        try {
            String[] parts = token.split("\\.");
            if (parts.length != 2) return false;

            String payloadBase64 = parts[0];
            String signatureBase64 = parts[1];

            byte[] expectedSig = computeHmacSha256(payloadBase64.getBytes(StandardCharsets.UTF_8));
            byte[] providedSig = Base64.getUrlDecoder().decode(signatureBase64);

            if (!MessageDigest.isEqual(expectedSig, providedSig)) {
                return false;
            }

            String payload = new String(Base64.getUrlDecoder().decode(payloadBase64), StandardCharsets.UTF_8);
            String[] payloadParts = payload.split(":");
            if (payloadParts.length != 2) return false;

            String sessionId = payloadParts[0];
            long expiresAtMillis = Long.parseLong(payloadParts[1]);

            // If a non-zero expiry is set, check time. If 0, it's permanent.
            if (expiresAtMillis > 0 && System.currentTimeMillis() > expiresAtMillis) {
                sessionCache.remove(sessionId);
                return false;
            }

            // Check in-memory cache if not stale (5-second TTL ensures cross-instance revocation)
            CachedSession cached = sessionCache.get(sessionId);
            if (cached != null && !cached.isStale()) {
                if (cached.isRevoked()) {
                    sessionCache.remove(sessionId);
                    return false;
                }
                // Verify employee status is still ACTIVE
                if (!isEmployeeActive(cached.memberId())) {
                    sessionCache.remove(sessionId);
                    return false;
                }
                return true;
            }

            // Fallback to TiDB Database (handles backend restarts, multi-instance, cross-device)
            Optional<MemberSession> dbSession = memberSessionRepository.findBySessionIdAndIsRevokedFalse(sessionId);
            if (dbSession.isEmpty()) {
                sessionCache.remove(sessionId);
                return false;
            }

            MemberSession s = dbSession.get();
            if (s.getExpiresAt() != null) {
                long dbExpiresMillis = s.getExpiresAt().toEpochSecond(java.time.ZoneOffset.UTC) * 1000L;
                if (System.currentTimeMillis() > dbExpiresMillis) {
                    sessionCache.remove(sessionId);
                    return false;
                }
            }

            // Verify employee status in database
            if (!isEmployeeActive(s.getMemberId())) {
                sessionCache.remove(sessionId);
                return false;
            }

            // Re-populate cache with timestamp
            sessionCache.put(sessionId, new CachedSession(
                    sessionId,
                    s.getMemberId(),
                    s.getMemberName(),
                    Boolean.TRUE.equals(s.getIsPermanent()),
                    s.getExpiresAt() != null ? s.getExpiresAt().toEpochSecond(java.time.ZoneOffset.UTC) * 1000L : 0L,
                    false,
                    System.currentTimeMillis()
            ));
            return true;
        } catch (Exception e) {
            log.debug("Member token validation failed: {}", e.getMessage());
            return false;
        }
    }

    private boolean isEmployeeActive(String memberId) {
        if (employeeRepository == null) return true;
        CachedStatus cached = employeeStatusCache.get(memberId);
        if (cached != null && !cached.isStale()) {
            return cached.active();
        }
        Optional<Employee> emp = employeeRepository.findById(memberId);
        boolean active = emp.isPresent() && emp.get().isActive();
        employeeStatusCache.put(memberId, new CachedStatus(active, System.currentTimeMillis()));
        return active;
    }

    /**
     * Resolves member details from active token.
     */
    public Optional<CachedSession> getSessionFromToken(String token) {
        if (!validateMemberToken(token)) return Optional.empty();
        try {
            String payloadBase64 = token.split("\\.")[0];
            String payload = new String(Base64.getUrlDecoder().decode(payloadBase64), StandardCharsets.UTF_8);
            String sessionId = payload.split(":")[0];
            return Optional.ofNullable(sessionCache.get(sessionId));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Centralized Administrator Revocation:
     * Immediately revokes an employee across ALL browsers, devices, and sessions globally.
     * 1. Sets crm_employees.status = 'REVOKED'
     * 2. Sets all sessions for memberId to is_revoked = true in TiDB
     * 3. Instantly evicts in-memory caches
     * 4. Other 3 employees remain unaffected
     */
    @Transactional
    public int revokeEmployee(String memberId) {
        if (memberId == null || memberId.isBlank()) return 0;
        LocalDateTime now = LocalDateTime.now();

        if (employeeRepository != null) {
            employeeRepository.revokeEmployee(memberId, now);
        }

        int revokedSessions = memberSessionRepository.revokeAllByMemberId(memberId, now);

        // Instant cache eviction
        employeeStatusCache.put(memberId, new CachedStatus(false, System.currentTimeMillis()));
        sessionCache.entrySet().removeIf(entry -> entry.getValue().memberId().equalsIgnoreCase(memberId));

        log.warn("ADMIN REVOCATION: Employee [{}] has been REVOKED globally. Total sessions invalidated: {}",
                memberId, revokedSessions);
        return revokedSessions;
    }

    /**
     * Centralized Administrator Restoration:
     * Restores a previously revoked employee to ACTIVE status upon explicit authorization.
     */
    @Transactional
    public boolean restoreEmployee(String memberId) {
        if (memberId == null || memberId.isBlank()) return false;
        LocalDateTime now = LocalDateTime.now();

        if (employeeRepository != null) {
            employeeRepository.restoreEmployee(memberId, now);
            employeeStatusCache.put(memberId, new CachedStatus(true, System.currentTimeMillis()));
            log.info("ADMIN RESTORATION: Employee [{}] status restored to ACTIVE.", memberId);
            return true;
        }
        return false;
    }

    /**
     * Generates a secure one-time enrollment link + PIN for an employee to enroll a new browser or computer.
     * Keeps access permanent on that new device once activated.
     */
    @Transactional
    public AdminInviteRecord generateDeviceEnrollment(String memberId) {
        if (employeeRepository != null) {
            Employee emp = employeeRepository.findById(memberId)
                    .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + memberId));
            if (!emp.isActive()) {
                throw new IllegalStateException("Cannot generate enrollment for revoked employee: " + memberId);
            }
        }

        byte[] codeBytes = new byte[16];
        secureRandom.nextBytes(codeBytes);
        String rawCode = "INV-" + Base64.getUrlEncoder().withoutPadding().encodeToString(codeBytes);

        int pinNum = 100000 + secureRandom.nextInt(900000);
        String rawPin = String.valueOf(pinNum);

        String inviteHash = sha256(rawCode);
        String pinHash = passwordEncoder.encode(rawPin);

        String memberName = getMemberName(memberId);

        AuthInvite invite = AuthInvite.builder()
                .memberId(memberId)
                .memberName(memberName)
                .inviteHash(inviteHash)
                .pinHash(pinHash)
                .expiresAt(LocalDateTime.now().plusDays(30)) // Valid until consumed
                .isConsumed(false)
                .build();

        authInviteRepository.save(invite);
        AdminInviteRecord record = new AdminInviteRecord(memberId, memberName, rawCode, rawPin, LocalDateTime.now());
        initialInviteLinks.put(memberId, record);

        log.info("Generated new device enrollment invite for employee [{}] ({})", memberName, memberId);
        return record;
    }

    private String getMemberName(String memberId) {
        if (employeeRepository != null) {
            return employeeRepository.findById(memberId).map(Employee::getMemberName).orElse(memberId);
        }
        return switch (memberId) {
            case "emp1" -> "Vimal P";
            case "emp2" -> "Madhan";
            case "emp3" -> "Employee 3";
            case "emp4" -> "Employee 4";
            default -> memberId;
        };
    }

    /**
     * Validates dedicated M2M AI agent tokens (Antigravity and ChatGPT Work).
     */
    public Optional<String> validateAiToken(String token) {
        if (token == null || token.isBlank()) return Optional.empty();

        if (constantTimeEquals(token, aiAntigravityKey)) {
            return Optional.of("AI:Antigravity");
        }
        if (constantTimeEquals(token, aiChatgptKey)) {
            return Optional.of("AI:ChatGPT-Work");
        }
        return Optional.empty();
    }

    public boolean validateMasterAdminKey(String key) {
        if (key == null || key.isBlank()) return false;
        return constantTimeEquals(key, masterAdminKey);
    }

    public void clearCache() {
        sessionCache.clear();
        employeeStatusCache.clear();
    }

    public void setAuthSecret(String authSecret) {
        this.authSecret = authSecret;
    }

    public void setAiAntigravityKey(String aiAntigravityKey) {
        this.aiAntigravityKey = aiAntigravityKey;
    }

    public void setAiChatgptKey(String aiChatgptKey) {
        this.aiChatgptKey = aiChatgptKey;
    }

    public void setMasterAdminKey(String masterAdminKey) {
        this.masterAdminKey = masterAdminKey;
    }

    public void setTokenValidityHours(int tokenValidityHours) {
        this.tokenValidityHours = tokenValidityHours;
    }

    public void setMaxLoginAttempts(int maxLoginAttempts) {
        this.maxLoginAttempts = maxLoginAttempts;
    }

    public void setLockoutMinutes(int lockoutMinutes) {
        this.lockoutMinutes = lockoutMinutes;
    }

    public String createSignedToken(String sessionId, long expiresAtMillis) {
        String payload = sessionId + ":" + expiresAtMillis;
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

    public String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(aBytes, bBytes);
    }

    private String parseDeviceName(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) return "Unknown Device";
        String browser = "Browser";
        if (userAgent.contains("Edg/")) browser = "Edge";
        else if (userAgent.contains("Chrome/")) browser = "Chrome";
        else if (userAgent.contains("Safari/")) browser = "Safari";
        else if (userAgent.contains("Firefox/")) browser = "Firefox";

        String os = "Device";
        if (userAgent.contains("Windows")) os = "Windows";
        else if (userAgent.contains("Macintosh")) os = "Mac";
        else if (userAgent.contains("Linux")) os = "Linux";
        else if (userAgent.contains("Android")) os = "Android";
        else if (userAgent.contains("iPhone") || userAgent.contains("iPad")) os = "iOS";

        return browser + " on " + os;
    }

    public String extractClientIp(HttpServletRequest request) {
        String peerIp = request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
        if (!isTrustedProxy(peerIp)) {
            return sanitizeIp(peerIp);
        }
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            String[] hops = xForwardedFor.split(",");
            for (int i = hops.length - 1; i >= 0; i--) {
                String candidate = sanitizeIp(hops[i].trim());
                if (!candidate.isEmpty() && !isTrustedProxy(candidate)) {
                    return candidate;
                }
            }
            String rightmost = sanitizeIp(hops[hops.length - 1].trim());
            if (!rightmost.isEmpty()) return rightmost;
        }
        return sanitizeIp(peerIp);
    }

    public boolean isTrustedProxy(String ip) {
        if (ip == null || ip.isBlank()) return false;
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
                    int second = Integer.parseInt(parts[1]);
                    return second >= 16 && second <= 31;
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
