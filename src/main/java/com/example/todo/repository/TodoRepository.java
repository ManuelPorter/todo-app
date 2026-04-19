package com.example.todo.repository;

import com.example.todo.model.Todo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface TodoRepository extends JpaRepository<Todo, Long> {
    Page<Todo> findByUserIdAndDeletedAtIsNull(Long userId, Pageable pageable);

    Page<Todo> findByUserIdAndDeletedAtIsNotNull(Long userId, Pageable pageable);

    Page<Todo> findByUserIdAndDeletedAtIsNullAndTitleContainingIgnoreCaseOrUserIdAndDeletedAtIsNullAndDescriptionContainingIgnoreCase(
            Long userId1, String title, Long userId2, String description, Pageable pageable);

    @Modifying
    @Transactional
    @Query("DELETE FROM Todo t WHERE t.userId = :userId AND t.deletedAt IS NOT NULL")
    void deleteAllTrashedByUserId(Long userId);
}
