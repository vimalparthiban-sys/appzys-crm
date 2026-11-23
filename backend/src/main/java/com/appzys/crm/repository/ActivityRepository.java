package com.appzys.crm.repository;

import com.appzys.crm.model.Activity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {

    List<Activity> findByCompanyIdOrderByEventTimestampDesc(Long companyId);

    List<Activity> findByContactIdOrderByEventTimestampDesc(Long contactId);

    List<Activity> findByOrderByEventTimestampDesc(Pageable pageable);

    @Query("SELECT a.activityType, COUNT(a) FROM Activity a GROUP BY a.activityType")
    List<Object[]> countActivitiesByType();

    @Query("SELECT a.activityType, COUNT(a) FROM Activity a WHERE a.eventTimestamp >= :start AND a.eventTimestamp <= :end GROUP BY a.activityType")
    List<Object[]> countActivitiesByTypeBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
