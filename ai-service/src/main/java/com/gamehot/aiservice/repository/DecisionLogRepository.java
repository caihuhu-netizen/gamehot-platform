package com.gamehot.aiservice.repository;

import com.gamehot.aiservice.entity.DecisionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DecisionLogRepository extends JpaRepository<DecisionLog, Long> {
    Page<DecisionLog> findByGameId(Long gameId, Pageable pageable);
    Page<DecisionLog> findBySourceType(String sourceType, Pageable pageable);
    Page<DecisionLog> findByHumanAction(String humanAction, Pageable pageable);
    long countByHumanAction(String humanAction);
    long countByEffectEvaluation(String effectEvaluation);
}
