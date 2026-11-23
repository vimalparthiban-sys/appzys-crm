package com.appzys.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyContactDto {
    private Long id;
    private Long companyId;
    private String personName;
    private String designation;
    private String email;
    private String phone;
    private String linkedinUrl;
    private String status;
    private String statusDisplayName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int activitiesCount;
}
