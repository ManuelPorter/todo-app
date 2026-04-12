package com.example.todo.controller;

import com.example.todo.model.Todo;
import com.example.todo.repository.TodoRepository;
import com.example.todo.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/todos")
public class TodoController {

    private final TodoRepository repo;
    private final UserRepository userRepository;

    public TodoController(TodoRepository repo, UserRepository userRepository) {
        this.repo = repo;
        this.userRepository = userRepository;
    }

    private Long resolveUserId(UserDetails principal) {
        return userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"))
                .getId();
    }

    @GetMapping
    public Map<String, Object> all(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "createdAt") String sort,
            @AuthenticationPrincipal UserDetails principal
    ) {
        Long userId = resolveUserId(principal);
        Sort sortObj = Sort.by(sort).descending();
        Pageable pageable = PageRequest.of(page, size, sortObj);
        Page<Todo> p;
        if (q == null || q.isBlank()) {
            p = repo.findByUserId(userId, pageable);
        } else {
            p = repo.findByUserIdAndTitleContainingIgnoreCaseOrUserIdAndDescriptionContainingIgnoreCase(
                    userId, q, userId, q, pageable);
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
    public ResponseEntity<Todo> get(@PathVariable Long id,
                                    @AuthenticationPrincipal UserDetails principal) {
        Long userId = resolveUserId(principal);
        return repo.findById(id)
                .filter(t -> userId.equals(t.getUserId()))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public Todo create(@Valid @RequestBody Todo todo,
                       @AuthenticationPrincipal UserDetails principal) {
        todo.setId(null);
        todo.setUserId(resolveUserId(principal));
        return repo.save(todo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Todo> update(@PathVariable Long id,
                                       @Valid @RequestBody Todo input,
                                       @AuthenticationPrincipal UserDetails principal) {
        Long userId = resolveUserId(principal);
        Optional<Todo> found = repo.findById(id);
        if (found.isEmpty() || !userId.equals(found.get().getUserId())) {
            return ResponseEntity.notFound().build();
        }
        Todo existing = found.get();
        existing.setTitle(input.getTitle());
        existing.setDescription(input.getDescription());
        existing.setCompleted(input.isCompleted());
        existing.setDueAt(input.getDueAt());
        return ResponseEntity.ok(repo.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal UserDetails principal) {
        Long userId = resolveUserId(principal);
        Optional<Todo> found = repo.findById(id);
        if (found.isEmpty() || !userId.equals(found.get().getUserId())) {
            return ResponseEntity.notFound().build();
        }
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
