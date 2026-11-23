package com.appzys.crm.model;

public enum LeadStatus {
    FOUND("Found"),
    CONTACTED("Contacted"),
    REPLY_RECEIVED("Reply Received"),
    INTERESTED("Interested"),
    MEETING("Meeting"),
    CONVERTED("Converted"),
    NO_REPLY("No Reply"),
    REJECTED("Rejected");

    private final String displayName;

    LeadStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
