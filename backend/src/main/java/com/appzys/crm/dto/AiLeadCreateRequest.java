package com.appzys.crm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiLeadCreateRequest {
    @NotBlank(message = "Company name is required")
    private String name;

    @NotBlank(message = "Official website URL is required")
    private String officialWebsite;

    private String contactPerson;
    private String email;
    private String phone;
    private String source; // e.g. "LinkedIn" or "Company Website"
    private String notes;
    private String status; // Optional initial status, defaults to FOUND
    private String nextFollowUpDate;
    private String followUpReason;
}
