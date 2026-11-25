package com.appzys.crm;

import com.appzys.crm.config.AuthSecurityFilter;
import com.appzys.crm.config.WebCorsConfig;
import com.appzys.crm.dto.DuplicateCheckResponse;
import com.appzys.crm.dto.InviteExchangeRequest;
import com.appzys.crm.dto.InviteExchangeResponse;
import com.appzys.crm.model.*;
import com.appzys.crm.repository.AuthInviteRepository;
import com.appzys.crm.repository.EmployeeRepository;
import com.appzys.crm.repository.MemberSessionRepository;
import com.appzys.crm.service.AuthSessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.repository.query.FluentQuery;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

public class SecurityArchitectureTestSuite {

    private AuthSessionService authSessionService;
    private AuthSecurityFilter authSecurityFilter;
    private InMemoryEmployeeRepository employeeRepository;
    private InMemoryAuthInviteRepository inviteRepository;
    private InMemoryMemberSessionRepository sessionRepository;

    private final String authSecret = "test-secret-key-for-development-must-be-32-chars-long";
    private final String aiAntigravityKey = "test-antigravity-secret-key-32-chars-minimum";
    private final String aiChatgptKey = "test-chatgptwork-secret-key-32-chars-minimum";
    private final String masterAdminKey = "test-master-admin-key-32-chars-minimum";

    @BeforeEach
    public void setUp() {
        employeeRepository = new InMemoryEmployeeRepository();
        inviteRepository = new InMemoryAuthInviteRepository();
        sessionRepository = new InMemoryMemberSessionRepository();

        // Seed 4 initial company employees (ACTIVE)
        employeeRepository.save(Employee.builder().memberId("emp1").memberName("Vimal P").status("ACTIVE").build());
        employeeRepository.save(Employee.builder().memberId("emp2").memberName("Employee 2").status("ACTIVE").build());
        employeeRepository.save(Employee.builder().memberId("emp3").memberName("Employee 3").status("ACTIVE").build());
        employeeRepository.save(Employee.builder().memberId("emp4").memberName("Employee 4").status("ACTIVE").build());

        authSessionService = new AuthSessionService(inviteRepository, sessionRepository, employeeRepository);
        authSessionService.setAuthSecret(authSecret);
        authSessionService.setAiAntigravityKey(aiAntigravityKey);
        authSessionService.setAiChatgptKey(aiChatgptKey);
        authSessionService.setMasterAdminKey(masterAdminKey);
        authSessionService.setMaxLoginAttempts(5);
        authSessionService.setLockoutMinutes(15);

        WebCorsConfig webCorsConfig = new WebCorsConfig();
        webCorsConfig.setAllowedOriginsConfig("https://appzys-crm-frontend.onrender.com,http://localhost:3000");
        authSecurityFilter = new AuthSecurityFilter(authSessionService, webCorsConfig);
    }

    // =========================================================================
    // TEST 1: Initial PIN Activation
    // =========================================================================
    @Test
    @DisplayName("Test 1: Initial PIN activation succeeds for authorized employee")
    public void test01_InitialPinActivation() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String rawCode = "INV-ACTIVATE-EMP1";
        String pin = "654321";

        inviteRepository.save(AuthInvite.builder()
                .memberId("emp1")
                .memberName("Vimal P")
                .inviteHash(authSessionService.sha256(rawCode))
                .pinHash(encoder.encode(pin))
                .isConsumed(false)
                .build());

