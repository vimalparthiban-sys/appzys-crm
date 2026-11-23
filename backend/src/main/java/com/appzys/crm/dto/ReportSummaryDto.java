package com.appzys.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportSummaryDto {
    // 1. Top-level KPIs
    private long totalUniqueLeads;
    private long totalConvertedCompanies;
    private double overallConversionRate; // (Converted / Total) * 100
    private long totalContacted;
    private double replyRate; // (Reply Received + Interested + Meeting + Converted) / (Total Contacted and beyond) * 100
    private String topPerformingChannel;

    // Filter metadata
    private String dateFilter;
    private String startDate;
    private String endDate;

    // 2. Acquisition Funnel (6 main stages)
    private List<FunnelStageDto> funnelStages;

    // 3. Source Channel Performance
    private List<SourcePerformanceDto> sourcePerformance;

    // 4. Monthly Lead Acquisition Trend
    private List<MonthlyTrendDto> monthlyTrends;

    // 5. Pipeline Distribution (all 8 statuses)
    private List<PipelineDistributionDto> pipelineDistribution;

    // 6. Outreach Activity Summary
    private List<ActivitySummaryDto> activitySummary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FunnelStageDto {
        private String stageKey;
        private String stageLabel;
        private long count;
        private double percentageOfTotal;
        private double conversionFromPrevious;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SourcePerformanceDto {
        private String platformName;
        private long totalLeads;
        private long convertedLeads;
        private double conversionRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyTrendDto {
        private String monthKey;
        private String monthLabel;
        private long leadCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PipelineDistributionDto {
        private String statusKey;
        private String statusLabel;
        private long count;
        private double percentage;
        private String badgeColor;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivitySummaryDto {
        private String activityType;
        private String label;
        private long count;
        private String iconName;
    }
}
