package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.GameServiceConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GameServiceConfigRepository extends JpaRepository<GameServiceConfig, Long> {
    List<GameServiceConfig> findByGameId(Long gameId);
    Optional<GameServiceConfig> findByGameIdAndServiceType(Long gameId, String serviceType);
}