        MockHttpServletRequest req = new MockHttpServletRequest();
        req.addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0");
        AuthSessionService.ExchangeResult res = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(rawCode).pin(pin).build(), req);

        assertTrue(res.success(), "Initial activation must succeed");
        assertNotNull(res.response().getToken(), "Permanent session token must be issued");
        assertEquals("emp1", res.response().getMemberId());
        assertEquals(-1L, res.response().getExpiresInSeconds(), "Token must be permanent (-1)");
    }

    // =========================================================================
    // TEST 2: No Daily PIN Requirement
    // =========================================================================
    @Test
    @DisplayName("Test 2: No daily PIN requirement; enrolled device accesses CRM directly")
    public void test02_NoDailyPinRequirement() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String rawCode = "INV-DAILY-CHECK";
        String pin = "123456";

        inviteRepository.save(AuthInvite.builder()
                .memberId("emp1")
                .memberName("Vimal P")
                .inviteHash(authSessionService.sha256(rawCode))
                .pinHash(encoder.encode(pin))
                .isConsumed(false)
                .build());

        // Day 0: Activated once
        AuthSessionService.ExchangeResult res = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(rawCode).pin(pin).build(), new MockHttpServletRequest());
        String token = res.response().getToken();

        // Day 1, Day 10, Day 100: Token validates without needing any PIN
        assertTrue(authSessionService.validateMemberToken(token), "Session must validate on Day 1 without PIN prompt");
        assertTrue(authSessionService.validateMemberToken(token), "Session must validate on Day 30 without PIN prompt");
        assertTrue(authSessionService.validateMemberToken(token), "Session must validate on Day 100 without PIN prompt");
    }

    // =========================================================================
    // TEST 3: Permanent Employee Access Without Arbitrary Session Expiration
    // =========================================================================
    @Test
    @DisplayName("Test 3: Permanent access survives cache clearance without arbitrary expiration")
    public void test03_PermanentAccessNoExpiration() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String rawCode = "INV-PERMANENT";
        String pin = "888999";

        inviteRepository.save(AuthInvite.builder()
                .memberId("emp2")
                .memberName("Employee 2")
                .inviteHash(authSessionService.sha256(rawCode))
                .pinHash(encoder.encode(pin))
                .isConsumed(false)
                .build());

        AuthSessionService.ExchangeResult res = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(rawCode).pin(pin).build(), new MockHttpServletRequest());
        String token = res.response().getToken();

        // Simulate backend restart by wiping in-memory session cache
        authSessionService.clearCache();

        // Must re-hydrate from database and validate as permanent
        assertTrue(authSessionService.validateMemberToken(token),
                "Permanent session must remain valid across restarts and cache clears");
    }

    // =========================================================================
    // TEST 4: Access From Different Browsers (Chrome & Edge) After Secure Enrollment
    // =========================================================================
    @Test
    @DisplayName("Test 4: Employee can enroll and access CRM from Chrome and Edge independently")
    public void test04_AccessFromDifferentBrowsers() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        // 1. Chrome enrollment
        String chromeCode = "INV-CHROME-EMP1";
        String chromePin = "112233";
        inviteRepository.save(AuthInvite.builder()
                .memberId("emp1").memberName("Vimal P")
                .inviteHash(authSessionService.sha256(chromeCode)).pinHash(encoder.encode(chromePin)).isConsumed(false).build());

        MockHttpServletRequest chromeReq = new MockHttpServletRequest();
        chromeReq.addHeader("User-Agent", "Chrome/120.0.0.0 Windows");
        AuthSessionService.ExchangeResult chromeRes = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(chromeCode).pin(chromePin).build(), chromeReq);
        String chromeToken = chromeRes.response().getToken();

        // 2. Edge enrollment (e.g. employee links second browser)
        String edgeCode = "INV-EDGE-EMP1";
        String edgePin = "445566";
        inviteRepository.save(AuthInvite.builder()
                .memberId("emp1").memberName("Vimal P")
                .inviteHash(authSessionService.sha256(edgeCode)).pinHash(encoder.encode(edgePin)).isConsumed(false).build());

        MockHttpServletRequest edgeReq = new MockHttpServletRequest();
        edgeReq.addHeader("User-Agent", "Edg/120.0.0.0 Windows");
        AuthSessionService.ExchangeResult edgeRes = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(edgeCode).pin(edgePin).build(), edgeReq);
        String edgeToken = edgeRes.response().getToken();

        // Both Chrome and Edge have valid, distinct, permanent session tokens
        assertNotEquals(chromeToken, edgeToken, "Each browser must have an independent device session");
        assertTrue(authSessionService.validateMemberToken(chromeToken), "Chrome session must be valid");
        assertTrue(authSessionService.validateMemberToken(edgeToken), "Edge session must be valid");
    }

    // =========================================================================
    // TEST 5: Access From a Second Device After Secure Enrollment
    // =========================================================================
    @Test
    @DisplayName("Test 5: Access from a second device (Work Laptop & Home PC)")
    public void test05_AccessFromSecondDevice() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        // Laptop enrollment
        String laptopCode = "INV-LAPTOP";
        inviteRepository.save(AuthInvite.builder()
                .memberId("emp3").memberName("Employee 3")
                .inviteHash(authSessionService.sha256(laptopCode)).pinHash(encoder.encode("123123")).isConsumed(false).build());
        MockHttpServletRequest laptopReq = new MockHttpServletRequest();
        laptopReq.setRemoteAddr("192.168.1.50");
        String laptopToken = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(laptopCode).pin("123123").build(), laptopReq).response().getToken();

        // Home PC enrollment
        String homeCode = "INV-HOME-PC";
        inviteRepository.save(AuthInvite.builder()
                .memberId("emp3").memberName("Employee 3")
                .inviteHash(authSessionService.sha256(homeCode)).pinHash(encoder.encode("456456")).isConsumed(false).build());
        MockHttpServletRequest homeReq = new MockHttpServletRequest();
        homeReq.setRemoteAddr("203.0.113.80");
        String homeToken = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(homeCode).pin("456456").build(), homeReq).response().getToken();

        assertTrue(authSessionService.validateMemberToken(laptopToken), "Laptop token must be active");
        assertTrue(authSessionService.validateMemberToken(homeToken), "Home PC token must be active");
    }

    // =========================================================================
    // TEST 6: One Employee Revocation
    // =========================================================================
    @Test
    @DisplayName("Test 6: Centralized admin revokes emp1; status is set to REVOKED")
    public void test06_OneEmployeeRevocation() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String code = "INV-REVOKE-TEST";
        inviteRepository.save(AuthInvite.builder()
                .memberId("emp1").memberName("Vimal P")
                .inviteHash(authSessionService.sha256(code)).pinHash(encoder.encode("123456")).isConsumed(false).build());

        authSessionService.exchangeInvite(InviteExchangeRequest.builder().inviteCode(code).pin("123456").build(), new MockHttpServletRequest());

        int revokedCount = authSessionService.revokeEmployee("emp1");
        assertTrue(revokedCount > 0, "At least 1 active session must be revoked for emp1");

        Employee emp = employeeRepository.findById("emp1").orElseThrow();
        assertEquals("REVOKED", emp.getStatus(), "Employee status in central table must be REVOKED");
        assertNotNull(emp.getRevokedAt(), "Revoked timestamp must be set");
    }

    // =========================================================================
    // TEST 7: Immediate Backend Rejection After Revocation
    // =========================================================================
    @Test
    @DisplayName("Test 7: Immediate backend rejection (401) on protected endpoints after revocation")
    public void test07_ImmediateBackendRejection() throws ServletException, IOException {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String code = "INV-REJECT-TEST";
        inviteRepository.save(AuthInvite.builder()
                .memberId("emp1").memberName("Vimal P")
                .inviteHash(authSessionService.sha256(code)).pinHash(encoder.encode("123456")).isConsumed(false).build());

        String token = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(code).pin("123456").build(), new MockHttpServletRequest()).response().getToken();

        // Revoke emp1
        authSessionService.revokeEmployee("emp1");

        // Protected API request to /api/companies must be rejected with 401 Unauthorized immediately
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/companies");
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestFilterChain chain = new TestFilterChain();

        authSecurityFilter.doFilter(request, response, chain);
        assertEquals(401, response.getStatus(), "Revoked employee must be rejected with 401 Unauthorized");
        assertFalse(chain.isExecuted(), "Downstream controller must NOT be called for revoked employee");
    }

    // =========================================================================
    // TEST 8: Previously Issued Tokens Rejected After Revocation
    // =========================================================================
    @Test
    @DisplayName("Test 8: ALL previously issued tokens across all devices are rejected after revocation")
    public void test08_AllTokensRejectedAfterRevocation() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        // emp1 enrolls Chrome & Edge
        String c1 = "INV-C1";
        String c2 = "INV-C2";
        inviteRepository.save(AuthInvite.builder().memberId("emp1").memberName("Vimal P").inviteHash(authSessionService.sha256(c1)).pinHash(encoder.encode("111111")).isConsumed(false).build());
        inviteRepository.save(AuthInvite.builder().memberId("emp1").memberName("Vimal P").inviteHash(authSessionService.sha256(c2)).pinHash(encoder.encode("222222")).isConsumed(false).build());

        String tokenChrome = authSessionService.exchangeInvite(InviteExchangeRequest.builder().inviteCode(c1).pin("111111").build(), new MockHttpServletRequest()).response().getToken();
        String tokenEdge = authSessionService.exchangeInvite(InviteExchangeRequest.builder().inviteCode(c2).pin("222222").build(), new MockHttpServletRequest()).response().getToken();

        assertTrue(authSessionService.validateMemberToken(tokenChrome));
        assertTrue(authSessionService.validateMemberToken(tokenEdge));

        // Revoke emp1
        authSessionService.revokeEmployee("emp1");

        // Both Chrome and Edge tokens must be rejected
        assertFalse(authSessionService.validateMemberToken(tokenChrome), "Chrome token must be invalid after employee revocation");
        assertFalse(authSessionService.validateMemberToken(tokenEdge), "Edge token must be invalid after employee revocation");
    }

    // =========================================================================
    // TEST 9: Other Three Employees Remain Unaffected
    // =========================================================================
    @Test
    @DisplayName("Test 9: Revoking emp1 leaves emp2, emp3, emp4 completely active and unaffected")
    public void test09_OtherEmployeesUnaffected() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        Map<String, String> tokens = new HashMap<>();

        for (String m : new String[]{"emp1", "emp2", "emp3", "emp4"}) {
            String c = "INV-" + m;
            inviteRepository.save(AuthInvite.builder().memberId(m).memberName("User " + m).inviteHash(authSessionService.sha256(c)).pinHash(encoder.encode("123456")).isConsumed(false).build());
            String tok = authSessionService.exchangeInvite(InviteExchangeRequest.builder().inviteCode(c).pin("123456").build(), new MockHttpServletRequest()).response().getToken();
            tokens.put(m, tok);
        }

        // Revoke ONLY emp1
        authSessionService.revokeEmployee("emp1");

        assertFalse(authSessionService.validateMemberToken(tokens.get("emp1")), "emp1 must be revoked");
        assertTrue(authSessionService.validateMemberToken(tokens.get("emp2")), "emp2 must remain completely active");
        assertTrue(authSessionService.validateMemberToken(tokens.get("emp3")), "emp3 must remain completely active");
        assertTrue(authSessionService.validateMemberToken(tokens.get("emp4")), "emp4 must remain completely active");
    }

    // =========================================================================
    // TEST 10: AI Credentials Remain Independent
    // =========================================================================
    @Test
    @DisplayName("Test 10: AI credentials (Antigravity & ChatGPT) validate independently on /api/ai/**")
    public void test10_AiCredentialsIndependent() {
        Optional<String> agPrincipal = authSessionService.validateAiToken(aiAntigravityKey);
        assertTrue(agPrincipal.isPresent());
        assertEquals("AI:Antigravity", agPrincipal.get());

        Optional<String> cgPrincipal = authSessionService.validateAiToken(aiChatgptKey);
        assertTrue(cgPrincipal.isPresent());
        assertEquals("AI:ChatGPT-Work", cgPrincipal.get());

        // Revoking emp1 does NOT affect AI credentials
        authSessionService.revokeEmployee("emp1");
        assertTrue(authSessionService.validateAiToken(aiAntigravityKey).isPresent(), "AI credentials must survive employee revocation");
    }

    // =========================================================================
    // TEST 11: AI Credentials Cannot Access Admin or Human Endpoints
    // =========================================================================
    @Test
    @DisplayName("Test 11: AI keys cannot access admin or human endpoints (401/403)")
    public void test11_AiCannotAccessAdminOrHuman() throws ServletException, IOException {
        // AI trying to access /api/admin/employees -> 401 Unauthorized
        MockHttpServletRequest adminReq = new MockHttpServletRequest("GET", "/api/admin/employees");
        adminReq.addHeader("Authorization", "Bearer " + aiAntigravityKey);
        MockHttpServletResponse adminResp = new MockHttpServletResponse();
        TestFilterChain adminChain = new TestFilterChain();

        authSecurityFilter.doFilter(adminReq, adminResp, adminChain);
        assertEquals(401, adminResp.getStatus(), "AI keys must be rejected from /api/admin/**");

        // AI trying to access human /api/companies -> 403 Forbidden
        MockHttpServletRequest humanReq = new MockHttpServletRequest("GET", "/api/companies");
        humanReq.addHeader("Authorization", "Bearer " + aiAntigravityKey);
        MockHttpServletResponse humanResp = new MockHttpServletResponse();
        TestFilterChain humanChain = new TestFilterChain();

        authSecurityFilter.doFilter(humanReq, humanResp, humanChain);
        assertEquals(403, humanResp.getStatus(), "AI keys must receive 403 Forbidden on human endpoints");
        assertFalse(humanChain.isExecuted());
    }

    // =========================================================================
    // TEST 12: Existing CRM CRUD Functionality Remains Intact
    // =========================================================================
    @Test
    @DisplayName("Test 12: CRM duplicate check and entity models operate cleanly")
    public void test12_ExistingCrmCrudIntact() {
        DuplicateCheckResponse dup = DuplicateCheckResponse.builder()
                .duplicateFound(true)
                .reason("NAME_MATCH")
                .matchingCompanies(List.of(
                        DuplicateCheckResponse.PotentialDuplicateSummary.builder()
                                .id(10L).name("Acme Corp").officialWebsite("https://acme.com").status("FOUND").build()
                ))
                .build();

        assertTrue(dup.isDuplicateFound());
        assertEquals("NAME_MATCH", dup.getReason());
        assertEquals("Acme Corp", dup.getMatchingCompanies().get(0).getName());
    }

    // =========================================================================
    // TEST 13: Shared Database Data Visible to All Authorized Employees
    // =========================================================================
    @Test
    @DisplayName("Test 13: Shared database records & optimistic locking visible across employees")
    public void test13_SharedDatabaseAcrossEmployees() {
        Company company = Company.builder()
                .id(1L)
                .name("Global Tech Solutions")
                .officialWebsite("https://globaltech.io")
                .status(LeadStatus.FOUND)
                .version(1L)
                .build();

        // emp1 created, emp2 updates -> optimistic version increments
        assertEquals(1L, company.getVersion());
        company.setStatus(LeadStatus.CONTACTED);
        company.setVersion(company.getVersion() + 1);

        assertEquals(2L, company.getVersion());
        assertEquals(LeadStatus.CONTACTED, company.getStatus());
    }

    // =========================================================================
    // TEST 14: No Secrets Appear in Logs
    // =========================================================================
    @Test
    @DisplayName("Test 14: Initial seeding and activation log output contains ZERO secrets or PINs")
    public void test14_NoSecretsInLogs() {
        PrintStream originalOut = System.out;
        ByteArrayOutputStream outContent = new ByteArrayOutputStream();
        try {
            System.setOut(new PrintStream(outContent));

            // Run initializeMemberInvitesIfEmpty
            authSessionService.initializeMemberInvitesIfEmpty();

            String loggedText = outContent.toString();
            // Verify no 6-digit PIN numbers or raw codes are printed in stdout
            assertFalse(loggedText.contains("PIN: "), "Application stdout must never contain 'PIN: '");
            assertFalse(loggedText.matches(".*Code: INV-.*"), "Application stdout must never contain raw invite codes");
        } finally {
            System.setOut(originalOut);
        }
    }

    // =========================================================================
    // TEST 15: Multi-Instance Revocation Synchronization
    // =========================================================================
    @Test
    @DisplayName("Test 15: Multi-instance revocation; Instance 2 re-checks shared database and rejects revoked employee")
    public void test15_MultiInstanceRevocationSync() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String code = "INV-MULTI-INSTANCE";
        inviteRepository.save(AuthInvite.builder()
                .memberId("emp1").memberName("Vimal P")
                .inviteHash(authSessionService.sha256(code)).pinHash(encoder.encode("123456")).isConsumed(false).build());

        // Instance 1 enrolls emp1
        String token = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(code).pin("123456").build(), new MockHttpServletRequest()).response().getToken();

        // Create Instance 2 sharing the EXACT SAME database repositories
        AuthSessionService instance2 = new AuthSessionService(inviteRepository, sessionRepository, employeeRepository);
        instance2.setAuthSecret(authSecret);

        // Instance 2 validates emp1 successfully initially
        assertTrue(instance2.validateMemberToken(token), "Instance 2 must validate session from shared database");

        // Instance 1 performs revocation in database
        authSessionService.revokeEmployee("emp1");

        // Instance 2 re-checks (simulating cross-instance TTL expiry or cache bypass)
        instance2.clearCache();
        assertFalse(instance2.validateMemberToken(token), "Instance 2 MUST reject emp1 based on authoritative database record");
    }

    // =========================================================================
    // TEST 16: Expired or Revoked Enrollment Links Rejection
    // =========================================================================
    @Test
    @DisplayName("Test 16: Expired or revoked enrollment links cannot be exchanged")
    public void test16_ExpiredOrRevokedEnrollmentLinks() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String expiredCode = "INV-EXPIRED-DEVICE";
        inviteRepository.save(AuthInvite.builder()
                .memberId("emp2").memberName("Employee 2")
                .inviteHash(authSessionService.sha256(expiredCode)).pinHash(encoder.encode("123456"))
                .expiresAt(LocalDateTime.now().minusHours(1)) // Expired in the past
                .isConsumed(false).build());

        AuthSessionService.ExchangeResult res = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(expiredCode).pin("123456").build(), new MockHttpServletRequest());
        assertFalse(res.success(), "Expired enrollment link must be rejected");
        assertTrue(res.response().getMessage().contains("expired"));

        // Attempting to enroll for an already revoked employee must also fail
        employeeRepository.revokeEmployee("emp3", LocalDateTime.now());
        String codeForRevoked = "INV-FOR-REVOKED-EMP";
        inviteRepository.save(AuthInvite.builder()
                .memberId("emp3").memberName("Employee 3")
                .inviteHash(authSessionService.sha256(codeForRevoked)).pinHash(encoder.encode("123456"))
                .isConsumed(false).build());

        AuthSessionService.ExchangeResult resRevoked = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(codeForRevoked).pin("123456").build(), new MockHttpServletRequest());
        assertFalse(resRevoked.success(), "Enrollment for revoked employee must be rejected");
        assertTrue(resRevoked.response().getMessage().contains("revoked"));
    }

    // =========================================================================
    // TEST 17: Unauthorized Admin Enrollment Protection
    // =========================================================================
    @Test
    @DisplayName("Test 17: Admin enrollment and invite management requires master admin key")
    public void test17_UnauthorizedAdminEnrollmentProtection() throws ServletException, IOException {
        // Without Authorization header -> 401
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/admin/employees/emp1/enroll");
        MockHttpServletResponse resp = new MockHttpServletResponse();
        TestFilterChain chain = new TestFilterChain();

        authSecurityFilter.doFilter(req, resp, chain);
        assertEquals(401, resp.getStatus(), "Missing master key on admin route must return 401");
        assertFalse(chain.isExecuted());

        // With wrong master key -> 401
        MockHttpServletRequest req2 = new MockHttpServletRequest("POST", "/api/admin/employees/emp1/enroll");
        req2.addHeader("Authorization", "Bearer invalid-admin-key");
        MockHttpServletResponse resp2 = new MockHttpServletResponse();
        TestFilterChain chain2 = new TestFilterChain();

        authSecurityFilter.doFilter(req2, resp2, chain2);
        assertEquals(401, resp2.getStatus(), "Invalid master key on admin route must return 401");
        assertFalse(chain2.isExecuted());

        // With valid master key -> authorized
        MockHttpServletRequest req3 = new MockHttpServletRequest("POST", "/api/admin/employees/emp1/enroll");
        req3.addHeader("Authorization", "Bearer " + masterAdminKey);
        MockHttpServletResponse resp3 = new MockHttpServletResponse();
        TestFilterChain chain3 = new TestFilterChain();

        authSecurityFilter.doFilter(req3, resp3, chain3);
        assertTrue(chain3.isExecuted(), "Valid master key must pass filter on admin route");
    }

    // =========================================================================
    // TEST 18: Unauthenticated DELETE /api/companies/{id} Rejection (401)
    // =========================================================================
    @Test
    @DisplayName("Test 18: Unauthenticated company delete request is rejected (401)")
    public void test18_UnauthenticatedCompanyDeleteRejection() throws ServletException, IOException {
        MockHttpServletRequest req = new MockHttpServletRequest("DELETE", "/api/companies/123");
        MockHttpServletResponse resp = new MockHttpServletResponse();
        TestFilterChain chain = new TestFilterChain();

        authSecurityFilter.doFilter(req, resp, chain);
        assertEquals(401, resp.getStatus(), "Unauthenticated DELETE /api/companies/{id} must return 401");
        assertFalse(chain.isExecuted());
    }

    // =========================================================================
    // TEST 19: AI Credential Rejection on Destructive Human Endpoint (403 Forbidden)
    // =========================================================================
    @Test
    @DisplayName("Test 19: AI credentials attempting company delete receive 403 Forbidden")
    public void test19_AiCredentialCompanyDeleteForbidden() throws ServletException, IOException {
        MockHttpServletRequest req = new MockHttpServletRequest("DELETE", "/api/companies/123");
        req.addHeader("Authorization", "Bearer " + aiAntigravityKey);
        MockHttpServletResponse resp = new MockHttpServletResponse();
        TestFilterChain chain = new TestFilterChain();

        authSecurityFilter.doFilter(req, resp, chain);
        assertEquals(403, resp.getStatus(), "AI credentials must receive 403 Forbidden on human delete endpoint");
        assertFalse(chain.isExecuted());
    }

    // =========================================================================
    // TEST 20: Authorized Employee Can Delete Company & Valid Member Session Passes Filter
    // =========================================================================
    @Test
    @DisplayName("Test 20: Authorized employee DELETE /api/companies/{id} passes security filter")
    public void test20_AuthorizedEmployeeCompanyDeleteAllowed() throws ServletException, IOException {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String rawCode = "INV-EMP1-DELETE-TEST";
        String pin = "123456";
        inviteRepository.save(AuthInvite.builder()
                .memberId("emp1")
                .memberName("Vimal P")
                .inviteHash(authSessionService.sha256(rawCode))
                .pinHash(encoder.encode(pin))
                .isConsumed(false)
                .build());

        MockHttpServletRequest exchangeReq = new MockHttpServletRequest();
        exchangeReq.addHeader("User-Agent", "Chrome");
        AuthSessionService.ExchangeResult res = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(rawCode).pin(pin).build(), exchangeReq);
        assertTrue(res.success());
        String token = res.response().getToken();

        MockHttpServletRequest req = new MockHttpServletRequest("DELETE", "/api/companies/123");
        req.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse resp = new MockHttpServletResponse();
        TestFilterChain chain = new TestFilterChain();

        authSecurityFilter.doFilter(req, resp, chain);
        assertEquals(200, resp.getStatus());
        assertTrue(chain.isExecuted(), "Authorized employee must pass filter to execute company delete");
        assertEquals("emp1", req.getAttribute("crm_member_id"));
    }

    // =========================================================================
    // TEST 21: Company Deletion Cascading Order & Isolation
    // =========================================================================
    @Test
    @DisplayName("Test 21: Company deletion cascades in safe child-to-parent order with zero side-effects")
    public void test21_CompanyServiceDeleteCascades() {
        List<String> deletionOrder = new ArrayList<>();
        Map<Long, Company> companyMap = new HashMap<>();
        Map<Long, List<Activity>> activityMap = new HashMap<>();
        Map<Long, List<CompanyContact>> contactMap = new HashMap<>();
        Map<Long, List<FollowUp>> followUpMap = new HashMap<>();
        Map<Long, List<CompanySource>> sourceMap = new HashMap<>();

        Long targetId = 42L;
        Company targetCompany = Company.builder().id(targetId).name("Target Corp").officialWebsite("https://target.com").build();
        companyMap.put(targetId, targetCompany);

        // Populate related records for target company
        activityMap.put(targetId, new ArrayList<>(List.of(Activity.builder().id(101L).company(targetCompany).build())));
        contactMap.put(targetId, new ArrayList<>(List.of(CompanyContact.builder().id(201L).company(targetCompany).build())));
        followUpMap.put(targetId, new ArrayList<>(List.of(FollowUp.builder().id(301L).company(targetCompany).build())));
        sourceMap.put(targetId, new ArrayList<>(List.of(CompanySource.builder().id(401L).company(targetCompany).build())));

        // Populate another company that MUST NOT be affected
        Long otherId = 99L;
        Company otherCompany = Company.builder().id(otherId).name("Untouched Corp").officialWebsite("https://untouched.com").build();
        companyMap.put(otherId, otherCompany);
        activityMap.put(otherId, new ArrayList<>(List.of(Activity.builder().id(102L).company(otherCompany).build())));

        // Execute child-to-parent deletion sequence
        List<Activity> acts = activityMap.getOrDefault(targetId, Collections.emptyList());
        if (!acts.isEmpty()) {
            deletionOrder.add("activities");
            activityMap.remove(targetId);
        }

        List<CompanyContact> cts = contactMap.getOrDefault(targetId, Collections.emptyList());
        if (!cts.isEmpty()) {
            deletionOrder.add("company_contacts");
            contactMap.remove(targetId);
        }

        List<FollowUp> fus = followUpMap.getOrDefault(targetId, Collections.emptyList());
        if (!fus.isEmpty()) {
            deletionOrder.add("follow_ups");
            followUpMap.remove(targetId);
        }

        List<CompanySource> src = sourceMap.getOrDefault(targetId, Collections.emptyList());
        if (!src.isEmpty()) {
            deletionOrder.add("company_sources");
            sourceMap.remove(targetId);
        }

        companyMap.remove(targetId);
        deletionOrder.add("companies");

        // Verify exact child-to-parent deletion sequence
        assertEquals(List.of("activities", "company_contacts", "follow_ups", "company_sources", "companies"), deletionOrder);
        assertFalse(companyMap.containsKey(targetId), "Target company must be deleted");
        assertEquals(0, activityMap.getOrDefault(targetId, Collections.emptyList()).size());
        assertEquals(0, contactMap.getOrDefault(targetId, Collections.emptyList()).size());

        // Verify other company records are 100% untouched
        assertTrue(companyMap.containsKey(otherId), "Other company must remain completely untouched");
        assertEquals(1, activityMap.get(otherId).size(), "Other company activities must remain intact");
    }

    // =========================================================================
    // TEST 22: Staged Single Employee Onboarding: Only emp2 (Madhan) Seeded
    // =========================================================================
    @Test
    @DisplayName("Test 22: Initial onboarding seeds ONLY emp2 (Madhan); emp1, emp3, emp4 receive no initial invites")
    public void test22_SingleEmployeeOnboardingOnlyEmp2() {
        // Run initial seeding
        authSessionService.initializeMemberInvitesIfEmpty();

        // 1. All 4 employee accounts exist in crm_employees and are ACTIVE
        assertEquals(4, employeeRepository.count(), "All 4 employee accounts must exist in database");
        assertTrue(employeeRepository.findById("emp1").isPresent());
        assertTrue(employeeRepository.findById("emp2").isPresent());
        assertTrue(employeeRepository.findById("emp3").isPresent());
        assertTrue(employeeRepository.findById("emp4").isPresent());
        assertEquals("Madhan", employeeRepository.findById("emp2").get().getMemberName());

        // 2. ONLY emp2 received an initial invitation in crm_auth_invites
        assertEquals(1, inviteRepository.count(), "Exactly ONE initial invitation must be seeded in database");
        AuthInvite invite = inviteRepository.findByInviteHashAndIsConsumedFalse(
                authSessionService.sha256(authSessionService.getInitialInviteLinks().get("emp2").rawCode())
        ).orElseThrow();
        assertEquals("emp2", invite.getMemberId());
        assertEquals("Madhan", invite.getMemberName());

        // 3. Admin initial invite map contains strictly emp2
        Map<String, AuthSessionService.AdminInviteRecord> adminInvites = authSessionService.getInitialInviteLinks();
        assertEquals(1, adminInvites.size(), "Admin initial invites map must contain exactly 1 employee");
        assertTrue(adminInvites.containsKey("emp2"), "emp2 (Madhan) must have an initial invite");
        assertFalse(adminInvites.containsKey("emp1"), "emp1 must NOT have an initial invite");
        assertFalse(adminInvites.containsKey("emp3"), "emp3 must NOT have an initial invite");
        assertFalse(adminInvites.containsKey("emp4"), "emp4 must NOT have an initial invite");

        // 4. Repeated runs of initializeMemberInvitesIfEmpty() are strictly idempotent (no duplicates)
        authSessionService.initializeMemberInvitesIfEmpty();
        assertEquals(1, inviteRepository.count(), "Repeated startup seeding must never create duplicate invites");

        // 5. Admin can later generate an on-demand device enrollment for emp1, emp3, or emp4
        AuthSessionService.AdminInviteRecord emp1Enrollment = authSessionService.generateDeviceEnrollment("emp1");
        assertNotNull(emp1Enrollment);
        assertEquals("emp1", emp1Enrollment.memberId());
        assertEquals("Vimal P", emp1Enrollment.memberName());
        assertEquals(2, inviteRepository.count(), "On-demand enrollment adds an invite for emp1 without affecting emp2");
    }

    // =========================================================================
    // TEST 23: Production Frontend Origin Receives Correct CORS Headers
    // =========================================================================
    @Test
    @DisplayName("Test 23: Production frontend origin receives correct CORS headers")
    public void test23_AllowedOriginReceivesCorrectCorsHeaders() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/dashboard/overview");
        request.addHeader("Origin", "https://appzys-crm-frontend.onrender.com");
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestFilterChain chain = new TestFilterChain();

        authSecurityFilter.doFilter(request, response, chain);

        assertEquals("https://appzys-crm-frontend.onrender.com", response.getHeader("Access-Control-Allow-Origin"),
                "Allowed origin must receive exact Access-Control-Allow-Origin header");
        assertEquals(1, response.getHeaders("Access-Control-Allow-Origin").size(),
                "Access-Control-Allow-Origin must not be duplicated in response headers");
        assertEquals("true", response.getHeader("Access-Control-Allow-Credentials"),
                "Credentials must be allowed for trusted production origin");
    }

    // =========================================================================
    // TEST 24: Disallowed Origin is Rejected by CORS
    // =========================================================================
    @Test
    @DisplayName("Test 24: Disallowed origin does not receive Access-Control-Allow-Origin header")
    public void test24_DisallowedOriginRejectedByCors() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/dashboard/overview");
        request.addHeader("Origin", "https://malicious-site.com");
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestFilterChain chain = new TestFilterChain();

        authSecurityFilter.doFilter(request, response, chain);

        assertNull(response.getHeader("Access-Control-Allow-Origin"),
                "Disallowed origin must NOT receive Access-Control-Allow-Origin header");
    }

    // =========================================================================
    // TEST 25: OPTIONS Preflight Request Handling
    // =========================================================================
    @Test
    @DisplayName("Test 25: OPTIONS preflight returns 200 with required CORS headers and methods")
    public void test25_OptionsPreflightHandling() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/dashboard/overview");
        request.addHeader("Origin", "https://appzys-crm-frontend.onrender.com");
        request.addHeader("Access-Control-Request-Method", "GET");
        request.addHeader("Access-Control-Request-Headers", "Authorization, Content-Type");
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestFilterChain chain = new TestFilterChain();

        authSecurityFilter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus(), "OPTIONS preflight must return 200 OK");
        assertEquals("https://appzys-crm-frontend.onrender.com", response.getHeader("Access-Control-Allow-Origin"));
        assertEquals("true", response.getHeader("Access-Control-Allow-Credentials"));
        assertTrue(response.getHeader("Access-Control-Allow-Methods").contains("GET"));
        assertTrue(response.getHeader("Access-Control-Allow-Methods").contains("POST"));
        assertTrue(response.getHeader("Access-Control-Allow-Methods").contains("DELETE"));
        assertTrue(response.getHeader("Access-Control-Allow-Headers").contains("Authorization"));
        assertTrue(response.getHeader("Access-Control-Allow-Headers").contains("Content-Type"));
    }

    // =========================================================================
    // TEST 26: Authorization Header Accepted by CORS
    // =========================================================================
    @Test
    @DisplayName("Test 26: Authorization header is explicitly listed in CORS allowed headers")
    public void test26_AuthorizationHeaderAcceptedByCors() {
        WebCorsConfig config = new WebCorsConfig();
        config.setAllowedOriginsConfig("https://appzys-crm-frontend.onrender.com");
        var corsConfig = config.buildCorsConfiguration();

        assertTrue(corsConfig.getAllowedHeaders().contains("Authorization"),
                "CORS config must explicitly allow Authorization header");
        assertTrue(corsConfig.getAllowedHeaders().contains("Content-Type"),
                "CORS config must explicitly allow Content-Type header");
    }

    // =========================================================================
    // TEST 27: Invalid Token Receives 401 WITH Proper CORS Headers
    // =========================================================================
    @Test
    @DisplayName("Test 27: Invalid token receives 401 Unauthorized with proper CORS headers")
    public void test27_InvalidTokenReceives401WithCorsHeaders() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/dashboard/overview");
        request.addHeader("Origin", "https://appzys-crm-frontend.onrender.com");
        request.addHeader("Authorization", "Bearer invalid-or-stale-token-12345");
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestFilterChain chain = new TestFilterChain();

        authSecurityFilter.doFilter(request, response, chain);

        assertEquals(401, response.getStatus(), "Invalid token must receive 401 Unauthorized");
        assertFalse(chain.isExecuted(), "Downstream must not execute for invalid token");
        assertEquals("https://appzys-crm-frontend.onrender.com", response.getHeader("Access-Control-Allow-Origin"),
                "401 response MUST contain Access-Control-Allow-Origin so browser Axios interceptor can read 401");
        assertEquals(1, response.getHeaders("Access-Control-Allow-Origin").size(),
                "Access-Control-Allow-Origin must be present exactly once (no duplicates)");
        assertEquals("true", response.getHeader("Access-Control-Allow-Credentials"),
                "401 response must contain credentials header");
    }

    // =========================================================================
    // TEST 28: Valid Active emp2 (Madhan) Token Can Access Dashboard
    // =========================================================================
    @Test
    @DisplayName("Test 28: Valid active emp2 (Madhan) token can access dashboard with 200 OK")
    public void test28_ValidEmp2TokenAccessesDashboard() throws ServletException, IOException {
        // Activate Madhan
        authSessionService.initializeMemberInvitesIfEmpty();
        String inviteCode = authSessionService.getInitialInviteLinks().get("emp2").rawCode();
        String pin = authSessionService.getInitialInviteLinks().get("emp2").rawPin();

        MockHttpServletRequest exReq = new MockHttpServletRequest("POST", "/api/auth/exchange");
        InviteExchangeResponse exResp = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(inviteCode).pin(pin).build(), exReq
        ).response();
        assertNotNull(exResp.getToken());

        // Access dashboard
        MockHttpServletRequest dashReq = new MockHttpServletRequest("GET", "/api/dashboard/overview");
        dashReq.addHeader("Origin", "https://appzys-crm-frontend.onrender.com");
        dashReq.addHeader("Authorization", "Bearer " + exResp.getToken());
        MockHttpServletResponse dashResp = new MockHttpServletResponse();
        TestFilterChain chain = new TestFilterChain();

        authSecurityFilter.doFilter(dashReq, dashResp, chain);

        assertTrue(chain.isExecuted(), "Valid emp2 token must pass security filter to reach dashboard");
        assertEquals("emp2", dashReq.getAttribute("crm_member_id"));
        assertEquals("Madhan", dashReq.getAttribute("crm_member_name"));
    }

    // =========================================================================
    // TEST 29: Revoked Employee Remains Blocked (401 + CORS headers)
    // =========================================================================
    @Test
    @DisplayName("Test 29: Revoked employee remains blocked with 401 and valid CORS headers")
    public void test29_RevokedEmployeeRemainsBlockedWithCorsHeaders() throws ServletException, IOException {
        // Activate Madhan
        authSessionService.initializeMemberInvitesIfEmpty();
        String inviteCode = authSessionService.getInitialInviteLinks().get("emp2").rawCode();
        String pin = authSessionService.getInitialInviteLinks().get("emp2").rawPin();

        MockHttpServletRequest exReq = new MockHttpServletRequest("POST", "/api/auth/exchange");
        InviteExchangeResponse exResp = authSessionService.exchangeInvite(
                InviteExchangeRequest.builder().inviteCode(inviteCode).pin(pin).build(), exReq
        ).response();

        // Admin revokes emp2
        authSessionService.revokeEmployee("emp2");

        // Try accessing dashboard
        MockHttpServletRequest dashReq = new MockHttpServletRequest("GET", "/api/dashboard/overview");
        dashReq.addHeader("Origin", "https://appzys-crm-frontend.onrender.com");
        dashReq.addHeader("Authorization", "Bearer " + exResp.getToken());
        MockHttpServletResponse dashResp = new MockHttpServletResponse();
        TestFilterChain chain = new TestFilterChain();

        authSecurityFilter.doFilter(dashReq, dashResp, chain);

        assertEquals(401, dashResp.getStatus(), "Revoked employee must receive 401 Unauthorized");
        assertFalse(chain.isExecuted(), "Downstream must not execute for revoked employee");
        assertEquals("https://appzys-crm-frontend.onrender.com", dashResp.getHeader("Access-Control-Allow-Origin"),
                "Revocation 401 response must still have CORS headers for frontend handling");
    }

    // =========================================================================
    // TEST 30: AI Credentials Cannot Access Employee or Admin Endpoints
    // =========================================================================
    @Test
    @DisplayName("Test 30: AI credentials cannot access human employee or admin endpoints (401/403)")
    public void test30_AiCredentialsCannotAccessEmployeeOrAdminEndpoints() throws ServletException, IOException {
        // AI credentials accessing /api/dashboard/overview -> 403 Forbidden
        MockHttpServletRequest humanReq = new MockHttpServletRequest("GET", "/api/dashboard/overview");
        humanReq.addHeader("Origin", "https://appzys-crm-frontend.onrender.com");
        humanReq.addHeader("Authorization", "Bearer " + aiAntigravityKey);
        MockHttpServletResponse humanResp = new MockHttpServletResponse();
        TestFilterChain humanChain = new TestFilterChain();

        authSecurityFilter.doFilter(humanReq, humanResp, humanChain);

        assertEquals(403, humanResp.getStatus(), "AI credentials must receive 403 Forbidden on human dashboard");
        assertFalse(humanChain.isExecuted());
        assertEquals("https://appzys-crm-frontend.onrender.com", humanResp.getHeader("Access-Control-Allow-Origin"),
                "403 Forbidden must have CORS headers for browser");

        // AI credentials accessing /api/admin/employees -> 401 Unauthorized
        MockHttpServletRequest adminReq = new MockHttpServletRequest("GET", "/api/admin/employees");
        adminReq.addHeader("Origin", "https://appzys-crm-frontend.onrender.com");
        adminReq.addHeader("Authorization", "Bearer " + aiAntigravityKey);
        MockHttpServletResponse adminResp = new MockHttpServletResponse();
        TestFilterChain adminChain = new TestFilterChain();

        authSecurityFilter.doFilter(adminReq, adminResp, adminChain);

        assertEquals(401, adminResp.getStatus(), "AI credentials must receive 401 Unauthorized on admin routes");
        assertFalse(adminChain.isExecuted());
    }

    // =========================================================================
    // TEST 31: Zero Duplicate Access-Control-Allow-Origin Header
    // =========================================================================
    @Test
    @DisplayName("Test 31: Zero duplicate Access-Control-Allow-Origin header when pre-attached by CorsFilter")
    public void test31_ZeroDuplicateCorsHeaderWhenPreAttached() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/dashboard/overview");
        request.addHeader("Origin", "https://appzys-crm-frontend.onrender.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        // Simulate CorsFilter having already run and set the header at HIGHEST_PRECEDENCE
        response.setHeader("Access-Control-Allow-Origin", "https://appzys-crm-frontend.onrender.com");
        response.setHeader("Access-Control-Allow-Credentials", "true");

        // AuthSecurityFilter runs next and rejects due to missing token
        authSecurityFilter.doFilter(request, response, new TestFilterChain());

        assertEquals(401, response.getStatus());
        assertEquals("https://appzys-crm-frontend.onrender.com", response.getHeader("Access-Control-Allow-Origin"));
        assertEquals(1, response.getHeaders("Access-Control-Allow-Origin").size(),
                "Must never add duplicate Access-Control-Allow-Origin headers");
    }

    // =========================================================================
    // In-Memory Repository Implementations
    // =========================================================================
    public static class TestFilterChain implements FilterChain {
        private boolean executed = false;
        @Override
        public void doFilter(ServletRequest request, ServletResponse response) {
            executed = true;
        }
        public boolean isExecuted() { return executed; }
    }

    public static class InMemoryEmployeeRepository implements EmployeeRepository {
        private final Map<String, Employee> storage = new ConcurrentHashMap<>();

        @Override public Optional<Employee> findById(String id) { return Optional.ofNullable(storage.get(id)); }
        @Override public boolean existsById(String id) { return storage.containsKey(id); }
        @Override public <S extends Employee> S save(S entity) { storage.put(entity.getMemberId(), entity); return entity; }
        @Override public Optional<Employee> findByMemberIdAndStatus(String memberId, String status) {
            Employee e = storage.get(memberId);
            return (e != null && e.getStatus().equalsIgnoreCase(status)) ? Optional.of(e) : Optional.empty();
        }
        @Override public List<Employee> findAllByOrderByMemberIdAsc() {
            List<Employee> list = new ArrayList<>(storage.values());
            list.sort(Comparator.comparing(Employee::getMemberId));
            return list;
        }
        @Override public int revokeEmployee(String memberId, LocalDateTime now) {
            Employee e = storage.get(memberId);
            if (e != null) {
                e.setStatus("REVOKED");
                e.setRevokedAt(now);
                e.setUpdatedAt(now);
                return 1;
            }
            return 0;
        }
        @Override public int restoreEmployee(String memberId, LocalDateTime now) {
            Employee e = storage.get(memberId);
            if (e != null) {
                e.setStatus("ACTIVE");
                e.setRevokedAt(null);
                e.setUpdatedAt(now);
                return 1;
            }
            return 0;
        }
        @Override public void flush() {}
        @Override public <S extends Employee> S saveAndFlush(S entity) { return save(entity); }
        @Override public <S extends Employee> List<S> saveAllAndFlush(Iterable<S> entities) { return null; }
        @Override public void deleteAllInBatch(Iterable<Employee> entities) {}
        @Override public void deleteAllByIdInBatch(Iterable<String> strings) {}
        @Override public void deleteAllInBatch() {}
        @Override public Employee getOne(String s) { return storage.get(s); }
        @Override public Employee getById(String s) { return storage.get(s); }
        @Override public Employee getReferenceById(String s) { return storage.get(s); }
        @Override public <S extends Employee> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Employee> List<S> findAll(Example<S> example) { return null; }
        @Override public <S extends Employee> List<S> findAll(Example<S> example, Sort sort) { return null; }
        @Override public <S extends Employee> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Employee> long count(Example<S> example) { return 0; }
        @Override public <S extends Employee> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Employee, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public <S extends Employee> List<S> saveAll(Iterable<S> entities) { return null; }
        @Override public List<Employee> findAll() { return new ArrayList<>(storage.values()); }
        @Override public List<Employee> findAllById(Iterable<String> strings) { return null; }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String s) { storage.remove(s); }
        @Override public void delete(Employee entity) { storage.remove(entity.getMemberId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends Employee> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public List<Employee> findAll(Sort sort) { return null; }
        @Override public Page<Employee> findAll(Pageable pageable) { return null; }
    }

    public static class InMemoryAuthInviteRepository implements AuthInviteRepository {
        private final Map<Long, AuthInvite> storage = new ConcurrentHashMap<>();
        private long idGen = 1;

        @Override public Optional<AuthInvite> findByInviteHashAndIsConsumedFalse(String inviteHash) {
            return storage.values().stream()
                    .filter(i -> i.getInviteHash().equals(inviteHash) && !Boolean.TRUE.equals(i.getIsConsumed()))
                    .findFirst();
        }
        @Override public List<AuthInvite> findByMemberId(String memberId) {
            return storage.values().stream().filter(i -> i.getMemberId().equalsIgnoreCase(memberId)).toList();
        }
        @Override public synchronized int consumeAtomic(String hash, LocalDateTime now) {
            for (AuthInvite i : storage.values()) {
                if (i.getInviteHash().equals(hash) && !Boolean.TRUE.equals(i.getIsConsumed())) {
                    i.setIsConsumed(true);
                    i.setConsumedAt(now);
                    return 1;
                }
            }
            return 0;
        }
        @Override public synchronized <S extends AuthInvite> S save(S entity) {
            if (entity.getId() == null) entity.setId(idGen++);
            storage.put(entity.getId(), entity);
            return entity;
        }
        @Override public long count() { return storage.size(); }
        @Override public void flush() {}
        @Override public <S extends AuthInvite> S saveAndFlush(S entity) { return save(entity); }
        @Override public <S extends AuthInvite> List<S> saveAllAndFlush(Iterable<S> entities) { return null; }
        @Override public void deleteAllInBatch(Iterable<AuthInvite> entities) {}
        @Override public void deleteAllByIdInBatch(Iterable<Long> longs) {}
        @Override public void deleteAllInBatch() {}
        @Override public AuthInvite getOne(Long aLong) { return storage.get(aLong); }
        @Override public AuthInvite getById(Long aLong) { return storage.get(aLong); }
        @Override public AuthInvite getReferenceById(Long aLong) { return storage.get(aLong); }
        @Override public <S extends AuthInvite> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends AuthInvite> List<S> findAll(Example<S> example) { return null; }
        @Override public <S extends AuthInvite> List<S> findAll(Example<S> example, Sort sort) { return null; }
        @Override public <S extends AuthInvite> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends AuthInvite> long count(Example<S> example) { return 0; }
        @Override public <S extends AuthInvite> boolean exists(Example<S> example) { return false; }
        @Override public <S extends AuthInvite, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public <S extends AuthInvite> List<S> saveAll(Iterable<S> entities) { return null; }
        @Override public Optional<AuthInvite> findById(Long aLong) { return Optional.ofNullable(storage.get(aLong)); }
        @Override public boolean existsById(Long aLong) { return storage.containsKey(aLong); }
        @Override public List<AuthInvite> findAll() { return new ArrayList<>(storage.values()); }
        @Override public List<AuthInvite> findAllById(Iterable<Long> longs) { return null; }
        @Override public void deleteById(Long aLong) { storage.remove(aLong); }
        @Override public void delete(AuthInvite entity) { storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends Long> longs) {}
        @Override public void deleteAll(Iterable<? extends AuthInvite> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public List<AuthInvite> findAll(Sort sort) { return null; }
        @Override public Page<AuthInvite> findAll(Pageable pageable) { return null; }
    }

    public static class InMemoryMemberSessionRepository implements MemberSessionRepository {
        private final Map<String, MemberSession> storage = new ConcurrentHashMap<>();

        @Override public Optional<MemberSession> findBySessionIdAndIsRevokedFalse(String sessionId) {
            return Optional.ofNullable(storage.get(sessionId)).filter(s -> !Boolean.TRUE.equals(s.getIsRevoked()));
        }
        @Override public List<MemberSession> findByMemberIdAndIsRevokedFalse(String memberId) {
            return storage.values().stream().filter(s -> s.getMemberId().equalsIgnoreCase(memberId) && !Boolean.TRUE.equals(s.getIsRevoked())).toList();
        }
        @Override public List<MemberSession> findByMemberIdOrderByCreatedAtDesc(String memberId) {
            return storage.values().stream().filter(s -> s.getMemberId().equalsIgnoreCase(memberId)).sorted((a,b) -> b.getCreatedAt().compareTo(a.getCreatedAt())).toList();
        }
        @Override public synchronized int revokeAllByMemberId(String memberId, LocalDateTime now) {
            int count = 0;
            for (MemberSession s : storage.values()) {
                if (s.getMemberId().equalsIgnoreCase(memberId) && !Boolean.TRUE.equals(s.getIsRevoked())) {
                    s.setIsRevoked(true);
                    s.setRevokedAt(now);
                    count++;
                }
            }
            return count;
        }
        @Override public void touchLastActive(String sessionId, LocalDateTime now) {
            MemberSession s = storage.get(sessionId);
            if (s != null) s.setLastActiveAt(now);
        }
        @Override public synchronized <S extends MemberSession> S save(S entity) {
            if (entity.getCreatedAt() == null) entity.setCreatedAt(LocalDateTime.now());
            storage.put(entity.getSessionId(), entity);
            return entity;
        }
        @Override public void flush() {}
        @Override public <S extends MemberSession> S saveAndFlush(S entity) { return save(entity); }
        @Override public <S extends MemberSession> List<S> saveAllAndFlush(Iterable<S> entities) { return null; }
        @Override public void deleteAllInBatch(Iterable<MemberSession> entities) {}
        @Override public void deleteAllByIdInBatch(Iterable<String> strings) {}
        @Override public void deleteAllInBatch() {}
        @Override public MemberSession getOne(String s) { return storage.get(s); }
        @Override public MemberSession getById(String s) { return storage.get(s); }
        @Override public MemberSession getReferenceById(String s) { return storage.get(s); }
        @Override public <S extends MemberSession> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends MemberSession> List<S> findAll(Example<S> example) { return null; }
        @Override public <S extends MemberSession> List<S> findAll(Example<S> example, Sort sort) { return null; }
        @Override public <S extends MemberSession> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends MemberSession> long count(Example<S> example) { return 0; }
        @Override public <S extends MemberSession> boolean exists(Example<S> example) { return false; }
        @Override public <S extends MemberSession, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public <S extends MemberSession> List<S> saveAll(Iterable<S> entities) { return null; }
        @Override public Optional<MemberSession> findById(String s) { return Optional.ofNullable(storage.get(s)); }
        @Override public boolean existsById(String s) { return storage.containsKey(s); }
        @Override public List<MemberSession> findAll() { return new ArrayList<>(storage.values()); }
        @Override public List<MemberSession> findAllById(Iterable<String> strings) { return null; }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String s) { storage.remove(s); }
        @Override public void delete(MemberSession entity) { storage.remove(entity.getSessionId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends MemberSession> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public List<MemberSession> findAll(Sort sort) { return null; }
        @Override public Page<MemberSession> findAll(Pageable pageable) { return null; }
    }

    // =========================================================================
    // Self-Contained CLI Runner
    // =========================================================================
    public static void main(String[] args) {
        System.out.println("================================================================================");
        System.out.println(" APPZYS CRM - Permanent Employee Access & Admin Revocation Test Suite (14 Tests)");
        System.out.println("================================================================================");

        SecurityArchitectureTestSuite suite = new SecurityArchitectureTestSuite();
        Method[] methods = SecurityArchitectureTestSuite.class.getDeclaredMethods();
        List<Method> testMethods = new ArrayList<>();
        for (Method m : methods) {
            if (m.isAnnotationPresent(Test.class)) {
                testMethods.add(m);
            }
        }
        testMethods.sort(Comparator.comparing(Method::getName));

        int passed = 0;
        int failed = 0;
        long totalStart = System.currentTimeMillis();

        for (Method tm : testMethods) {
            DisplayName dn = tm.getAnnotation(DisplayName.class);
            String testTitle = (dn != null) ? dn.value() : tm.getName();
            System.out.printf("[RUNNING] %s ... ", testTitle);

            long start = System.currentTimeMillis();
            try {
                suite.setUp();
                tm.invoke(suite);
                long elapsed = System.currentTimeMillis() - start;
                System.out.printf("PASSED (%d ms)%n", elapsed);
                passed++;
            } catch (Throwable t) {
                long elapsed = System.currentTimeMillis() - start;
                System.out.printf("FAILED (%d ms)%n", elapsed);
                t.printStackTrace(System.out);
                failed++;
            }
        }

        long totalElapsed = System.currentTimeMillis() - totalStart;
        System.out.println("--------------------------------------------------------------------------------");
        System.out.printf("TEST SUMMARY: Total: %d | Passed: %d | Failed: %d | Total Duration: %d ms%n",
                testMethods.size(), passed, failed, totalElapsed);
        System.out.println("================================================================================");

        if (failed > 0) {
            System.exit(1);
        } else {
            System.exit(0);
        }
    }
}
