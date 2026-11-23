package com.appzys.crm.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ActivityUpdateDescriptionRequest {
    @NotNull(message = "Description cannot be null")
    private String description;
}
