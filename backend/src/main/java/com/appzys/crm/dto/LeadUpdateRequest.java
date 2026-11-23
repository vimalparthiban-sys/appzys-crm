package com.appzys.crm.dto;

import com.appzys.crm.model.LeadStatus;
import lombok.Data;

@Data
public class LeadUpdateRequest {
    private String name;
    private String officialWebsite;
    private String contactPerson;
    private String email;
    private String phone;
    private LeadStatus status;
}
