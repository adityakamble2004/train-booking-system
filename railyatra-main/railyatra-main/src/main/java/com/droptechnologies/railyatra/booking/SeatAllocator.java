package com.droptechnologies.railyatra.booking;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class SeatAllocator {

    public record FreeSeat(long id, String coachNo, int seatNo, String berthType) {}

    private SeatAllocator() {}

    /** Returns one seat per passenger, in passenger order. Caller guarantees free.size() >= preferences.size(). */
    public static List<FreeSeat> pick(List<FreeSeat> free, List<String> preferences) {
        int n = preferences.size();

        Comparator<FreeSeat> bySeat = Comparator
                .comparing((FreeSeat s) -> s.coachNo().length())
                .thenComparing(FreeSeat::coachNo)
                .thenComparingInt(FreeSeat::seatNo);

        Map<String, List<FreeSeat>> byCoach = free.stream().sorted(bySeat)
                .collect(Collectors.groupingBy(FreeSeat::coachNo, LinkedHashMap::new, Collectors.toList()));

        // Keep the group together: first coach with enough free seats, else spill across coaches.
        List<FreeSeat> pool = byCoach.values().stream().filter(c -> c.size() >= n).findFirst()
                .orElseGet(() -> byCoach.values().stream().flatMap(List::stream)
                        .collect(Collectors.toCollection(ArrayList::new)));

        List<FreeSeat> remaining = new ArrayList<>(pool);
        FreeSeat[] result = new FreeSeat[n];

        for (int i = 0; i < n; i++) {                       // pass 1: people with a specific berth preference
            String pref = preferences.get(i);
            if (pref == null || "NO_PREFERENCE".equals(pref)) {
                continue;
            }
            for (int j = 0; j < remaining.size(); j++) {
                if (pref.equals(remaining.get(j).berthType())) {
                    result[i] = remaining.remove(j);
                    break;
                }
            }
        }
        for (int i = 0; i < n; i++) {                       // pass 2: everyone else takes the next seat
            if (result[i] == null) {
                result[i] = remaining.remove(0);
            }
        }
        return List.of(result);
    }
}