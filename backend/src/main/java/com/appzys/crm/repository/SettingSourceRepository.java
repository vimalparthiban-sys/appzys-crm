package com.appzys.crm.repository;

import com.appzys.crm.model.SettingSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SettingSourceRepository extends JpaRepository<SettingSource, Long> {

    Optional<SettingSource> findByNormalizedName(String normalizedName);

    List<SettingSource> findAllByOrderByNameAsc();
}
