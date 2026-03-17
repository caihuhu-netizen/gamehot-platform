package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.ConfigSnapshot;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConfigSnapshotRepository extends JpaRepository<ConfigSnapshot, Long> {
    Page<ConfigSnapshot> findByGameIdAndConfigType(Long gameId, String configType, Pageable pageable);
    Page<ConfigSnapshot> findByGameId(Long gameId, Pageable pageable);
    Optional<ConfigSnapshot> findTopByGameIdAndConfigTypeAndStatusOrderByCreatedAtDesc(
            Long gameId, String configType, String status);
}
