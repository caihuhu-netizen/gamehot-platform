package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.PricingRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PricingRecommendationRepository extends JpaRepository<PricingRecommendation, Long> {
    List<PricingRecommendation> findByGameId(Long gameId);
}
