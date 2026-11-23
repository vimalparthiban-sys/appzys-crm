package com.appzys.crm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AddPersonActivityRequest {
    @NotBlank(message = "Activity type is required")
    private String activityType; // CALL, EMAIL, MESSAGE, MEETING, REPLY, OTHER
    private String platform;     // Phone, Laptop, Tablet, WhatsApp, LinkedIn, etc.
    private LocalDate activityDate; // defaults to today if null
    private String description;
}
