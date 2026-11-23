package com.appzys.crm.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "activities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonBackReference(value = "company-activities")
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", nullable = true)
    @JsonBackReference(value = "contact-activities")
    private CompanyContact contact;

    @Column(name = "activity_type", nullable = false, length = 50)
    private String activityType; 
    // Types: LEAD_CREATED, STATUS_CHANGED, FOLLOWUP_SCHEDULED, FOLLOWUP_RESCHEDULED, FOLLOWUP_COMPLETED, CALL, EMAIL, MESSAGE, MEETING, REPLY, OTHER

    private String platform;

    @Column(name = "event_timestamp", nullable = false)
    @Builder.Default
    private LocalDateTime eventTimestamp = LocalDateTime.now();

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String outcome;

    @Column(name = "is_automatic", nullable = false)
    @Builder.Default
    private Boolean isAutomatic = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
