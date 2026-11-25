package com.appzys.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteExchangeResponse {
    private boolean authenticated;
    private String token;
    private String memberId;
    private String memberName;
    private long expiresInSeconds;
    private String message;
}
