package com.appzys.crm.controller;

import com.appzys.crm.dto.*;
import com.appzys.crm.service.CompanyContactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/companies/{companyId}/contacts")
@RequiredArgsConstructor
public class CompanyContactController {

    private final CompanyContactService contactService;

    @GetMapping
    public ResponseEntity<List<CompanyContactDto>> getContacts(@PathVariable("companyId") Long companyId) {
        return ResponseEntity.ok(contactService.getContactsForCompany(companyId));
    }

    @PostMapping
    public ResponseEntity<CompanyContactDto> addContact(
            @PathVariable("companyId") Long companyId,
            @Valid @RequestBody CompanyContactCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contactService.createContact(companyId, req));
    }

    @GetMapping("/{contactId}")
    public ResponseEntity<CompanyContactDto> getContact(
            @PathVariable("companyId") Long companyId,
            @PathVariable("contactId") Long contactId) {
        return ResponseEntity.ok(contactService.getContactById(companyId, contactId));
    }

    @PutMapping("/{contactId}")
    public ResponseEntity<CompanyContactDto> updateContact(
            @PathVariable("companyId") Long companyId,
            @PathVariable("contactId") Long contactId,
            @Valid @RequestBody CompanyContactUpdateRequest req) {
        return ResponseEntity.ok(contactService.updateContact(companyId, contactId, req));
    }

    @PatchMapping("/{contactId}/status")
    public ResponseEntity<CompanyContactDto> updateStatus(
            @PathVariable("companyId") Long companyId,
            @PathVariable("contactId") Long contactId,
            @Valid @RequestBody ContactStatusUpdateRequest req) {
        return ResponseEntity.ok(contactService.updateContactStatus(companyId, contactId, req.getStatus()));
    }

    @PostMapping("/{contactId}/activities")
    public ResponseEntity<CompanyDetailDto.ActivityDto> addPersonActivity(
            @PathVariable("companyId") Long companyId,
            @PathVariable("contactId") Long contactId,
            @Valid @RequestBody AddPersonActivityRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contactService.addPersonActivity(companyId, contactId, req));
    }

    @GetMapping("/{contactId}/activities")
    public ResponseEntity<List<CompanyDetailDto.ActivityDto>> getPersonActivities(
            @PathVariable("companyId") Long companyId,
            @PathVariable("contactId") Long contactId) {
        return ResponseEntity.ok(contactService.getPersonActivities(companyId, contactId));
    }
}
