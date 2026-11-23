package com.appzys.crm.repository;

import com.appzys.crm.model.CompanySource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompanySourceRepository extends JpaRepository<CompanySource, Long> {

    List<CompanySource> findByCompanyId(Long companyId);

    List<CompanySource> findByNormalizedSourceUrl(String normalizedSourceUrl);

    @Query("SELECT s.platformName, COUNT(s) FROM CompanySource s GROUP BY s.platformName ORDER BY COUNT(s) DESC")
    List<Object[]> countSourcesByPlatform();
}
