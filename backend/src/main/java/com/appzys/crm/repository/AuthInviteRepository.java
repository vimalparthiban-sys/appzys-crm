package com.appzys.crm.repository;

import com.appzys.crm.model.AuthInvite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AuthInviteRepository extends JpaRepository<AuthInvite, Long> {
    Optional<AuthInvite> findByInviteHashAndIsConsumedFalse(String inviteHash);
    List<AuthInvite> findByMemberId(String memberId);

    @Modifying
    @Query("UPDATE AuthInvite i SET i.isConsumed = true, i.consumedAt = :now WHERE i.inviteHash = :hash AND i.isConsumed = false")
    int consumeAtomic(@Param("hash") String hash, @Param("now") LocalDateTime now);
}
