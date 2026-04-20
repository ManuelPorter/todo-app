package com.example.todo.model;

import java.time.LocalDateTime;

public enum RecurrenceRule {
    DAILY, WEEKLY_MON, WEEKLY_TUE, WEEKLY_WED, WEEKLY_THU, WEEKLY_FRI, WEEKLY_SAT, WEEKLY_SUN, MONTHLY;

    public LocalDateTime nextOccurrenceAfter(LocalDateTime from) {
        return switch (this) {
            case DAILY -> from.plusDays(1);
            case WEEKLY_MON, WEEKLY_TUE, WEEKLY_WED, WEEKLY_THU, WEEKLY_FRI, WEEKLY_SAT, WEEKLY_SUN -> from.plusWeeks(1);
            case MONTHLY -> from.plusMonths(1);
        };
    }
}
