package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.PricingStrategy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PricingStrategyRepository extends JpaRepository<PricingStrategy, Long> {
    List<PricingStrategy> findByGameId(Long gameId);
}
