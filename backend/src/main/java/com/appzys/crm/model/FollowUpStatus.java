package com.appzys.crm.model;

public enum FollowUpStatus {
    SCHEDULED("Scheduled"),
    COMPLETED("Completed"),
    RESCHEDULED("Rescheduled"),
    CANCELLED("Cancelled");

    private final String displayName;

    FollowUpStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
