package com.appzys.crm.service;

import com.appzys.crm.dto.*;
import com.appzys.crm.model.Activity;
import com.appzys.crm.model.Company;
import com.appzys.crm.model.CompanyContact;
import com.appzys.crm.model.LeadStatus;
import com.appzys.crm.repository.ActivityRepository;
import com.appzys.crm.repository.CompanyContactRepository;
import com.appzys.crm.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompanyContactService {

    private final CompanyRepository companyRepository;
    private final CompanyContactRepository contactRepository;
    private final ActivityRepository activityRepository;

    @Transactional(readOnly = true)
    public List<CompanyContactDto> getContactsForCompany(Long companyId) {
        if (!companyRepository.existsById(companyId)) {
            throw new IllegalArgumentException("Company not found with ID: " + companyId);
        }
        return contactRepository.findByCompanyIdOrderByCreatedAtAsc(companyId).stream()
                .map(this::mapToContactDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CompanyContactDto getContactById(Long companyId, Long contactId) {
        CompanyContact contact = contactRepository.findByIdAndCompanyId(contactId, companyId)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found with ID: " + contactId + " for company: " + companyId));
        return mapToContactDto(contact);
    }

    @Transactional
    public CompanyContactDto createContact(Long companyId, CompanyContactCreateRequest req) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with ID: " + companyId));

        LeadStatus initialStatus = LeadStatus.FOUND;
        if (req.getInitialStatus() != null && !req.getInitialStatus().isBlank()) {
            try {
                initialStatus = LeadStatus.valueOf(req.getInitialStatus().trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ignored) {}
        }

        CompanyContact contact = CompanyContact.builder()
                .company(company)
                .personName(req.getPersonName().trim())
                .designation(req.getDesignation() != null ? req.getDesignation().trim() : null)
                .email(req.getEmail() != null ? req.getEmail().trim() : null)
                .phone(req.getPhone() != null ? req.getPhone().trim() : null)
                .linkedinUrl(req.getLinkedinUrl() != null ? req.getLinkedinUrl().trim() : null)
                .status(initialStatus)
                .build();

        CompanyContact savedContact = contactRepository.save(contact);
        company.addContact(savedContact);

        // Record initial automatic activity for this contact
        Activity initialActivity = Activity.builder()
                .company(company)
                .contact(savedContact)
                .activityType("CONTACT_ADDED")
                .platform("CRM")
                .title("Contact added: " + savedContact.getPersonName())
                .description("Contact added with status " + initialStatus.getDisplayName() + 
                        (savedContact.getDesignation() != null ? " (" + savedContact.getDesignation() + ")" : ""))
                .isAutomatic(true)
                .eventTimestamp(LocalDateTime.now())
                .build();
        activityRepository.save(initialActivity);

        return mapToContactDto(savedContact);
    }

    @Transactional
    public CompanyContactDto updateContact(Long companyId, Long contactId, CompanyContactUpdateRequest req) {
        CompanyContact contact = contactRepository.findByIdAndCompanyId(contactId, companyId)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found with ID: " + contactId + " for company: " + companyId));

        contact.setPersonName(req.getPersonName().trim());
        contact.setDesignation(req.getDesignation() != null ? req.getDesignation().trim() : null);
        contact.setEmail(req.getEmail() != null ? req.getEmail().trim() : null);
        contact.setPhone(req.getPhone() != null ? req.getPhone().trim() : null);
        contact.setLinkedinUrl(req.getLinkedinUrl() != null ? req.getLinkedinUrl().trim() : null);

        CompanyContact updated = contactRepository.save(contact);
        return mapToContactDto(updated);
    }

    @Transactional
    public CompanyContactDto updateContactStatus(Long companyId, Long contactId, String newStatusStr) {
        CompanyContact contact = contactRepository.findByIdAndCompanyId(contactId, companyId)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found with ID: " + contactId + " for company: " + companyId));

        LeadStatus newStatus;
        try {
            newStatus = LeadStatus.valueOf(newStatusStr.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid lead status: " + newStatusStr);
        }

        if (contact.getStatus() != newStatus) {
            LeadStatus oldStatus = contact.getStatus();
            contact.setStatus(newStatus);
            contactRepository.save(contact);

            // Record automatic status change activity isolated to this contact
            Activity activity = Activity.builder()
                    .company(contact.getCompany())
                    .contact(contact)
                    .activityType("STATUS_CHANGED")
                    .platform("CRM")
                    .title("Status changed: " + contact.getPersonName())
                    .description("Status transitioned from " + oldStatus.getDisplayName() + " → " + newStatus.getDisplayName())
                    .isAutomatic(true)
                    .eventTimestamp(LocalDateTime.now())
                    .build();
            activityRepository.save(activity);
        }

        return mapToContactDto(contact);
    }

    @Transactional
    public CompanyDetailDto.ActivityDto addPersonActivity(Long companyId, Long contactId, AddPersonActivityRequest req) {
        CompanyContact contact = contactRepository.findByIdAndCompanyId(contactId, companyId)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found with ID: " + contactId + " for company: " + companyId));

        LocalDateTime eventTime = req.getActivityDate() != null
                ? req.getActivityDate().atTime(LocalTime.now())
                : LocalDateTime.now();

        String type = req.getActivityType().trim().toUpperCase(Locale.ROOT);
        String title = req.getActivityType().trim() + " with " + contact.getPersonName();

        Activity activity = Activity.builder()
                .company(contact.getCompany())
                .contact(contact)
                .activityType(type)
                .platform(req.getPlatform() != null && !req.getPlatform().isBlank() ? req.getPlatform().trim() : "Internal")
                .eventTimestamp(eventTime)
                .title(title)
                .description(req.getDescription() != null ? req.getDescription().trim() : "")
                .isAutomatic(false)
                .build();

        Activity saved = activityRepository.save(activity);
        return mapActivityToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<CompanyDetailDto.ActivityDto> getPersonActivities(Long companyId, Long contactId) {
        if (!contactRepository.existsById(contactId)) {
            throw new IllegalArgumentException("Contact not found with ID: " + contactId);
        }
        return activityRepository.findByContactIdOrderByEventTimestampDesc(contactId).stream()
                .map(this::mapActivityToDto)
                .collect(Collectors.toList());
    }

    public CompanyContactDto mapToContactDto(CompanyContact c) {
        int actCount = activityRepository.findByContactIdOrderByEventTimestampDesc(c.getId()).size();
        return CompanyContactDto.builder()
                .id(c.getId())
                .companyId(c.getCompany().getId())
                .personName(c.getPersonName())
                .designation(c.getDesignation())
                .email(c.getEmail())
                .phone(c.getPhone())
                .linkedinUrl(c.getLinkedinUrl())
                .status(c.getStatus().name())
                .statusDisplayName(c.getStatus().getDisplayName())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .activitiesCount(actCount)
                .build();
    }

    public CompanyDetailDto.ActivityDto mapActivityToDto(Activity a) {
        return CompanyDetailDto.ActivityDto.builder()
                .id(a.getId())
                .activityType(a.getActivityType())
                .platform(a.getPlatform())
                .eventTimestamp(a.getEventTimestamp())
                .title(a.getTitle())
                .description(a.getDescription())
                .outcome(a.getOutcome())
                .isAutomatic(a.getIsAutomatic())
                .contactId(a.getContact() != null ? a.getContact().getId() : null)
                .contactPersonName(a.getContact() != null ? a.getContact().getPersonName() : null)
                .createdAt(a.getCreatedAt())
                .build();
    }
}
