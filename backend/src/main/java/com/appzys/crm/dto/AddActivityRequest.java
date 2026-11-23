package com.appzys.crm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AddActivityRequest {
    @NotBlank(message = "Activity type is required")
    private String activityType; // Call, Email, Message, Meeting, Reply, Other
    private String platform;
    private LocalDateTime eventTimestamp;
    @NotBlank(message = "Title / Description is required")
    private String title;
    private String description;
    private String outcome;
}
