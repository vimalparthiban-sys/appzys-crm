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
public class AiContactCreateRequest {
    @NotBlank(message = "Contact name is required")
    private String name;

    private String role;
    private String email;
    private String phone;
    private String linkedinUrl;
}
