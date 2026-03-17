package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.ItemPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemPriceRepository extends JpaRepository<ItemPrice, Long> {
    List<ItemPrice> findByItemId(Long itemId);
}
