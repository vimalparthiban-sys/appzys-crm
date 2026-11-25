package com.appzys.crm.controller;

import com.appzys.crm.dto.*;
import com.appzys.crm.model.AiAuditLog;
import com.appzys.crm.model.LeadStatus;
import com.appzys.crm.repository.AiAuditLogRepository;
import com.appzys.crm.service.CompanyContactService;
import com.appzys.crm.service.CompanyService;
import com.appzys.crm.service.DuplicateDetectionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiIntegrationController {

    private final CompanyService companyService;
    private final CompanyContactService contactService;
    private final DuplicateDetectionService duplicateDetectionService;
    private final AiAuditLogRepository aiAuditLogRepository;

    private String getAgentId(HttpServletRequest request) {
        Object agent = request.getAttribute("authenticated_ai_agent");
        return agent != null ? agent.toString() : "AI:Unknown";
    }

    private void recordAudit(HttpServletRequest request, String action, String entityType, Long entityId, String summary) {
        try {
            String agentId = getAgentId(request);
            String clientIp = request.getRemoteAddr();
            AiAuditLog logEntry = AiAuditLog.builder()
                    .agentId(agentId)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .summary(summary)
                    .ipAddress(clientIp)
                    .build();
            aiAuditLogRepository.save(logEntry);
        } catch (Exception e) {
            log.warn("Failed to write AI audit log: {}", e.getMessage());
        }
    }

    /**
     * Check if a company already exists by name or website before creation.
     */
    @PostMapping("/companies/check-duplicate")
    public ResponseEntity<DuplicateCheckResponse> checkDuplicate(
            @RequestParam("name") String name,
            @RequestParam("officialWebsite") String officialWebsite,
            @RequestParam(name = "sourceUrl", required = false) String sourceUrl
    ) {
        return ResponseEntity.ok(duplicateDetectionService.checkDuplicate(name, officialWebsite, sourceUrl));
    }

    /**
     * Search and list existing leads for AI agent context.
     */
    @GetMapping("/companies/search")
    public ResponseEntity<List<CompanyDetailDto>> searchLeads(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "status", required = false) String status
    ) {
        List<CompanyDetailDto> results = companyService.getAllCompanies(search, status, null, null, null, null, "NEW");
        // Restrict to max 50 items to prevent massive payloads
        if (results.size() > 50) {
            results = results.subList(0, 50);
        }
        return ResponseEntity.ok(results);
    }

    /**
     * Get company detail by ID.
     */
    @GetMapping("/companies/{id}")
    public ResponseEntity<CompanyDetailDto> getCompanyById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(companyService.getCompanyById(id));
    }

    /**
     * Create verified lead with duplicate prevention and audit logging.
     */
    @PostMapping("/companies")
    public ResponseEntity<?> createLead(
            @Valid @RequestBody AiLeadCreateRequest req,
            HttpServletRequest request
    ) {
        // Enforce duplicate check
        DuplicateCheckResponse dup = duplicateDetectionService.checkDuplicate(req.getName(), req.getOfficialWebsite(), null);
        if (dup.isDuplicateFound()) {
            Long matchedId = (dup.getMatchingCompanies() != null && !dup.getMatchingCompanies().isEmpty())
                    ? dup.getMatchingCompanies().get(0).getId() : null;
            String matchedName = (dup.getMatchingCompanies() != null && !dup.getMatchingCompanies().isEmpty())
                    ? dup.getMatchingCompanies().get(0).getName() : "Unknown";
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "status", "DUPLICATE_REJECTED",
                    "message", dup.getReason() != null ? dup.getReason() : "Duplicate company detected",
                    "matchedCompanyId", matchedId != null ? matchedId : 0L,
                    "matchedCompanyName", matchedName
            ));
        }

        // Map AI request to CRM LeadCreateRequest
        LocalDate followUpDate = null;
        if (req.getNextFollowUpDate() != null && !req.getNextFollowUpDate().isBlank()) {
            try {
                followUpDate = LocalDate.parse(req.getNextFollowUpDate().trim());
            } catch (Exception ignored) {}
        }

        String sourcePlatform = (req.getSource() != null && req.getSource().toLowerCase().contains("website"))
                ? "Company Website" : "LinkedIn";

        LeadCreateRequest leadReq = new LeadCreateRequest();
        leadReq.setName(req.getName());
        leadReq.setOfficialWebsite(req.getOfficialWebsite());
        leadReq.setContactPerson(req.getContactPerson());
        leadReq.setEmail(req.getEmail());
        leadReq.setPhone(req.getPhone());
        leadReq.setSourcePlatform(sourcePlatform);
        leadReq.setSourceUrl(req.getOfficialWebsite());
        leadReq.setSourceNotes(req.getNotes() != null ? req.getNotes() : "Created via AI Agent");
        leadReq.setFollowUpDate(followUpDate);
        leadReq.setFollowUpReason(req.getFollowUpReason());

        CompanyDetailDto created = companyService.createLead(leadReq);

        recordAudit(request, "LEAD_CREATED", "COMPANY", created.getId(),
                "Created company lead: " + created.getName() + " via " + sourcePlatform);

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update lead pipeline status.
     */
    @PatchMapping("/companies/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable("id") Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        String statusStr = body.get("status");
        if (statusStr == null || statusStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Status string is required"));
        }

        try {
            LeadStatus status = LeadStatus.valueOf(statusStr.toUpperCase());
            CompanyDetailDto updated = companyService.updateStatus(id, status);
            recordAudit(request, "STATUS_UPDATED", "COMPANY", id, "Updated pipeline status to " + status.name());
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid status: " + statusStr));
        }
    }

    /**
     * Add contact person under a company.
     */
    @PostMapping("/companies/{id}/contacts")
    public ResponseEntity<?> addContact(
            @PathVariable("id") Long id,
            @Valid @RequestBody AiContactCreateRequest req,
            HttpServletRequest request
    ) {
        CompanyContactCreateRequest contactReq = new CompanyContactCreateRequest();
        contactReq.setPersonName(req.getName());
        contactReq.setDesignation(req.getRole());
        contactReq.setEmail(req.getEmail());
        contactReq.setPhone(req.getPhone());
        contactReq.setLinkedinUrl(req.getLinkedinUrl());

        CompanyContactDto created = contactService.createContact(id, contactReq);
        recordAudit(request, "CONTACT_ADDED", "CONTACT", created.getId(),
                "Added contact " + created.getPersonName() + " to company #" + id);

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Schedule a follow-up task.
     */
    @PostMapping("/companies/{id}/follow-ups")
    public ResponseEntity<?> scheduleFollowUp(
            @PathVariable("id") Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        String dateStr = body.get("date");
        String reason = body.get("reason");

        if (dateStr == null || dateStr.isBlank() || reason == null || reason.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Both 'date' (YYYY-MM-DD) and 'reason' are required."));
        }

        LocalDate scheduledDate = LocalDate.parse(dateStr.trim());
        ScheduleFollowUpRequest req = new ScheduleFollowUpRequest();
        req.setScheduledDate(scheduledDate);
        req.setReason(reason);

        CompanyDetailDto updated = companyService.scheduleFollowUp(id, req);
        recordAudit(request, "FOLLOW_UP_SCHEDULED", "COMPANY", id,
                "Scheduled follow-up for " + scheduledDate + " - " + reason);

        return ResponseEntity.ok(updated);
    }

    /**
     * Log manual outreach activity (Call, Email, Meeting, Note).
     */
    @PostMapping("/companies/{id}/activities")
    public ResponseEntity<?> logActivity(
            @PathVariable("id") Long id,
            @Valid @RequestBody AiActivityCreateRequest req,
            HttpServletRequest request
    ) {
        AddActivityRequest activityReq = new AddActivityRequest();
        activityReq.setActivityType(req.getType() != null ? req.getType() : "NOTE");
        activityReq.setTitle(req.getType() != null ? req.getType() : "Activity");
        activityReq.setDescription(req.getDescription());
        activityReq.setPlatform("AI Agent");

        CompanyDetailDto.ActivityDto updatedActivity = companyService.addManualActivity(id, activityReq);
        recordAudit(request, "ACTIVITY_LOGGED", "COMPANY", id,
                "Logged " + req.getType() + ": " + req.getDescription());

        return ResponseEntity.ok(updatedActivity);
    }

    /**
     * View sanitized audit log records.
     */
    @GetMapping("/audit-logs")
    public ResponseEntity<List<AiAuditLog>> getAuditLogs() {
        return ResponseEntity.ok(aiAuditLogRepository.findTop50ByOrderByCreatedAtDesc());
    }
}
