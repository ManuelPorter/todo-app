package com.example.todo.service;

import com.example.todo.model.Todo;
import com.example.todo.repository.TodoRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class RecurrenceScheduler {

    private final TodoRepository repo;

    public RecurrenceScheduler(TodoRepository repo) {
        this.repo = repo;
    }

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void advanceRecurringTodos() {
        LocalDateTime now = LocalDateTime.now();
        List<Todo> due = repo.findOverdueRecurring(now);
        for (Todo t : due) {
            LocalDateTime next = t.getDueAt();
            while (!next.isAfter(now)) {
                next = t.getRecurrenceRule().nextOccurrenceAfter(next);
            }
            t.setDueAt(next);
            t.setCompleted(false);
        }
        repo.saveAll(due);
    }
}
