package com.example.todo.controller;

import com.example.todo.model.Tag;
import com.example.todo.repository.TagRepository;
import com.example.todo.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tags")
public class TagController {

    private final TagRepository tagRepo;
    private final UserRepository userRepository;

    public TagController(TagRepository tagRepo, UserRepository userRepository) {
        this.tagRepo = tagRepo;
        this.userRepository = userRepository;
    }

    private Long resolveUserId(UserDetails principal) {
        return userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"))
                .getId();
    }

    @GetMapping
    public List<Tag> all(@AuthenticationPrincipal UserDetails principal) {
        return tagRepo.findByUserId(resolveUserId(principal));
    }

    @PostMapping
    public Tag create(@Valid @RequestBody Tag tag,
                      @AuthenticationPrincipal UserDetails principal) {
        tag.setId(null);
        tag.setUserId(resolveUserId(principal));
        if (tag.getColor() == null || tag.getColor().isBlank()) tag.setColor("#6B7280");
        return tagRepo.save(tag);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Tag> update(@PathVariable Long id,
                                      @Valid @RequestBody Tag input,
                                      @AuthenticationPrincipal UserDetails principal) {
        Long userId = resolveUserId(principal);
        Optional<Tag> found = tagRepo.findById(id);
        if (found.isEmpty() || !userId.equals(found.get().getUserId())) {
            return ResponseEntity.notFound().build();
        }
        Tag existing = found.get();
        existing.setName(input.getName());
        if (input.getColor() != null && !input.getColor().isBlank()) existing.setColor(input.getColor());
        return ResponseEntity.ok(tagRepo.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal UserDetails principal) {
        Long userId = resolveUserId(principal);
        Optional<Tag> found = tagRepo.findById(id);
        if (found.isEmpty() || !userId.equals(found.get().getUserId())) {
            return ResponseEntity.notFound().build();
        }
        tagRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
