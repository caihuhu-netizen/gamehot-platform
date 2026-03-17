package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.RegionGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RegionGroupRepository extends JpaRepository<RegionGroup, Long> {
}
