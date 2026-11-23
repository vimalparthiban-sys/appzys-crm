package com.appzys.crm.service;

import com.appzys.crm.dto.ReportSummaryDto;
import com.appzys.crm.model.Company;
import com.appzys.crm.model.CompanySource;
import com.appzys.crm.model.LeadStatus;
import com.appzys.crm.repository.ActivityRepository;
import com.appzys.crm.repository.CompanyRepository;
import com.appzys.crm.repository.CompanySourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final CompanyRepository companyRepository;
    private final CompanySourceRepository companySourceRepository;
    private final ActivityRepository activityRepository;

    private static final DateTimeFormatter MONTH_LABEL_FMT = DateTimeFormatter.ofPattern("MMM yyyy");

    @Transactional(readOnly = true)
    public ReportSummaryDto getReportSummary(String filter, LocalDate customStart, LocalDate customEnd) {
        // 1. Determine effective date range
        LocalDate startDate = null;
        LocalDate endDate = null;
        String appliedFilter = filter != null ? filter.trim().toUpperCase() : "ALL";

        LocalDate today = LocalDate.now();

        switch (appliedFilter) {
            case "7_DAYS":
                startDate = today.minusDays(6);
                endDate = today;
                break;
            case "30_DAYS":
                startDate = today.minusDays(29);
                endDate = today;
                break;
            case "THIS_MONTH":
                startDate = today.withDayOfMonth(1);
                endDate = today;
                break;
            case "THIS_YEAR":
                startDate = today.withDayOfYear(1);
                endDate = today;
                break;
            case "CUSTOM":
                startDate = customStart;
                endDate = customEnd;
                break;
            case "ALL":
            default:
                appliedFilter = "ALL";
                break;
        }

        LocalDateTime rangeStart = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime rangeEnd = endDate != null ? endDate.atTime(LocalTime.MAX) : null;

        // 2. Fetch companies matching date range
        List<Company> companies;
        if (rangeStart != null && rangeEnd != null) {
            companies = companyRepository.findByCreatedAtBetween(rangeStart, rangeEnd);
        } else {
            companies = companyRepository.findAllOrderByCreatedAtAsc();
        }

        long totalUniqueLeads = companies.size();

        // 3. Count status occurrences safely
        Map<LeadStatus, Long> countsByStatus = new EnumMap<>(LeadStatus.class);
        for (LeadStatus st : LeadStatus.values()) {
            countsByStatus.put(st, 0L);
        }
        for (Company c : companies) {
            if (c.getStatus() != null) {
                countsByStatus.put(c.getStatus(), countsByStatus.getOrDefault(c.getStatus(), 0L) + 1);
            }
        }

        long convertedCompanies = countsByStatus.get(LeadStatus.CONVERTED);
        long foundCount = countsByStatus.get(LeadStatus.FOUND);
        long contactedCount = countsByStatus.get(LeadStatus.CONTACTED);
        long replyCount = countsByStatus.get(LeadStatus.REPLY_RECEIVED);
        long interestedCount = countsByStatus.get(LeadStatus.INTERESTED);
        long meetingCount = countsByStatus.get(LeadStatus.MEETING);
        long noReplyCount = countsByStatus.get(LeadStatus.NO_REPLY);
        long rejectedCount = countsByStatus.get(LeadStatus.REJECTED);

        // Overall conversion rate: (Converted / Total Leads) * 100
        double overallConversionRate = totalUniqueLeads > 0
                ? Math.round(((double) convertedCompanies / totalUniqueLeads) * 1000.0) / 10.0
                : 0.0;

        // Reply rate: (Replies + Interested + Meeting + Converted) / (Contacted + Replies + Interested + Meeting + Converted + No Reply)
        long totalContactedAndBeyond = contactedCount + replyCount + interestedCount + meetingCount + convertedCompanies + noReplyCount;
        double replyRate = 0.0;
        if (totalContactedAndBeyond > 0) {
            long totalResponses = replyCount + interestedCount + meetingCount + convertedCompanies;
            replyRate = Math.round(((double) totalResponses / totalContactedAndBeyond) * 1000.0) / 10.0;
        }

        // 4. Funnel Stages (Progression: Found -> Contacted -> Reply Received -> Interested -> Meeting -> Converted)
        List<ReportSummaryDto.FunnelStageDto> funnelStages = new ArrayList<>();
        funnelStages.add(buildFunnelStage("FOUND", "Found", foundCount, totalUniqueLeads, 0, "bg-indigo-600"));
        funnelStages.add(buildFunnelStage("CONTACTED", "Contacted", contactedCount, totalUniqueLeads, foundCount, "bg-sky-500"));
        funnelStages.add(buildFunnelStage("REPLY_RECEIVED", "Reply Received", replyCount, totalUniqueLeads, contactedCount, "bg-purple-600"));
        funnelStages.add(buildFunnelStage("INTERESTED", "Interested", interestedCount, totalUniqueLeads, replyCount, "bg-teal-500"));
        funnelStages.add(buildFunnelStage("MEETING", "Meeting", meetingCount, totalUniqueLeads, interestedCount, "bg-cyan-600"));
        funnelStages.add(buildFunnelStage("CONVERTED", "Converted", convertedCompanies, totalUniqueLeads, meetingCount, "bg-emerald-600"));

        // 5. Source Channel Performance
        // Group unique companies by source platforms
        Map<String, Long> sourceTotalCounts = new LinkedHashMap<>();
        Map<String, Long> sourceConvertedCounts = new LinkedHashMap<>();

        for (Company c : companies) {
            boolean isConverted = c.getStatus() == LeadStatus.CONVERTED;
            Set<String> distinctPlatformsForCompany = new HashSet<>();

            if (c.getSources() != null && !c.getSources().isEmpty()) {
                for (CompanySource s : c.getSources()) {
                    String platform = (s.getPlatformName() != null && !s.getPlatformName().trim().isEmpty())
                            ? s.getPlatformName().trim()
                            : "Other";
                    distinctPlatformsForCompany.add(platform);
                }
            } else {
                distinctPlatformsForCompany.add("Other");
            }

            for (String platform : distinctPlatformsForCompany) {
                sourceTotalCounts.put(platform, sourceTotalCounts.getOrDefault(platform, 0L) + 1);
                if (isConverted) {
                    sourceConvertedCounts.put(platform, sourceConvertedCounts.getOrDefault(platform, 0L) + 1);
                }
            }
        }

        List<ReportSummaryDto.SourcePerformanceDto> sourcePerformanceList = new ArrayList<>();
        String topChannel = "None";
        long maxLeads = -1;

        for (Map.Entry<String, Long> entry : sourceTotalCounts.entrySet()) {
            String platform = entry.getKey();
            long count = entry.getValue();
            long converted = sourceConvertedCounts.getOrDefault(platform, 0L);
            double convRate = count > 0 ? Math.round(((double) converted / count) * 1000.0) / 10.0 : 0.0;

            if (count > maxLeads) {
                maxLeads = count;
                topChannel = platform;
            }

            sourcePerformanceList.add(ReportSummaryDto.SourcePerformanceDto.builder()
                    .platformName(platform)
                    .totalLeads(count)
                    .convertedLeads(converted)
                    .conversionRate(convRate)
                    .build());
        }

        // Sort sources by highest lead volume
        sourcePerformanceList.sort((a, b) -> Long.compare(b.getTotalLeads(), a.getTotalLeads()));

        // 6. Monthly Lead Acquisition Trend
        // Using actual createdAt dates
        Map<YearMonth, Long> monthlyCounts = new TreeMap<>();
        for (Company c : companies) {
            if (c.getCreatedAt() != null) {
                YearMonth ym = YearMonth.from(c.getCreatedAt());
                monthlyCounts.put(ym, monthlyCounts.getOrDefault(ym, 0L) + 1);
            }
        }

        List<ReportSummaryDto.MonthlyTrendDto> monthlyTrendList = new ArrayList<>();
        for (Map.Entry<YearMonth, Long> entry : monthlyCounts.entrySet()) {
            monthlyTrendList.add(ReportSummaryDto.MonthlyTrendDto.builder()
                    .monthKey(entry.getKey().toString())
                    .monthLabel(entry.getKey().format(MONTH_LABEL_FMT))
                    .leadCount(entry.getValue())
                    .build());
        }

        // 7. Pipeline Distribution across all 8 statuses
        List<ReportSummaryDto.PipelineDistributionDto> pipelineDistributionList = new ArrayList<>();
        pipelineDistributionList.add(buildStatusDist("FOUND", "Found", foundCount, totalUniqueLeads, "bg-indigo-500 text-white"));
        pipelineDistributionList.add(buildStatusDist("CONTACTED", "Contacted", contactedCount, totalUniqueLeads, "bg-sky-500 text-white"));
        pipelineDistributionList.add(buildStatusDist("REPLY_RECEIVED", "Reply Received", replyCount, totalUniqueLeads, "bg-purple-500 text-white"));
        pipelineDistributionList.add(buildStatusDist("INTERESTED", "Interested", interestedCount, totalUniqueLeads, "bg-teal-500 text-white"));
        pipelineDistributionList.add(buildStatusDist("MEETING", "Meeting", meetingCount, totalUniqueLeads, "bg-cyan-500 text-white"));
        pipelineDistributionList.add(buildStatusDist("CONVERTED", "Converted", convertedCompanies, totalUniqueLeads, "bg-emerald-500 text-white"));
        pipelineDistributionList.add(buildStatusDist("NO_REPLY", "No Reply", noReplyCount, totalUniqueLeads, "bg-gray-400 text-white"));
        pipelineDistributionList.add(buildStatusDist("REJECTED", "Rejected", rejectedCount, totalUniqueLeads, "bg-rose-500 text-white"));

        // 8. Outreach Activity Summary
        List<Object[]> rawActivities;
        if (rangeStart != null && rangeEnd != null) {
            rawActivities = activityRepository.countActivitiesByTypeBetween(rangeStart, rangeEnd);
        } else {
            rawActivities = activityRepository.countActivitiesByType();
        }

        Map<String, Long> actCounts = new HashMap<>();
        for (Object[] row : rawActivities) {
            if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                String type = row[0].toString();
                long c = ((Number) row[1]).longValue();
                actCounts.put(type, c);
            }
        }

        List<ReportSummaryDto.ActivitySummaryDto> activitySummaryList = new ArrayList<>();
        activitySummaryList.add(buildActivitySummary("CALL", "Calls Logged", actCounts.getOrDefault("CALL", 0L), "Phone"));
        activitySummaryList.add(buildActivitySummary("EMAIL", "Emails Sent", actCounts.getOrDefault("EMAIL", 0L), "Mail"));
        activitySummaryList.add(buildActivitySummary("MESSAGE", "Direct Messages", actCounts.getOrDefault("MESSAGE", 0L), "MessageSquare"));
        activitySummaryList.add(buildActivitySummary("MEETING", "Client Meetings", actCounts.getOrDefault("MEETING", 0L), "Video"));
        activitySummaryList.add(buildActivitySummary("REPLY", "Prospect Replies", actCounts.getOrDefault("REPLY", 0L), "CornerDownLeft"));
        activitySummaryList.add(buildActivitySummary("OTHER", "Other Activities", actCounts.getOrDefault("OTHER", 0L), "FileText"));

        return ReportSummaryDto.builder()
                .totalUniqueLeads(totalUniqueLeads)
                .totalConvertedCompanies(convertedCompanies)
                .overallConversionRate(overallConversionRate)
                .totalContacted(contactedCount)
                .replyRate(replyRate)
                .topPerformingChannel(topChannel)
                .dateFilter(appliedFilter)
                .startDate(startDate != null ? startDate.toString() : null)
                .endDate(endDate != null ? endDate.toString() : null)
                .funnelStages(funnelStages)
                .sourcePerformance(sourcePerformanceList)
                .monthlyTrends(monthlyTrendList)
                .pipelineDistribution(pipelineDistributionList)
                .activitySummary(activitySummaryList)
                .build();
    }

    private ReportSummaryDto.FunnelStageDto buildFunnelStage(String key, String label, long count, long total, long prevCount, String color) {
        double pctOfTotal = total > 0 ? Math.round(((double) count / total) * 1000.0) / 10.0 : 0.0;
        double convFromPrev = prevCount > 0 ? Math.round(((double) count / prevCount) * 1000.0) / 10.0 : 0.0;
        return ReportSummaryDto.FunnelStageDto.builder()
                .stageKey(key)
                .stageLabel(label)
                .count(count)
                .percentageOfTotal(pctOfTotal)
                .conversionFromPrevious(convFromPrev)
                .color(color)
                .build();
    }

    private ReportSummaryDto.PipelineDistributionDto buildStatusDist(String key, String label, long count, long total, String badgeColor) {
        double pct = total > 0 ? Math.round(((double) count / total) * 1000.0) / 10.0 : 0.0;
        return ReportSummaryDto.PipelineDistributionDto.builder()
                .statusKey(key)
                .statusLabel(label)
                .count(count)
                .percentage(pct)
                .badgeColor(badgeColor)
                .build();
    }

    private ReportSummaryDto.ActivitySummaryDto buildActivitySummary(String type, String label, long count, String iconName) {
        return ReportSummaryDto.ActivitySummaryDto.builder()
                .activityType(type)
                .label(label)
                .count(count)
                .iconName(iconName)
                .build();
    }
}
