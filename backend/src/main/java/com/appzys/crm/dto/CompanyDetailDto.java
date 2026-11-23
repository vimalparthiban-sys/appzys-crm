package com.appzys.crm.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CompanyDetailDto {
    private Long id;
    private String name;
    private String officialWebsite;
    private String contactPerson;
    private String email;
    private String phone;
    private String status;
    private String statusDisplayName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Active / upcoming follow-up summary
    private Long activeFollowUpId;
    private LocalDate nextFollowUpDate;
    private String nextFollowUpReason;
    private String followUpUrgency; // UPCOMING, TODAY, OVERDUE, NO_DATE, COMPLETED

    // Primary or last added source
    private String primarySource;
    private String primarySourceUrl;

    private List<SourceDto> sources;
    private List<FollowUpDto> followUps;
    private List<ActivityDto> activities;
    private int contactsCount;
    private List<CompanyContactDto> contacts;

    @Data
    @Builder
    public static class SourceDto {
        private Long id;
        private String platformName;
        private String sourceUrl;
        private String notes;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class FollowUpDto {
        private Long id;
        private Long companyId;
        private String companyName;
        private LocalDate scheduledDate;
        private String reason;
        private String status; // SCHEDULED, COMPLETED, RESCHEDULED, CANCELLED
        private String statusDisplayName;
        private Boolean isCompleted;
        private LocalDateTime completedAt;
        private String urgency;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class ActivityDto {
        private Long id;
        private String activityType;
        private String platform;
        private LocalDateTime eventTimestamp;
        private String title;
        private String description;
        private String outcome;
        private Boolean isAutomatic;
        private Long contactId;
        private String contactPersonName;
        private LocalDateTime createdAt;
    }
}
