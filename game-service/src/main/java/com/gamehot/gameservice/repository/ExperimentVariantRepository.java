package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.ExperimentVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExperimentVariantRepository extends JpaRepository<ExperimentVariant, Long> {
    List<ExperimentVariant> findByExperimentId(Long experimentId);
    void deleteByExperimentId(Long experimentId);
}
