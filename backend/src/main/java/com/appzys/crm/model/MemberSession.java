package com.appzys.crm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "crm_member_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberSession {

    @Id
    @Column(name = "session_id", length = 64)
    private String sessionId;

    @Column(name = "member_id", nullable = false, length = 32)
    private String memberId;

    @Column(name = "member_name", nullable = false, length = 64)
    private String memberName;

    @Column(name = "device_name", length = 100)
    private String deviceName;

    @Column(name = "is_permanent", nullable = false)
    @Builder.Default
    private Boolean isPermanent = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt; // Nullable for permanent sessions

    @UpdateTimestamp
    @Column(name = "last_active_at")
    private LocalDateTime lastActiveAt;

    @Column(name = "is_revoked", nullable = false)
    @Builder.Default
    private Boolean isRevoked = false;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;
}
