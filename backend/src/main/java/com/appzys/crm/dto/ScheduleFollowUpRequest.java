package com.appzys.crm.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ScheduleFollowUpRequest {
    @NotNull(message = "Scheduled date is required")
    private LocalDate scheduledDate;
    private String reason;
}
