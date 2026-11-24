package com.appzys.crm.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class AuthSessionServiceIpTest {

    private AuthSessionService authSessionService;

    @BeforeEach
    public void setUp() {
        authSessionService = new AuthSessionService();
    }

    @Test
    @DisplayName("Direct connection without forwarding headers uses getRemoteAddr")
    public void testDirectConnectionWithoutHeaders() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.25");

        String resolvedIp = authSessionService.extractClientIp(request);
        assertEquals("198.51.100.25", resolvedIp, "Must use direct TCP peer IP when no headers are present");
    }

    @Test
    @DisplayName("Direct connection with spoofed X-Forwarded-For and X-Real-IP ignores spoofed headers")
    public void testDirectConnectionWithSpoofedHeaders() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.25"); // Untrusted direct caller
        request.addHeader("X-Forwarded-For", "8.8.8.8, 9.9.9.9");
        request.addHeader("X-Real-IP", "1.1.1.1");

        String resolvedIp = authSessionService.extractClientIp(request);
        assertEquals("198.51.100.25", resolvedIp, "Direct connection must reject all client-supplied forwarding headers");
    }

    @Test
    @DisplayName("Legitimate forwarding header through trusted proxy (Render 10.x.x.x) resolves client IP")
    public void testLegitimateForwardingThroughTrustedProxy() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.3.15"); // Render internal edge proxy IP
        request.addHeader("X-Forwarded-For", "203.0.113.195");

        String resolvedIp = authSessionService.extractClientIp(request);
        assertEquals("203.0.113.195", resolvedIp, "Must extract client IP forwarded by trusted Render proxy");
    }

    @Test
    @DisplayName("Spoofed forwarding header behind trusted proxy resolves true client IP, not the spoofed prefix")
    public void testSpoofedPrefixBehindTrustedProxy() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.3.15"); // Render internal edge proxy
        // Attacker injected 1.2.3.4, then Render proxy appended authentic IP 203.0.113.195
        request.addHeader("X-Forwarded-For", "1.2.3.4, 203.0.113.195");

        String resolvedIp = authSessionService.extractClientIp(request);
        assertEquals("203.0.113.195", resolvedIp, "Must extract the authentic client IP appended by Render, discarding spoofed prefix");
    }

    @Test
    @DisplayName("Untrusted X-Real-IP is completely ignored and never used as fallback")
    public void testUntrustedXRealIpIsIgnored() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.50");
        request.addHeader("X-Real-IP", "5.5.5.5");

        String resolvedIp = authSessionService.extractClientIp(request);
        assertEquals("198.51.100.50", resolvedIp, "X-Real-IP must not be trusted on direct requests");
    }

    @Test
    @DisplayName("Port numbers in forwarding headers are properly sanitized")
    public void testPortSanitization() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1"); // Trusted loopback proxy
        request.addHeader("X-Forwarded-For", "203.0.113.55:49152");

        String resolvedIp = authSessionService.extractClientIp(request);
        assertEquals("203.0.113.55", resolvedIp, "Port numbers must be stripped from resolved client IP");
    }

    public static void main(String[] args) {
        System.out.println("=== RUNNING CLIENT IP EXTRACTION & ANTI-SPOOFING TESTS ===");
        AuthSessionServiceIpTest test = new AuthSessionServiceIpTest();
        int passed = 0;

        test.setUp();
        test.testDirectConnectionWithoutHeaders();
        System.out.println("[PASS] 1. Direct connection without headers correctly uses peer IP");
        passed++;

        test.setUp();
        test.testDirectConnectionWithSpoofedHeaders();
        System.out.println("[PASS] 2. Direct connection with spoofed X-Forwarded-For/X-Real-IP rejects spoofed headers");
        passed++;

        test.setUp();
        test.testLegitimateForwardingThroughTrustedProxy();
        System.out.println("[PASS] 3. Legitimate forwarding through trusted Render proxy (10.x.x.x) extracts client IP");
        passed++;

        test.setUp();
        test.testSpoofedPrefixBehindTrustedProxy();
        System.out.println("[PASS] 4. Attacker-injected fake IP behind trusted proxy is rejected; true client IP resolved");
        passed++;

        test.setUp();
        test.testUntrustedXRealIpIsIgnored();
        System.out.println("[PASS] 5. Untrusted X-Real-IP is completely ignored");
        passed++;

        test.setUp();
        test.testPortSanitization();
        System.out.println("[PASS] 6. Port number stripped from resolved IP");
        passed++;

        System.out.println("=== ALL " + passed + " TESTS PASSED SUCCESSFULLY! ===");
    }
}
