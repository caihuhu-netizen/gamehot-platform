package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.IapProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IapProductRepository extends JpaRepository<IapProduct, Long> {
    List<IapProduct> findByGameId(Long gameId);
    List<IapProduct> findByGameIdIsNull();
}
