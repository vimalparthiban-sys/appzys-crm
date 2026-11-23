package com.appzys.crm.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class DashboardOverviewDto {
    private long totalLeads;
    private long contacted;
    private long followUpToday;
    private long overdue;
    private long interested;
    private long converted;

    // Percentages / relative changes (mock/dynamic)
    private String totalLeadsChange;
    private String contactedChange;

    // Pipeline breakdown: status -> count
    private Map<String, Long> pipelineBreakdown;

    // Sources breakdown: platform -> count
    private List<SourceStat> leadsBySource;

    // Task lists for quick action
    private List<CompanyDetailDto.FollowUpDto> todayFollowUps;
    private List<CompanyDetailDto.FollowUpDto> overdueFollowUps;
    private List<CompanyDetailDto.FollowUpDto> upcomingFollowUps;

    // Recent leads & activities
    private List<CompanyDetailDto> recentLeads;
    private List<CompanyDetailDto.ActivityDto> recentActivities;

    @Data
    @Builder
    public static class SourceStat {
        private String platform;
        private long count;
        private double percentage;
        private String color;
    }
}
