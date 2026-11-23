package com.appzys.crm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CompanyContactUpdateRequest {
    @NotBlank(message = "Person name is required")
    private String personName;
    private String designation;
    private String email;
    private String phone;
    private String linkedinUrl;
}
