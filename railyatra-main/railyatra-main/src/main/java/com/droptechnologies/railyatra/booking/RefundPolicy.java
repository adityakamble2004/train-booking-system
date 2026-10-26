package com.droptechnologies.railyatra.booking;

import java.time.Duration;

public final class RefundPolicy {

    private RefundPolicy() {}

    /** 48h or more before departure: 90%. 12h to 48h: 75%. Under 12h: 50%. */
    public static int refundPaise(int totalFarePaise, Duration untilDeparture) {
        long hours = untilDeparture.toHours();
        int percent = hours >= 48 ? 90 : hours >= 12 ? 75 : 50;
        return (int) ((long) totalFarePaise * percent / 100);
    }
}