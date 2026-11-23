package com.appzys.crm.service;

import com.appzys.crm.dto.CompanyDetailDto;
import com.appzys.crm.dto.DashboardOverviewDto;
import com.appzys.crm.model.Activity;
import com.appzys.crm.model.FollowUp;
import com.appzys.crm.model.FollowUpStatus;
import com.appzys.crm.model.LeadStatus;
import com.appzys.crm.repository.ActivityRepository;
import com.appzys.crm.repository.CompanyRepository;
import com.appzys.crm.repository.CompanySourceRepository;
import com.appzys.crm.repository.FollowUpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final CompanyRepository companyRepository;
    private final CompanySourceRepository companySourceRepository;
    private final FollowUpRepository followUpRepository;
    private final ActivityRepository activityRepository;
    private final CompanyService companyService;

    @Transactional(readOnly = true)
    public DashboardOverviewDto getDashboardOverview() {
        LocalDate today = LocalDate.now();

        long totalLeads = companyRepository.count();
        long contacted = companyRepository.countByStatus(LeadStatus.CONTACTED);
        
        // Active scheduled follow-ups only (Rescheduled/Cancelled/Completed are excluded)
        long followUpToday = followUpRepository.countByScheduledDateAndStatus(today, FollowUpStatus.SCHEDULED);
        long overdue = followUpRepository.countOverdue(today);
        long interested = companyRepository.countByStatus(LeadStatus.INTERESTED);
        long converted = companyRepository.countByStatus(LeadStatus.CONVERTED);

        // Pipeline breakdown
        Map<String, Long> pipelineMap = new LinkedHashMap<>();
        for (LeadStatus st : LeadStatus.values()) {
            pipelineMap.put(st.name(), 0L);
        }
        List<Object[]> statusCounts = companyRepository.countByAllStatuses();
        for (Object[] row : statusCounts) {
            LeadStatus st = (LeadStatus) row[0];
            Long count = (Long) row[1];
            pipelineMap.put(st.name(), count);
        }

        // Leads by Source
        List<Object[]> sourceRows = companySourceRepository.countSourcesByPlatform();
        long totalSourcesCount = sourceRows.stream().mapToLong(r -> (Long) r[1]).sum();

        String[] palette = {"#6D42D8", "#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#64748B"};
        List<DashboardOverviewDto.SourceStat> sourceStats = new ArrayList<>();
        int colorIdx = 0;
        for (Object[] row : sourceRows) {
            String platform = (String) row[0];
            long count = (Long) row[1];
            double pct = totalSourcesCount > 0 ? ((double) count / totalSourcesCount) * 100.0 : 0.0;
            sourceStats.add(DashboardOverviewDto.SourceStat.builder()
                    .platform(platform)
                    .count(count)
                    .percentage(Math.round(pct * 10.0) / 10.0)
                    .color(palette[colorIdx % palette.length])
                    .build());
            colorIdx++;
        }

        // Active follow-ups lists (Scheduled only)
        List<FollowUp> todayList = followUpRepository.findByScheduledDateAndStatusOrderByCompany_NameAsc(today, FollowUpStatus.SCHEDULED);
        List<FollowUp> overdueList = followUpRepository.findOverdueFollowUps(today);
        List<FollowUp> upcomingList = followUpRepository.findUpcomingFollowUps(today);

        // Recent leads (top 5)
        List<CompanyDetailDto> recentLeads = companyRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .limit(5)
                .map(companyService::mapToDetailDto)
                .collect(Collectors.toList());

        // Recent activities (top 6)
        List<Activity> recentActs = activityRepository.findByOrderByEventTimestampDesc(PageRequest.of(0, 6));
        List<CompanyDetailDto.ActivityDto> recentActivities = recentActs.stream()
                .map(a -> CompanyDetailDto.ActivityDto.builder()
                        .id(a.getId())
                        .activityType(a.getActivityType())
                        .platform(a.getPlatform())
                        .eventTimestamp(a.getEventTimestamp())
                        .title(a.getTitle())
                        .description(a.getDescription())
                        .outcome(a.getOutcome())
                        .isAutomatic(a.getIsAutomatic())
                        .createdAt(a.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return DashboardOverviewDto.builder()
                .totalLeads(totalLeads)
                .contacted(contacted)
                .followUpToday(followUpToday)
                .overdue(overdue)
                .interested(interested)
                .converted(converted)
                .totalLeadsChange("+12%")
                .contactedChange("+18%")
                .pipelineBreakdown(pipelineMap)
                .leadsBySource(sourceStats)
                .todayFollowUps(mapFollowUpsToDto(todayList))
                .overdueFollowUps(mapFollowUpsToDto(overdueList))
                .upcomingFollowUps(mapFollowUpsToDto(upcomingList))
                .recentLeads(recentLeads)
                .recentActivities(recentActivities)
                .build();
    }

    private List<CompanyDetailDto.FollowUpDto> mapFollowUpsToDto(List<FollowUp> list) {
        return list.stream().map(f -> CompanyDetailDto.FollowUpDto.builder()
                .id(f.getId())
                .companyId(f.getCompany() != null ? f.getCompany().getId() : null)
                .companyName(f.getCompany() != null ? f.getCompany().getName() : null)
                .scheduledDate(f.getScheduledDate())
                .reason(f.getReason())
                .status(f.getStatus().name())
                .statusDisplayName(f.getStatus().getDisplayName())
                .isCompleted(f.getStatus() == FollowUpStatus.COMPLETED)
                .urgency(f.getUrgencyStatus())
                .createdAt(f.getCreatedAt())
                .build()).collect(Collectors.toList());
    }
}
