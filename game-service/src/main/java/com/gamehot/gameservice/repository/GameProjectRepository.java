package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.GameProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GameProjectRepository extends JpaRepository<GameProject, Long> {
    Optional<GameProject> findByGameCode(String gameCode);
}
