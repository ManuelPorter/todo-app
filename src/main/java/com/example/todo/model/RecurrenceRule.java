package com.example.todo.model;

import java.time.LocalDateTime;

public enum RecurrenceRule {
    DAILY, WEEKLY, WEEKLY_MON, WEEKLY_TUE, WEEKLY_WED, WEEKLY_THU, WEEKLY_FRI, WEEKLY_SAT, WEEKLY_SUN, MONTHLY, WEEKLY_CUSTOM;

    public LocalDateTime nextOccurrenceAfter(LocalDateTime from, int recurrenceDays) {
        return switch (this) {
            case DAILY -> from.plusDays(1);
            case WEEKLY, WEEKLY_MON, WEEKLY_TUE, WEEKLY_WED, WEEKLY_THU, WEEKLY_FRI, WEEKLY_SAT, WEEKLY_SUN -> from.plusWeeks(1);
            case MONTHLY -> from.plusMonths(1);
            case WEEKLY_CUSTOM -> {
                if (recurrenceDays == 0) yield from.plusDays(1);
                LocalDateTime next = from.plusDays(1);
                for (int i = 0; i < 7; i++) {
                    // DayOfWeek: MON=1..SUN=7, bitmask: bit 0=Mon .. bit 6=Sun
                    int bit = 1 << (next.getDayOfWeek().getValue() - 1);
                    if ((recurrenceDays & bit) != 0) yield next;
                    next = next.plusDays(1);
                }
                yield from.plusDays(1);
            }
        };
    }
}
