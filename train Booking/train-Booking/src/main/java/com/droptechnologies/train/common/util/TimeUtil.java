package com.droptechnologies.train.common.util;

import java.util.regex.Pattern;

public final class TimeUtil {
    private static final Pattern HHMM = Pattern.compile("^\\d{2}:\\d{2}$");

    private TimeUtil() {}

    /** Returns "HH:mm" or null for SRC, —, blanks and anything else odd. */
    public static String clean(String raw) {
        if (raw == null) return null;
        String t = raw.trim();
        return HHMM.matcher(t).matches() ? t : null;
    }
}