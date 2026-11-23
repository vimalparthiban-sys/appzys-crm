package com.appzys.crm.controller;

import com.appzys.crm.dto.*;
import com.appzys.crm.model.LeadStatus;
import com.appzys.crm.service.CompanyService;
import com.appzys.crm.service.DuplicateDetectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;
    private final DuplicateDetectionService duplicateDetectionService;

    @GetMapping
    public ResponseEntity<List<CompanyDetailDto>> getAllCompanies(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "source", required = false) String source,
            @RequestParam(name = "followUp", required = false) String followUp,
            @RequestParam(name = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(name = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(name = "sort", required = false, defaultValue = "NEW") String sort) {
        List<CompanyDetailDto> list = companyService.getAllCompanies(search, status, source, followUp, startDate, endDate, sort);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CompanyDetailDto> getCompanyById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(companyService.getCompanyById(id));
    }

    @PostMapping("/check-duplicate")
    public ResponseEntity<DuplicateCheckResponse> checkDuplicate(
            @RequestParam("name") String name,
            @RequestParam("officialWebsite") String officialWebsite,
            @RequestParam(name = "sourceUrl", required = false) String sourceUrl) {
        return ResponseEntity.ok(duplicateDetectionService.checkDuplicate(name, officialWebsite, sourceUrl));
    }

    @PostMapping
    public ResponseEntity<?> createLead(@Valid @RequestBody LeadCreateRequest req) {
        try {
            CompanyDetailDto created = companyService.createLead(req);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<CompanyDetailDto> updateLead(@PathVariable("id") Long id, @RequestBody LeadUpdateRequest req) {
        return ResponseEntity.ok(companyService.updateLead(id, req));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<CompanyDetailDto> updateStatus(@PathVariable("id") Long id, @RequestBody Map<String, String> body) {
        String statusStr = body.get("status");
        LeadStatus status = LeadStatus.valueOf(statusStr.toUpperCase());
        return ResponseEntity.ok(companyService.updateStatus(id, status));
    }

    @PostMapping("/{id}/sources")
    public ResponseEntity<CompanyDetailDto> attachSource(
            @PathVariable("id") Long id, @Valid @RequestBody AddSourceRequest req) {
        return ResponseEntity.ok(companyService.attachSourceToExistingCompany(id, req));
    }

    @PostMapping("/{id}/follow-ups")
    public ResponseEntity<CompanyDetailDto> scheduleFollowUp(
            @PathVariable("id") Long id, @Valid @RequestBody ScheduleFollowUpRequest req) {
        return ResponseEntity.ok(companyService.scheduleFollowUp(id, req));
    }

    @PatchMapping("/{companyId}/follow-ups/{followUpId}/complete")
    public ResponseEntity<CompanyDetailDto> completeFollowUp(
            @PathVariable("companyId") Long companyId, @PathVariable("followUpId") Long followUpId) {
        return ResponseEntity.ok(companyService.completeFollowUp(companyId, followUpId));
    }

    @PostMapping("/{id}/activities")
    public ResponseEntity<CompanyDetailDto.ActivityDto> addActivity(
            @PathVariable("id") Long id, @Valid @RequestBody AddActivityRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(companyService.addManualActivity(id, req));
    }

    @PatchMapping("/{companyId}/activities/{activityId}/description")
    public ResponseEntity<CompanyDetailDto.ActivityDto> updateActivityDescription(
            @PathVariable("companyId") Long companyId,
            @PathVariable("activityId") Long activityId,
            @Valid @RequestBody ActivityUpdateDescriptionRequest req) {
        return ResponseEntity.ok(companyService.updateActivityDescription(companyId, activityId, req));
    }
}
