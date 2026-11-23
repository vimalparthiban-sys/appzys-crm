package com.appzys.crm.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "follow_ups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FollowUp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonBackReference
    private Company company;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private FollowUpStatus status = FollowUpStatus.SCHEDULED;

    @Column(name = "is_completed", nullable = false)
    @Builder.Default
    private Boolean isCompleted = false;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public String getUrgencyStatus() {
        if (status == FollowUpStatus.COMPLETED) {
            return "COMPLETED";
        }
        if (status == FollowUpStatus.RESCHEDULED) {
            return "RESCHEDULED";
        }
        if (status == FollowUpStatus.CANCELLED) {
            return "CANCELLED";
        }
        if (scheduledDate == null) {
            return "NO_DATE";
        }
        LocalDate today = LocalDate.now();
        if (scheduledDate.isBefore(today)) {
            return "OVERDUE";
        } else if (scheduledDate.isEqual(today)) {
            return "TODAY";
        } else {
            return "UPCOMING";
        }
    }
}
