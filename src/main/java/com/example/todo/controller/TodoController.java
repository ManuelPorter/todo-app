package com.example.todo.controller;

import com.example.todo.model.Todo;
import com.example.todo.repository.TodoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import java.util.Map;

@RestController
@RequestMapping("/api/todos")
@CrossOrigin
public class TodoController {
    private final TodoRepository repo;

    public TodoController(TodoRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public Map<String, Object> all(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "createdAt") String sort
    ) {
        Sort sortObj = Sort.by(sort).descending();
        Pageable pageable = PageRequest.of(page, size, sortObj);
        Page<Todo> p;
        if (q == null || q.isBlank()) {
            p = repo.findAll(pageable);
        } else {
            p = repo.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(q, q, pageable);
        }
        return Map.of(
                "content", p.getContent(),
                "page", p.getNumber(),
                "size", p.getSize(),
                "totalElements", p.getTotalElements(),
                "totalPages", p.getTotalPages()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Todo> get(@PathVariable Long id) {
        Optional<Todo> t = repo.findById(id);
        return t.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public Todo create(@RequestBody Todo todo) {
        todo.setId(null);
        // allow client to set dueAt; createdAt set on persist
        return repo.save(todo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Todo> update(@PathVariable Long id, @RequestBody Todo input) {
        return repo.findById(id).map(existing -> {
            existing.setTitle(input.getTitle());
            existing.setDescription(input.getDescription());
            existing.setCompleted(input.isCompleted());
            existing.setDueAt(input.getDueAt());
            Todo saved = repo.save(existing);
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
