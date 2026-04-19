package com.example.todo.controller;

import com.example.todo.model.Priority;
import com.example.todo.model.Tag;
import com.example.todo.model.Todo;
import com.example.todo.repository.TagRepository;
import com.example.todo.repository.TodoRepository;
import com.example.todo.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/todos")
public class TodoController {

    private final TodoRepository repo;
    private final UserRepository userRepository;
    private final TagRepository tagRepository;

    public TodoController(TodoRepository repo, UserRepository userRepository, TagRepository tagRepository) {
        this.repo = repo;
        this.userRepository = userRepository;
        this.tagRepository = tagRepository;
    }

    private Long resolveUserId(UserDetails principal) {
        return userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"))
                .getId();
    }

    private Set<Tag> resolveTagsForUser(List<Long> tagIds, Long userId) {
        if (tagIds == null || tagIds.isEmpty()) return new HashSet<>();
        return tagRepository.findAllById(tagIds).stream()
                .filter(t -> userId.equals(t.getUserId()))
                .collect(Collectors.toSet());
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
            p = repo.findByUserIdAndDeletedAtIsNullAndParentIdIsNull(userId, pageable);
        } else {
            p = repo.searchTopLevel(userId, q, pageable);
        }
        return Map.of(
                "content", p.getContent(),
                "page", p.getNumber(),
                "size", p.getSize(),
                "totalElements", p.getTotalElements(),
                "totalPages", p.getTotalPages()
        );
    }

    @GetMapping("/trash")
    public Map<String, Object> trash(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size,
            @AuthenticationPrincipal UserDetails principal
    ) {
        Long userId = resolveUserId(principal);
        Pageable pageable = PageRequest.of(page, size, Sort.by("deletedAt").descending());
        Page<Todo> p = repo.findByUserIdAndDeletedAtIsNotNullAndParentIdIsNull(userId, pageable);
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
                .filter(t -> userId.equals(t.getUserId()) && t.getDeletedAt() == null)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/subtasks")
    public ResponseEntity<List<Todo>> getSubtasks(@PathVariable Long id,
                                                   @AuthenticationPrincipal UserDetails principal) {
        Long userId = resolveUserId(principal);
        Optional<Todo> parent = repo.findById(id);
        if (parent.isEmpty() || !userId.equals(parent.get().getUserId()) || parent.get().getDeletedAt() != null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(repo.findByParentIdAndUserIdAndDeletedAtIsNull(id, userId));
    }

    @PostMapping("/{id}/subtasks")
    public ResponseEntity<Todo> createSubtask(@PathVariable Long id,
                                               @RequestBody Map<String, String> body,
                                               @AuthenticationPrincipal UserDetails principal) {
        Long userId = resolveUserId(principal);
        Optional<Todo> parent = repo.findById(id);
        if (parent.isEmpty() || !userId.equals(parent.get().getUserId()) || parent.get().getDeletedAt() != null) {
            return ResponseEntity.notFound().build();
        }
        String title = body.get("title");
        if (title == null || title.isBlank()) return ResponseEntity.badRequest().build();
        Todo subtask = new Todo();
        subtask.setTitle(title.trim());
        subtask.setUserId(userId);
        subtask.setParentId(id);
        subtask.setPriority(Priority.MEDIUM);
        return ResponseEntity.ok(repo.save(subtask));
    }

    @PostMapping
    public Todo create(@Valid @RequestBody Todo todo,
                       @AuthenticationPrincipal UserDetails principal) {
        Long userId = resolveUserId(principal);
        todo.setId(null);
        todo.setUserId(userId);
        todo.setTags(resolveTagsForUser(todo.getTagIds(), userId));
        return repo.save(todo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Todo> update(@PathVariable Long id,
                                       @Valid @RequestBody Todo input,
                                       @AuthenticationPrincipal UserDetails principal) {
        Long userId = resolveUserId(principal);
        Optional<Todo> found = repo.findById(id);
        if (found.isEmpty() || !userId.equals(found.get().getUserId()) || found.get().getDeletedAt() != null) {
            return ResponseEntity.notFound().build();
        }
        Todo existing = found.get();
        existing.setTitle(input.getTitle());
        existing.setDescription(input.getDescription());
        existing.setCompleted(input.isCompleted());
        existing.setDueAt(input.getDueAt());
        existing.setPriority(input.getPriority() != null ? input.getPriority() : existing.getPriority());
        if (input.getTagIds() != null) {
            existing.setTags(resolveTagsForUser(input.getTagIds(), userId));
        }
        return ResponseEntity.ok(repo.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal UserDetails principal) {
        Long userId = resolveUserId(principal);
        Optional<Todo> found = repo.findById(id);
        if (found.isEmpty() || !userId.equals(found.get().getUserId()) || found.get().getDeletedAt() != null) {
            return ResponseEntity.notFound().build();
        }
        LocalDateTime now = LocalDateTime.now();
        Todo todo = found.get();
        todo.setDeletedAt(now);
        repo.save(todo);
        List<Todo> subtasks = repo.findByParentIdAndUserIdAndDeletedAtIsNull(id, userId);
        subtasks.forEach(s -> s.setDeletedAt(now));
        repo.saveAll(subtasks);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentDelete(@PathVariable Long id,
                                                @AuthenticationPrincipal UserDetails principal) {
        Long userId = resolveUserId(principal);
        Optional<Todo> found = repo.findById(id);
        if (found.isEmpty() || !userId.equals(found.get().getUserId())) {
            return ResponseEntity.notFound().build();
        }
        List<Todo> subtasks = repo.findByParentIdAndUserId(id, userId);
        repo.deleteAll(subtasks);
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/restore")
    public ResponseEntity<Todo> restore(@PathVariable Long id,
                                        @AuthenticationPrincipal UserDetails principal) {
        Long userId = resolveUserId(principal);
        Optional<Todo> found = repo.findById(id);
        if (found.isEmpty() || !userId.equals(found.get().getUserId()) || found.get().getDeletedAt() == null) {
            return ResponseEntity.notFound().build();
        }
        Todo todo = found.get();
        todo.setDeletedAt(null);
        repo.save(todo);
        List<Todo> subtasks = repo.findByParentIdAndUserId(id, userId);
        subtasks.stream()
                .filter(s -> s.getDeletedAt() != null)
                .forEach(s -> s.setDeletedAt(null));
        repo.saveAll(subtasks);
        return ResponseEntity.ok(todo);
    }

    @PutMapping("/bulk/mark-complete")
    public ResponseEntity<Map<String, Integer>> markComplete(
            @RequestBody List<Long> ids,
            @AuthenticationPrincipal UserDetails principal) {
        if (ids == null || ids.isEmpty()) return ResponseEntity.ok(Map.of("updatedCount", 0));
        Long userId = resolveUserId(principal);
        List<Todo> toUpdate = repo.findAllById(ids).stream()
                .filter(t -> userId.equals(t.getUserId()) && !t.isCompleted() && t.getDeletedAt() == null)
                .collect(Collectors.toList());
        toUpdate.forEach(t -> t.setCompleted(true));
        repo.saveAll(toUpdate);
        return ResponseEntity.ok(Map.of("updatedCount", toUpdate.size()));
    }

    @DeleteMapping("/bulk")
    public ResponseEntity<Map<String, Integer>> bulkDelete(
            @RequestBody List<Long> ids,
            @AuthenticationPrincipal UserDetails principal) {
        if (ids == null || ids.isEmpty()) return ResponseEntity.ok(Map.of("deletedCount", 0));
        Long userId = resolveUserId(principal);
        List<Todo> toDelete = repo.findAllById(ids).stream()
                .filter(t -> userId.equals(t.getUserId()) && t.getDeletedAt() == null)
                .collect(Collectors.toList());
        LocalDateTime now = LocalDateTime.now();
        toDelete.forEach(t -> t.setDeletedAt(now));
        repo.saveAll(toDelete);
        for (Todo parent : toDelete) {
            List<Todo> subtasks = repo.findByParentIdAndUserIdAndDeletedAtIsNull(parent.getId(), userId);
            subtasks.forEach(s -> s.setDeletedAt(now));
            repo.saveAll(subtasks);
        }
        return ResponseEntity.ok(Map.of("deletedCount", toDelete.size()));
    }

    @PutMapping("/bulk/restore")
    public ResponseEntity<Map<String, Integer>> bulkRestore(
            @RequestBody List<Long> ids,
            @AuthenticationPrincipal UserDetails principal) {
        if (ids == null || ids.isEmpty()) return ResponseEntity.ok(Map.of("restoredCount", 0));
        Long userId = resolveUserId(principal);
        List<Todo> toRestore = repo.findAllById(ids).stream()
                .filter(t -> userId.equals(t.getUserId()) && t.getDeletedAt() != null)
                .collect(Collectors.toList());
        toRestore.forEach(t -> t.setDeletedAt(null));
        repo.saveAll(toRestore);
        for (Todo parent : toRestore) {
            List<Todo> subtasks = repo.findByParentIdAndUserId(parent.getId(), userId);
            subtasks.stream().filter(s -> s.getDeletedAt() != null).forEach(s -> s.setDeletedAt(null));
            repo.saveAll(subtasks);
        }
        return ResponseEntity.ok(Map.of("restoredCount", toRestore.size()));
    }

    @DeleteMapping("/trash")
    public ResponseEntity<Void> emptyTrash(@AuthenticationPrincipal UserDetails principal) {
        Long userId = resolveUserId(principal);
        Pageable all = PageRequest.of(0, Integer.MAX_VALUE);
        List<Todo> trashed = repo.findByUserIdAndDeletedAtIsNotNullAndParentIdIsNull(userId, all).getContent();
        for (Todo parent : trashed) {
            List<Todo> subtasks = repo.findByParentIdAndUserId(parent.getId(), userId);
            repo.deleteAll(subtasks);
        }
        repo.deleteAll(trashed);
        return ResponseEntity.noContent().build();
    }
}
