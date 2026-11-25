package com.appzys.crm.controller;

import com.appzys.crm.model.Employee;
import com.appzys.crm.model.MemberSession;
import com.appzys.crm.repository.EmployeeRepository;
import com.appzys.crm.repository.MemberSessionRepository;
import com.appzys.crm.service.AuthSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AuthSessionService authSessionService;
    private final EmployeeRepository employeeRepository;
    private final MemberSessionRepository memberSessionRepository;

    /**
     * Lists all 4 company employee accounts, active/revoked status, and enrolled devices.
     */
    @GetMapping("/employees")
    public ResponseEntity<?> listEmployees() {
        List<Employee> employees = employeeRepository.findAllByOrderByMemberIdAsc();
        List<Map<String, Object>> response = new ArrayList<>();

        for (Employee emp : employees) {
            List<MemberSession> sessions = memberSessionRepository.findByMemberIdOrderByCreatedAtDesc(emp.getMemberId());
            long activeDeviceCount = sessions.stream().filter(s -> !Boolean.TRUE.equals(s.getIsRevoked())).count();

            List<Map<String, Object>> deviceList = new ArrayList<>();
            for (MemberSession s : sessions) {
                deviceList.add(Map.of(
                        "sessionId", s.getSessionId().substring(0, 8) + "...",
                        "deviceName", s.getDeviceName() != null ? s.getDeviceName() : "Unknown Device",
                        "ipAddress", s.getIpAddress() != null ? s.getIpAddress() : "Unknown",
                        "isRevoked", Boolean.TRUE.equals(s.getIsRevoked()),
                        "lastActiveAt", s.getLastActiveAt() != null ? s.getLastActiveAt().toString() : s.getCreatedAt().toString()
                ));
            }

            Map<String, Object> empData = new LinkedHashMap<>();
            empData.put("memberId", emp.getMemberId());
            empData.put("memberName", emp.getMemberName());
            empData.put("status", emp.getStatus());
            empData.put("activeDeviceCount", activeDeviceCount);
            empData.put("totalEnrolledDevices", sessions.size());
            empData.put("devices", deviceList);
            response.add(empData);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Centralized Administrator Revocation:
     * Immediately blocks employee across all browsers, devices, and sessions globally.
     */
    @PostMapping("/employees/{memberId}/revoke")
    public ResponseEntity<?> revokeEmployee(@PathVariable("memberId") String memberId) {
        int count = authSessionService.revokeEmployee(memberId);
        return ResponseEntity.ok(Map.of(
                "status", "REVOKED",
                "memberId", memberId,
                "sessionsInvalidated", count,
                "message", "Employee " + memberId + " revoked globally across all browsers, devices, and sessions."
        ));
    }

    /**
     * Centralized Administrator Restoration:
     * Restores employee to ACTIVE status.
     */
    @PostMapping("/employees/{memberId}/restore")
    public ResponseEntity<?> restoreEmployee(@PathVariable("memberId") String memberId) {
        boolean restored = authSessionService.restoreEmployee(memberId);
        if (!restored) {
            return ResponseEntity.badRequest().body(Map.of("message", "Unable to restore employee: " + memberId));
        }
        return ResponseEntity.ok(Map.of(
                "status", "ACTIVE",
                "memberId", memberId,
                "message", "Employee " + memberId + " restored to ACTIVE status. New devices may now be enrolled."
        ));
    }

    /**
     * Generates a one-time device enrollment invite + 6-digit PIN for an employee to enroll a new browser or computer.
     */
    @PostMapping("/employees/{memberId}/enroll")
    public ResponseEntity<?> generateEnrollment(@PathVariable("memberId") String memberId) {
        try {
            AuthSessionService.AdminInviteRecord record = authSessionService.generateDeviceEnrollment(memberId);
            return ResponseEntity.ok(Map.of(
                    "status", "ENROLLMENT_GENERATED",
                    "memberId", record.memberId(),
                    "memberName", record.memberName(),
                    "inviteCode", record.rawCode(),
                    "pin", record.rawPin(),
                    "instructions", "Open CRM URL on new browser/device with ?invite=" + record.rawCode() + " and enter PIN " + record.rawPin()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Master-Admin-Only: View initial setup enrollment links for distribution.
     * (Securely moved here from public/ordinary member endpoints).
     */
    @GetMapping("/invites")
    public ResponseEntity<?> getInitialInvites() {
        return ResponseEntity.ok(Map.of(
                "status", "ACTIVE",
                "invitations", authSessionService.getInitialInviteLinks()
        ));
    }

    /**
     * Master-Admin-Only: Purge transient setup invitation secrets from memory once distributed.
     */
    @PostMapping("/invites/purge")
    public ResponseEntity<?> purgeInitialInvites() {
        authSessionService.purgeInitialInviteLinks();
        return ResponseEntity.ok(Map.of(
                "status", "PURGED",
                "message", "Initial setup invitation secrets permanently purged from memory."
        ));
    }

    /**
     * Legacy route alias for backward compatibility.
     */
    @PostMapping("/members/{memberId}/revoke")
    public ResponseEntity<?> revokeMemberLegacy(@PathVariable("memberId") String memberId) {
        return revokeEmployee(memberId);
    }
}
