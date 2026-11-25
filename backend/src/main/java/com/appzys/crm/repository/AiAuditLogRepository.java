package com.appzys.crm.repository;

import com.appzys.crm.model.AiAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiAuditLogRepository extends JpaRepository<AiAuditLog, Long> {
    List<AiAuditLog> findTop50ByOrderByCreatedAtDesc();
    List<AiAuditLog> findByAgentIdOrderByCreatedAtDesc(String agentId);
}
