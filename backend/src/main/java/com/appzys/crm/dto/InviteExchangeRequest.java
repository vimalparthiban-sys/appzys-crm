package com.appzys.crm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteExchangeRequest {
    @NotBlank(message = "Invitation code is required")
    private String inviteCode;

    @NotBlank(message = "6-digit activation PIN is required")
    private String pin;
}
