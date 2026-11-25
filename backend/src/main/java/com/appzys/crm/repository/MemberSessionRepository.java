package com.appzys.crm.repository;

import com.appzys.crm.model.MemberSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MemberSessionRepository extends JpaRepository<MemberSession, String> {
    
    Optional<MemberSession> findBySessionIdAndIsRevokedFalse(String sessionId);

    List<MemberSession> findByMemberIdAndIsRevokedFalse(String memberId);

    List<MemberSession> findByMemberIdOrderByCreatedAtDesc(String memberId);

    @Modifying
    @Query("UPDATE MemberSession s SET s.isRevoked = true, s.revokedAt = :now WHERE s.memberId = :memberId AND s.isRevoked = false")
    int revokeAllByMemberId(@Param("memberId") String memberId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE MemberSession s SET s.lastActiveAt = :now WHERE s.sessionId = :sessionId")
    void touchLastActive(@Param("sessionId") String sessionId, @Param("now") LocalDateTime now);
}
