package com.appzys.crm.repository;

import com.appzys.crm.model.CompanyContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyContactRepository extends JpaRepository<CompanyContact, Long> {
    List<CompanyContact> findByCompanyIdOrderByCreatedAtAsc(Long companyId);
    Optional<CompanyContact> findByIdAndCompanyId(Long id, Long companyId);
    int countByCompanyId(Long companyId);
}
