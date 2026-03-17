package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.GameItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GameItemRepository extends JpaRepository<GameItem, Long> {
}
