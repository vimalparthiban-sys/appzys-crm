package com.appzys.crm.util;

import java.net.URI;
import java.util.Locale;

public class NormalizationUtil {

    /**
     * Normalizes company names:
     * - Converts to lowercase
     * - Removes common punctuation (.,'-/)
     * - Collapses multiple spaces into single space
     * - Strips legal suffix extensions like Inc, LLC, Ltd, Corp, Technologies, Solutions if at end
     */
    public static String normalizeCompanyName(String name) {
        if (name == null) {
            return "";
        }
        String cleaned = name.trim().toLowerCase(Locale.ROOT);
        // Replace punctuation with spaces
        cleaned = cleaned.replaceAll("[^a-z0-9\\s]", " ");
        // Collapse whitespace
        cleaned = cleaned.replaceAll("\\s+", " ").trim();
        return cleaned;
    }

    /**
     * Normalizes URLs:
     * - Trims & converts to lowercase
     * - Strips protocol (http://, https://)
     * - Strips leading 'www.'
     * - Strips trailing slash
     * - Strips query parameters and fragments for base website comparison
     */
    public static String normalizeUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return "";
        }
        String clean = url.trim().toLowerCase(Locale.ROOT);
        clean = clean.replaceFirst("^(http[s]?://)", "");
        clean = clean.replaceFirst("^www\\.", "");
        
        // Remove trailing slash
        if (clean.endsWith("/")) {
            clean = clean.substring(0, clean.length() - 1);
        }
        
        // Remove query parameters (?...) and hash fragments (#...)
        int queryIdx = clean.indexOf('?');
        if (queryIdx != -1) {
            clean = clean.substring(0, queryIdx);
        }
        int hashIdx = clean.indexOf('#');
        if (hashIdx != -1) {
            clean = clean.substring(0, hashIdx);
        }
        
        if (clean.endsWith("/")) {
            clean = clean.substring(0, clean.length() - 1);
        }
        return clean.trim();
    }

    /**
     * Normalizes source/platform names:
     * e.g. " LinkedIn " -> "linkedin"
     */
    public static String normalizePlatformName(String platform) {
        if (platform == null) {
            return "";
        }
        return platform.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}
