package com.appzys.crm.repository;

import com.appzys.crm.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, String> {

    Optional<Employee> findByMemberIdAndStatus(String memberId, String status);

    List<Employee> findAllByOrderByMemberIdAsc();

    @Modifying
    @Query("UPDATE Employee e SET e.status = 'REVOKED', e.revokedAt = :now, e.updatedAt = :now WHERE e.memberId = :memberId")
    int revokeEmployee(@Param("memberId") String memberId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE Employee e SET e.status = 'ACTIVE', e.revokedAt = null, e.updatedAt = :now WHERE e.memberId = :memberId")
    int restoreEmployee(@Param("memberId") String memberId, @Param("now") LocalDateTime now);
}
