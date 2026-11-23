package com.appzys.crm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AddSourceRequest {
    @NotBlank(message = "Platform name is required")
    private String platformName;
    private String sourceUrl;
    private String notes;
}
