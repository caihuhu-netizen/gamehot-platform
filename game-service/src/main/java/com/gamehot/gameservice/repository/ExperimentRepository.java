package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.Experiment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExperimentRepository extends JpaRepository<Experiment, Long> {
    List<Experiment> findByStatus(String status);
    List<Experiment> findByGameId(Long gameId);
}
