package com.appzys.crm.controller;

import com.appzys.crm.model.SettingSource;
import com.appzys.crm.repository.SettingSourceRepository;
import com.appzys.crm.util.NormalizationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings/sources")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingSourceRepository settingSourceRepository;

    @GetMapping
    public ResponseEntity<List<SettingSource>> getAllSources() {
        return ResponseEntity.ok(settingSourceRepository.findAllByOrderByNameAsc());
    }

    @PostMapping
    public ResponseEntity<?> addSource(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body("Source name cannot be blank");
        }
        String norm = NormalizationUtil.normalizePlatformName(name);
        if (settingSourceRepository.findByNormalizedName(norm).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Source already exists");
        }

        SettingSource source = SettingSource.builder()
                .name(name.trim())
                .normalizedName(norm)
                .isDefault(false)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(settingSourceRepository.save(source));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSource(@PathVariable Long id) {
        settingSourceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
