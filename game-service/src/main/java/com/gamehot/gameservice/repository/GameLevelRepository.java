package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.GameLevel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GameLevelRepository extends JpaRepository<GameLevel, Long> {
    Page<GameLevel> findByLevelNameContainingIgnoreCase(String search, Pageable pageable);
    Page<GameLevel> findByGameId(Long gameId, Pageable pageable);
}
