package com.appzys.crm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CompanyContactCreateRequest {
    @NotBlank(message = "Person name is required")
    private String personName;
    private String designation;
    private String email;
    private String phone;
    private String linkedinUrl;
    private String initialStatus; // optional, defaults to FOUND
}
