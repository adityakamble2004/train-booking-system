package com.droptechnologies.railyatra.journey;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class SeatLayouts {

    public record SeatSpec(String coachNo, int seatNo, String berthType) {}

    private record Layout(String prefix, int seatsPerCoach, String[] berths) {}

    private static final String[] EIGHT = {"LOWER", "MIDDLE", "UPPER", "LOWER", "MIDDLE", "UPPER",
            "SIDE_LOWER", "SIDE_UPPER"};
    private static final String[] SIX = {"LOWER", "UPPER", "LOWER", "UPPER", "SIDE_LOWER", "SIDE_UPPER"};
    private static final String[] TWO = {"LOWER", "UPPER"};

    private static final Map<String, Layout> LAYOUTS = Map.of(
            "SL", new Layout("S", 72, EIGHT),
            "3A", new Layout("B", 64, EIGHT),
            "3E", new Layout("M", 80, EIGHT),
            "2A", new Layout("A", 48, SIX),
            "1A", new Layout("H", 24, TWO),
            "CC", new Layout("C", 78, null),
            "EC", new Layout("E", 56, null),
            "2S", new Layout("D", 108, null));

    private SeatLayouts() {}

    public static boolean supports(String classCode) {
        return LAYOUTS.containsKey(classCode);
    }

    public static int seatsPerCoach(String classCode) {
        return LAYOUTS.get(classCode).seatsPerCoach();
    }

    public static List<SeatSpec> generate(String classCode, int coaches) {
        Layout layout = LAYOUTS.get(classCode);
        List<SeatSpec> seats = new ArrayList<>(coaches * layout.seatsPerCoach());
        for (int c = 1; c <= coaches; c++) {
            String coach = layout.prefix() + c;
            for (int s = 1; s <= layout.seatsPerCoach(); s++) {
                String berth = layout.berths() == null ? null : layout.berths()[(s - 1) % layout.berths().length];
                seats.add(new SeatSpec(coach, s, berth));
            }
        }
        return seats;
    }
}