package com.appzys.crm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class LeadCreateRequest {

    @NotBlank(message = "Company Name is required")
    private String name;

    @NotBlank(message = "Official Company URL is required")
    private String officialWebsite;

    @NotBlank(message = "Source Platform is required")
    private String sourcePlatform;

    private String sourceUrl;
    private String sourceNotes;
    private String contactPerson;
    private String email;
    private String phone;
    private LocalDate followUpDate;
    private String followUpReason;

    // Set to true if user chooses "Continue as New Company" despite duplicate warning
    private boolean forceCreate = false;
}
