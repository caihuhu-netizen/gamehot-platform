package com.gamehot.aiservice.repository;

import com.gamehot.aiservice.entity.OptimizationSuggestion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OptimizationSuggestionRepository extends JpaRepository<OptimizationSuggestion, Long> {
    Page<OptimizationSuggestion> findByGameId(Long gameId, Pageable pageable);
    Page<OptimizationSuggestion> findByGameIdAndCategory(Long gameId, String category, Pageable pageable);
    Page<OptimizationSuggestion> findByGameIdAndStatus(Long gameId, String status, Pageable pageable);
    Page<OptimizationSuggestion> findByGameIdAndPriority(Long gameId, String priority, Pageable pageable);
    long countByStatus(String status);
    long countByGameIdAndStatus(Long gameId, String status);
}
