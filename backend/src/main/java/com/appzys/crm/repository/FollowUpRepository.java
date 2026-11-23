package com.appzys.crm.repository;

import com.appzys.crm.model.FollowUp;
import com.appzys.crm.model.FollowUpStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface FollowUpRepository extends JpaRepository<FollowUp, Long> {

    List<FollowUp> findByCompanyIdOrderByScheduledDateAsc(Long companyId);

    // Active uncompleted & non-rescheduled/cancelled follow-up
    Optional<FollowUp> findFirstByCompanyIdAndStatusOrderByScheduledDateAsc(Long companyId, FollowUpStatus status);

    // Follow-ups today (Scheduled only)
    List<FollowUp> findByScheduledDateAndStatusOrderByCompany_NameAsc(LocalDate date, FollowUpStatus status);

    // Overdue follow-ups (Scheduled only)
    @Query("SELECT f FROM FollowUp f WHERE f.scheduledDate < :today AND f.status = 'SCHEDULED' ORDER BY f.scheduledDate ASC")
    List<FollowUp> findOverdueFollowUps(@Param("today") LocalDate today);

    // Upcoming follow-ups (Scheduled only)
    @Query("SELECT f FROM FollowUp f WHERE f.scheduledDate > :today AND f.status = 'SCHEDULED' ORDER BY f.scheduledDate ASC")
    List<FollowUp> findUpcomingFollowUps(@Param("today") LocalDate today);

    // Counts (Scheduled only)
    long countByScheduledDateAndStatus(LocalDate date, FollowUpStatus status);

    @Query("SELECT COUNT(f) FROM FollowUp f WHERE f.scheduledDate < :today AND f.status = 'SCHEDULED'")
    long countOverdue(@Param("today") LocalDate today);
}
