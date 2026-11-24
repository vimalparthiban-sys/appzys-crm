package com.appzys.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponseDto {
    private boolean authenticated;
    private String token;
    private String username;
    private long expiresInSeconds;
    private String message;
}
