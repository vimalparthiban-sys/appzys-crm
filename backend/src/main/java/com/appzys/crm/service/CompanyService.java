package com.appzys.crm.service;

import com.appzys.crm.dto.*;
import com.appzys.crm.model.*;
import com.appzys.crm.repository.*;
import com.appzys.crm.util.NormalizationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final CompanySourceRepository companySourceRepository;
    private final FollowUpRepository followUpRepository;
    private final ActivityRepository activityRepository;
    private final SettingSourceRepository settingSourceRepository;
    private final DuplicateDetectionService duplicateDetectionService;
    private final CompanyContactRepository contactRepository;
    private final CompanyContactService contactService;

    @Transactional
    public CompanyDetailDto createLead(LeadCreateRequest req) {
        if (!req.isForceCreate()) {
            DuplicateCheckResponse dup = duplicateDetectionService.checkDuplicate(
                    req.getName(), req.getOfficialWebsite(), req.getSourceUrl());
            if (dup.isDuplicateFound()) {
                throw new IllegalStateException("Potential duplicate detected: " + dup.getReason());
            }
        }

        Company company = Company.builder()
                .name(req.getName().trim())
                .normalizedName(NormalizationUtil.normalizeCompanyName(req.getName()))
                .officialWebsite(req.getOfficialWebsite().trim())
                .normalizedWebsite(NormalizationUtil.normalizeUrl(req.getOfficialWebsite()))
                .contactPerson(req.getContactPerson() != null ? req.getContactPerson().trim() : null)
                .email(req.getEmail() != null ? req.getEmail().trim() : null)
                .phone(req.getPhone() != null ? req.getPhone().trim() : null)
                .status(LeadStatus.FOUND)
                .build();

        Company savedCompany = companyRepository.save(company);
        saveReusablePlatformIfNew(req.getSourcePlatform());

        CompanySource source = CompanySource.builder()
                .company(savedCompany)
                .platformName(req.getSourcePlatform().trim())
                .sourceUrl(req.getSourceUrl() != null ? req.getSourceUrl().trim() : null)
                .normalizedSourceUrl(NormalizationUtil.normalizeUrl(req.getSourceUrl()))
                .notes(req.getSourceNotes())
                .build();
        companySourceRepository.save(source);
        savedCompany.addSource(source);

        if (req.getFollowUpDate() != null) {
            FollowUp followUp = FollowUp.builder()
                    .company(savedCompany)
                    .scheduledDate(req.getFollowUpDate())
                    .reason(req.getFollowUpReason() != null ? req.getFollowUpReason().trim() : "Initial follow-up")
                    .status(FollowUpStatus.SCHEDULED)
                    .isCompleted(false)
                    .build();
            followUpRepository.save(followUp);
            savedCompany.addFollowUp(followUp);

            recordAutomaticActivity(savedCompany, "FOLLOWUP_SCHEDULED", "Internal",
                    "Follow-up scheduled: " + savedCompany.getName(),
                    "Scheduled follow-up for " + req.getFollowUpDate() + (req.getFollowUpReason() != null ? " (" + req.getFollowUpReason() + ")" : ""));
        }

        recordAutomaticActivity(savedCompany, "LEAD_CREATED", req.getSourcePlatform(),
                "New lead added: " + savedCompany.getName(),
                "Lead found on " + req.getSourcePlatform() + " and added to pipeline.");

        return mapToDetailDto(savedCompany);
    }

    @Transactional
    public CompanyDetailDto attachSourceToExistingCompany(Long companyId, AddSourceRequest req) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with ID: " + companyId));

        saveReusablePlatformIfNew(req.getPlatformName());

        CompanySource source = CompanySource.builder()
                .company(company)
                .platformName(req.getPlatformName().trim())
                .sourceUrl(req.getSourceUrl() != null ? req.getSourceUrl().trim() : null)
                .normalizedSourceUrl(NormalizationUtil.normalizeUrl(req.getSourceUrl()))
                .notes(req.getNotes())
                .build();
        companySourceRepository.save(source);
        company.addSource(source);

        recordAutomaticActivity(company, "SOURCE_ADDED", req.getPlatformName(),
                "New source attached: " + req.getPlatformName(),
                "Added discovery link: " + (req.getSourceUrl() != null ? req.getSourceUrl() : "No URL"));

        return mapToDetailDto(company);
    }

    @Transactional
    public CompanyDetailDto updateLead(Long companyId, LeadUpdateRequest req) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with ID: " + companyId));

        if (req.getName() != null && !req.getName().isBlank()) {
            company.setName(req.getName().trim());
            company.setNormalizedName(NormalizationUtil.normalizeCompanyName(req.getName()));
        }
        if (req.getOfficialWebsite() != null && !req.getOfficialWebsite().isBlank()) {
            company.setOfficialWebsite(req.getOfficialWebsite().trim());
            company.setNormalizedWebsite(NormalizationUtil.normalizeUrl(req.getOfficialWebsite()));
        }
        if (req.getContactPerson() != null) company.setContactPerson(req.getContactPerson().trim());
        if (req.getEmail() != null) company.setEmail(req.getEmail().trim());
        if (req.getPhone() != null) company.setPhone(req.getPhone().trim());

        if (req.getStatus() != null && req.getStatus() != company.getStatus()) {
            LeadStatus oldStatus = company.getStatus();
            company.setStatus(req.getStatus());

            recordAutomaticActivity(company, "STATUS_CHANGED", "CRM",
                    "Status changed: " + company.getName(),
                    "Status updated from " + oldStatus.getDisplayName() + " to " + req.getStatus().getDisplayName());
        }

        Company updated = companyRepository.save(company);
        return mapToDetailDto(updated);
    }

    @Transactional
    public CompanyDetailDto updateStatus(Long companyId, LeadStatus newStatus) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with ID: " + companyId));

        if (company.getStatus() != newStatus) {
            LeadStatus oldStatus = company.getStatus();
            company.setStatus(newStatus);
            companyRepository.save(company);

            recordAutomaticActivity(company, "STATUS_CHANGED", "CRM",
                    "Status changed: " + company.getName(),
                    "Status transitioned from " + oldStatus.getDisplayName() + " → " + newStatus.getDisplayName());
        }
        return mapToDetailDto(company);
    }

    @Transactional(readOnly = true)
    public CompanyDetailDto getCompanyById(Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with ID: " + companyId));
        return mapToDetailDto(company);
    }

    @Transactional(readOnly = true)
    public List<CompanyDetailDto> getAllCompanies(
            String search, 
            String status, 
            String source, 
            String followUpFilter, 
            LocalDate startDate, 
            LocalDate endDate, 
            String sortOrder) {

        Specification<Company> spec = (root, query, cb) -> {
            var predicates = cb.conjunction();

            if (search != null && !search.isBlank()) {
                String searchLike = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                var nameMatch = cb.like(cb.lower(root.get("name")), searchLike);
                var websiteMatch = cb.like(cb.lower(root.get("officialWebsite")), searchLike);
                var contactMatch = cb.like(cb.lower(root.get("contactPerson")), searchLike);
                var emailMatch = cb.like(cb.lower(root.get("email")), searchLike);

                jakarta.persistence.criteria.Join<Company, CompanyContact> contactJoin = root.join("contacts", jakarta.persistence.criteria.JoinType.LEFT);
                var personNameMatch = cb.like(cb.lower(contactJoin.get("personName")), searchLike);
                var personEmailMatch = cb.like(cb.lower(contactJoin.get("email")), searchLike);
                var personDesignationMatch = cb.like(cb.lower(contactJoin.get("designation")), searchLike);

                query.distinct(true);
                predicates = cb.and(predicates, cb.or(nameMatch, websiteMatch, contactMatch, emailMatch, personNameMatch, personEmailMatch, personDesignationMatch));
            }

            if (status != null && !status.equalsIgnoreCase("ALL")) {
                try {
                    LeadStatus st = LeadStatus.valueOf(status.toUpperCase(Locale.ROOT));
                    predicates = cb.and(predicates, cb.equal(root.get("status"), st));
                } catch (IllegalArgumentException ignored) {}
            }

            if (startDate != null) {
                predicates = cb.and(predicates, cb.greaterThanOrEqualTo(root.get("createdAt"), startDate.atStartOfDay()));
            }
            if (endDate != null) {
                predicates = cb.and(predicates, cb.lessThan(root.get("createdAt"), endDate.plusDays(1).atStartOfDay()));
            }

            return predicates;
        };

        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        if ("OLD".equalsIgnoreCase(sortOrder)) {
            sort = Sort.by(Sort.Direction.ASC, "createdAt");
        } else if ("NAME_AZ".equalsIgnoreCase(sortOrder)) {
            sort = Sort.by(Sort.Direction.ASC, "name");
        } else if ("NAME_ZA".equalsIgnoreCase(sortOrder)) {
            sort = Sort.by(Sort.Direction.DESC, "name");
        }

        List<Company> companies = companyRepository.findAll(spec, sort);

        List<CompanyDetailDto> dtos = companies.stream()
                .map(this::mapToDetailDto)
                .collect(Collectors.toList());

        if (source != null && !source.equalsIgnoreCase("ALL")) {
            dtos = dtos.stream()
                    .filter(c -> c.getSources().stream().anyMatch(s -> s.getPlatformName().equalsIgnoreCase(source)))
                    .collect(Collectors.toList());
        }

        if (followUpFilter != null && !followUpFilter.equalsIgnoreCase("ALL")) {
            dtos = dtos.stream()
                    .filter(c -> c.getFollowUpUrgency().equalsIgnoreCase(followUpFilter))
                    .collect(Collectors.toList());
        }

        return dtos;
    }

    /**
     * Follow-up Scheduling with Correct Lifecycle Management:
     * - Scheduled/Active records remain in status SCHEDULED.
     * - When rescheduled, the previous record status is set to RESCHEDULED (preserving its original date).
     * - A new active record is created with status SCHEDULED.
     * - COMPLETED status is ONLY used when the user explicitly marks it completed.
     * - Rescheduled records are NOT completed.
     */
    @Transactional
    public CompanyDetailDto scheduleFollowUp(Long companyId, ScheduleFollowUpRequest req) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with ID: " + companyId));

        Optional<FollowUp> existingActiveOpt = followUpRepository.findFirstByCompanyIdAndStatusOrderByScheduledDateAsc(
                companyId, FollowUpStatus.SCHEDULED);

        if (existingActiveOpt.isPresent()) {
            FollowUp oldFollowUp = existingActiveOpt.get();
            LocalDate oldDate = oldFollowUp.getScheduledDate();

            // Transition previous record to RESCHEDULED (never COMPLETED)
            oldFollowUp.setStatus(FollowUpStatus.RESCHEDULED);
            oldFollowUp.setIsCompleted(false);
            if (oldFollowUp.getReason() == null) {
                oldFollowUp.setReason("Rescheduled to " + req.getScheduledDate());
            } else {
                oldFollowUp.setReason(oldFollowUp.getReason() + " [Rescheduled to " + req.getScheduledDate() + "]");
            }
            followUpRepository.save(oldFollowUp);

            // Create new active follow-up
            FollowUp newFollowUp = FollowUp.builder()
                    .company(company)
                    .scheduledDate(req.getScheduledDate())
                    .reason(req.getReason() != null ? req.getReason() : "Rescheduled follow-up")
                    .status(FollowUpStatus.SCHEDULED)
                    .isCompleted(false)
                    .build();
            followUpRepository.save(newFollowUp);
            company.addFollowUp(newFollowUp);

            recordAutomaticActivity(company, "FOLLOWUP_RESCHEDULED", "Internal",
                    "Follow-up rescheduled: " + company.getName(),
                    "Follow-up date moved from " + oldDate + " → " + req.getScheduledDate() +
                            (req.getReason() != null ? " (Reason: " + req.getReason() + ")" : ""));
        } else {
            FollowUp followUp = FollowUp.builder()
                    .company(company)
                    .scheduledDate(req.getScheduledDate())
                    .reason(req.getReason() != null ? req.getReason() : "General Follow-up")
                    .status(FollowUpStatus.SCHEDULED)
                    .isCompleted(false)
                    .build();
            followUpRepository.save(followUp);
            company.addFollowUp(followUp);

            recordAutomaticActivity(company, "FOLLOWUP_SCHEDULED", "Internal",
                    "Follow-up scheduled: " + company.getName(),
                    "Scheduled follow-up for " + req.getScheduledDate() +
                            (req.getReason() != null ? " (" + req.getReason() + ")" : ""));
        }

        return mapToDetailDto(company);
    }

    @Transactional
    public CompanyDetailDto completeFollowUp(Long companyId, Long followUpId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with ID: " + companyId));

        FollowUp followUp = followUpRepository.findById(followUpId)
                .orElseThrow(() -> new IllegalArgumentException("FollowUp not found with ID: " + followUpId));

        // Mark as explicitly COMPLETED
        followUp.setStatus(FollowUpStatus.COMPLETED);
        followUp.setIsCompleted(true);
        followUp.setCompletedAt(LocalDateTime.now());
        followUpRepository.save(followUp);

        recordAutomaticActivity(company, "FOLLOWUP_COMPLETED", "Internal",
                "Follow-up completed: " + company.getName(),
                "Follow-up scheduled for " + followUp.getScheduledDate() + " marked as completed.");

        return mapToDetailDto(company);
    }

    @Transactional
    public CompanyDetailDto.ActivityDto addManualActivity(Long companyId, AddActivityRequest req) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with ID: " + companyId));

        Activity activity = Activity.builder()
                .company(company)
                .activityType(req.getActivityType().trim().toUpperCase(Locale.ROOT))
                .platform(req.getPlatform() != null ? req.getPlatform().trim() : "Direct")
                .eventTimestamp(req.getEventTimestamp() != null ? req.getEventTimestamp() : LocalDateTime.now())
                .title(req.getTitle().trim())
                .description(req.getDescription() != null ? req.getDescription().trim() : null)
                .outcome(req.getOutcome() != null ? req.getOutcome().trim() : null)
                .isAutomatic(false)
                .build();

        Activity saved = activityRepository.save(activity);
        company.addActivity(saved);

        return mapActivityToDto(saved);
    }

    @Transactional
    public CompanyDetailDto.ActivityDto updateActivityDescription(Long companyId, Long activityId, ActivityUpdateDescriptionRequest req) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found with ID: " + activityId));

        if (!activity.getCompany().getId().equals(companyId)) {
            throw new IllegalArgumentException("Activity does not belong to specified company");
        }

        activity.setDescription(req.getDescription() != null ? req.getDescription().trim() : "");
        Activity updated = activityRepository.save(activity);

        return mapActivityToDto(updated);
    }

    private void recordAutomaticActivity(Company company, String type, String platform, String title, String description) {
        Activity act = Activity.builder()
                .company(company)
                .activityType(type)
                .platform(platform)
                .eventTimestamp(LocalDateTime.now())
                .title(title)
                .description(description)
                .isAutomatic(true)
                .build();
        activityRepository.save(act);
    }

    private void saveReusablePlatformIfNew(String platform) {
        if (platform == null || platform.isBlank()) return;
        String norm = NormalizationUtil.normalizePlatformName(platform);
        if (settingSourceRepository.findByNormalizedName(norm).isEmpty()) {
            SettingSource ss = SettingSource.builder()
                    .name(platform.trim())
                    .normalizedName(norm)
                    .isDefault(false)
                    .build();
            settingSourceRepository.save(ss);
        }
    }

    public CompanyDetailDto mapToDetailDto(Company c) {
        List<CompanySource> sources = companySourceRepository.findByCompanyId(c.getId());
        List<FollowUp> followUps = followUpRepository.findByCompanyIdOrderByScheduledDateAsc(c.getId());
        List<Activity> activities = activityRepository.findByCompanyIdOrderByEventTimestampDesc(c.getId());

        // Find current active scheduled follow-up
        FollowUp activeFollowUp = followUps.stream()
                .filter(f -> f.getStatus() == FollowUpStatus.SCHEDULED)
                .findFirst()
                .orElse(null);

        String urgency = "NO_DATE";
        LocalDate nextDate = null;
        String nextReason = null;
        Long activeId = null;

        if (activeFollowUp != null) {
            urgency = activeFollowUp.getUrgencyStatus();
            nextDate = activeFollowUp.getScheduledDate();
            nextReason = activeFollowUp.getReason();
            activeId = activeFollowUp.getId();
        } else {
            // Check if last follow-up was completed
            boolean hasCompleted = followUps.stream().anyMatch(f -> f.getStatus() == FollowUpStatus.COMPLETED);
            if (hasCompleted) {
                urgency = "COMPLETED";
            }
        }

        String primSource = sources.isEmpty() ? "Direct" : sources.get(0).getPlatformName();
        String primSourceUrl = sources.isEmpty() ? c.getOfficialWebsite() : sources.get(0).getSourceUrl();

        List<CompanyContact> contacts = contactRepository.findByCompanyIdOrderByCreatedAtAsc(c.getId());
        List<CompanyContactDto> contactDtos = contacts.stream()
                .map(contactService::mapToContactDto)
                .collect(Collectors.toList());

        return CompanyDetailDto.builder()
                .id(c.getId())
                .name(c.getName())
                .officialWebsite(c.getOfficialWebsite())
                .contactPerson(c.getContactPerson())
                .email(c.getEmail())
                .phone(c.getPhone())
                .status(c.getStatus().name())
                .statusDisplayName(c.getStatus().getDisplayName())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .activeFollowUpId(activeId)
                .nextFollowUpDate(nextDate)
                .nextFollowUpReason(nextReason)
                .followUpUrgency(urgency)
                .primarySource(primSource)
                .primarySourceUrl(primSourceUrl)
                .contactsCount(contactDtos.size())
                .contacts(contactDtos)
                .sources(sources.stream().map(s -> CompanyDetailDto.SourceDto.builder()
                        .id(s.getId())
                        .platformName(s.getPlatformName())
                        .sourceUrl(s.getSourceUrl())
                        .notes(s.getNotes())
                        .createdAt(s.getCreatedAt())
                        .build()).collect(Collectors.toList()))
                .followUps(followUps.stream().map(f -> CompanyDetailDto.FollowUpDto.builder()
                        .id(f.getId())
                        .companyId(c.getId())
                        .companyName(c.getName())
                        .scheduledDate(f.getScheduledDate())
                        .reason(f.getReason())
                        .status(f.getStatus().name())
                        .statusDisplayName(f.getStatus().getDisplayName())
                        .isCompleted(f.getStatus() == FollowUpStatus.COMPLETED)
                        .completedAt(f.getCompletedAt())
                        .urgency(f.getUrgencyStatus())
                        .createdAt(f.getCreatedAt())
                        .build()).collect(Collectors.toList()))
                .activities(activities.stream().map(this::mapActivityToDto).collect(Collectors.toList()))
                .build();
    }

    private CompanyDetailDto.ActivityDto mapActivityToDto(Activity a) {
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

    /**
     * Deletes a specific company and its associated records cleanly (activities, contacts, follow-ups, sources).
     * Guarantees zero orphaned records and strictly isolates deletion to the target company ID.
     *
     * @param id the ID of the company to delete
     * @throws NoSuchElementException if the company does not exist
     */
    @Transactional
    public void deleteCompany(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Company not found with id: " + id));

        // 1. Delete dependent activities belonging to this company first
        List<Activity> activities = activityRepository.findByCompanyIdOrderByEventTimestampDesc(id);
        if (!activities.isEmpty()) {
            activityRepository.deleteAll(activities);
        }

        // 2. Delete contacts belonging to this company
        List<CompanyContact> contacts = contactRepository.findByCompanyIdOrderByCreatedAtAsc(id);
        if (!contacts.isEmpty()) {
            contactRepository.deleteAll(contacts);
        }

        // 3. Delete follow-ups belonging to this company
        List<FollowUp> followUps = followUpRepository.findByCompanyIdOrderByScheduledDateAsc(id);
        if (!followUps.isEmpty()) {
            followUpRepository.deleteAll(followUps);
        }

        // 4. Delete company sources belonging to this company
        List<CompanySource> sources = companySourceRepository.findByCompanyId(id);
        if (!sources.isEmpty()) {
            companySourceRepository.deleteAll(sources);
        }

        // 5. Delete the parent company record
        companyRepository.delete(company);
    }
}
