package com.appzys.crm.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DuplicateCheckResponse {
    private boolean duplicateFound;
    private String reason; // e.g. "NAME_MATCH", "OFFICIAL_URL_MATCH", "SOURCE_URL_MATCH"
    private List<PotentialDuplicateSummary> matchingCompanies;

    @Data
    @Builder
    public static class PotentialDuplicateSummary {
        private Long id;
        private String name;
        private String officialWebsite;
        private String status;
        private String contactPerson;
        private String email;
        private List<String> existingSources;
    }
}
