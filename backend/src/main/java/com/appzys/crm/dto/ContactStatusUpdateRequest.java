package com.appzys.crm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ContactStatusUpdateRequest {
    @NotBlank(message = "Status is required")
    private String status;
}
