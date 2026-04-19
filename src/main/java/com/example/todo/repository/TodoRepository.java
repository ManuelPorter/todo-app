package com.example.todo.repository;

import com.example.todo.model.Todo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface TodoRepository extends JpaRepository<Todo, Long> {
    Page<Todo> findByUserIdAndDeletedAtIsNullAndParentIdIsNull(Long userId, Pageable pageable);

    Page<Todo> findByUserIdAndDeletedAtIsNotNullAndParentIdIsNull(Long userId, Pageable pageable);

    @Query("SELECT t FROM Todo t WHERE t.userId = :userId AND t.deletedAt IS NULL AND t.parentId IS NULL " +
           "AND (LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(t.description) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Todo> searchTopLevel(@Param("userId") Long userId, @Param("q") String q, Pageable pageable);

    List<Todo> findByParentIdAndUserIdAndDeletedAtIsNull(Long parentId, Long userId);

    List<Todo> findByParentIdAndUserId(Long parentId, Long userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Todo t WHERE t.userId = :userId AND t.deletedAt IS NOT NULL")
    void deleteAllTrashedByUserId(Long userId);
}
