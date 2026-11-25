package com.appzys.crm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "crm_auth_invites")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false, length = 32)
    private String memberId;

    @Column(name = "member_name", nullable = false, length = 64)
    private String memberName;

    @Column(name = "invite_hash", nullable = false, unique = true, length = 64)
    private String inviteHash;

    @Column(name = "pin_hash", nullable = false, length = 100)
    private String pinHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "is_consumed", nullable = false)
    @Builder.Default
    private Boolean isConsumed = false;

    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
