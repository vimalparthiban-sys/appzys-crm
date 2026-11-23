package com.appzys.crm.repository;

import com.appzys.crm.model.Company;
import com.appzys.crm.model.LeadStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long>, JpaSpecificationExecutor<Company> {

    List<Company> findByNormalizedName(String normalizedName);

    List<Company> findByNormalizedWebsite(String normalizedWebsite);

    long countByStatus(LeadStatus status);

    @Query("SELECT c FROM Company c WHERE c.normalizedName = :normName OR c.normalizedWebsite = :normUrl")
    List<Company> findPotentialDuplicates(@Param("normName") String normName, @Param("normUrl") String normUrl);

    @Query("SELECT c FROM Company c JOIN c.sources s WHERE s.normalizedSourceUrl = :normSourceUrl")
    List<Company> findBySourceUrlMatch(@Param("normSourceUrl") String normSourceUrl);

    @Query("SELECT c.status, COUNT(c) FROM Company c GROUP BY c.status")
    List<Object[]> countByAllStatuses();

    @Query("SELECT c.status, COUNT(c) FROM Company c WHERE c.createdAt >= :start AND c.createdAt <= :end GROUP BY c.status")
    List<Object[]> countByAllStatusesBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT c FROM Company c WHERE c.createdAt >= :start AND c.createdAt <= :end ORDER BY c.createdAt ASC")
    List<Company> findByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT c FROM Company c ORDER BY c.createdAt ASC")
    List<Company> findAllOrderByCreatedAtAsc();

    List<Company> findTop10ByOrderByCreatedAtDesc();
}
