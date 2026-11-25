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
public class AiActivityCreateRequest {
    @NotBlank(message = "Activity type is required (e.g. CALL, EMAIL, MEETING, NOTE)")
    private String type;

    @NotBlank(message = "Activity description is required")
    private String description;
}
