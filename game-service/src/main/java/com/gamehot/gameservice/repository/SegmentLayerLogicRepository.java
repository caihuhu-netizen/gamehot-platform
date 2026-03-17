package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.SegmentLayerLogic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SegmentLayerLogicRepository extends JpaRepository<SegmentLayerLogic, Long> {
    Optional<SegmentLayerLogic> findByLayerId(Integer layerId);
}
