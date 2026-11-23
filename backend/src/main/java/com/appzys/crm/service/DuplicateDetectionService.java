package com.appzys.crm.service;

import com.appzys.crm.dto.DuplicateCheckResponse;
import com.appzys.crm.model.Company;
import com.appzys.crm.model.CompanySource;
import com.appzys.crm.repository.CompanyRepository;
import com.appzys.crm.repository.CompanySourceRepository;
import com.appzys.crm.util.NormalizationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DuplicateDetectionService {

    private final CompanyRepository companyRepository;
    private final CompanySourceRepository companySourceRepository;

    @Transactional(readOnly = true)
    public DuplicateCheckResponse checkDuplicate(String companyName, String officialWebsite, String sourceUrl) {
        String normName = NormalizationUtil.normalizeCompanyName(companyName);
        String normWeb = NormalizationUtil.normalizeUrl(officialWebsite);
        String normSource = NormalizationUtil.normalizeUrl(sourceUrl);

        Set<Company> matchedCompanies = new LinkedHashSet<>();
        List<String> reasons = new ArrayList<>();

        // 1. Check exact or close normalized company name
        if (!normName.isEmpty()) {
            List<Company> byName = companyRepository.findByNormalizedName(normName);
            if (!byName.isEmpty()) {
                matchedCompanies.addAll(byName);
                reasons.add("Company name match ('" + companyName + "')");
            }
        }

        // 2. Check normalized official website URL
        if (!normWeb.isEmpty()) {
            List<Company> byWeb = companyRepository.findByNormalizedWebsite(normWeb);
            if (!byWeb.isEmpty()) {
                matchedCompanies.addAll(byWeb);
                reasons.add("Official website match ('" + officialWebsite + "')");
            }
        }

        // 3. Check normalized source URL if provided
        if (!normSource.isEmpty()) {
            List<CompanySource> bySource = companySourceRepository.findByNormalizedSourceUrl(normSource);
            for (CompanySource cs : bySource) {
                if (cs.getCompany() != null) {
                    matchedCompanies.add(cs.getCompany());
                    reasons.add("Source discovery URL already associated with an existing company");
                }
            }
        }

        if (matchedCompanies.isEmpty()) {
            return DuplicateCheckResponse.builder()
                    .duplicateFound(false)
                    .reason(null)
                    .matchingCompanies(Collections.emptyList())
                    .build();
        }

        List<DuplicateCheckResponse.PotentialDuplicateSummary> summaries = matchedCompanies.stream()
                .map(c -> DuplicateCheckResponse.PotentialDuplicateSummary.builder()
                        .id(c.getId())
                        .name(c.getName())
                        .officialWebsite(c.getOfficialWebsite())
                        .status(c.getStatus().name())
                        .contactPerson(c.getContactPerson())
                        .email(c.getEmail())
                        .existingSources(c.getSources() != null ? c.getSources().stream().map(CompanySource::getPlatformName).distinct().collect(Collectors.toList()) : Collections.emptyList())
                        .build())
                .collect(Collectors.toList());

        return DuplicateCheckResponse.builder()
                .duplicateFound(true)
                .reason(String.join("; ", reasons))
                .matchingCompanies(summaries)
                .build();
    }
}
