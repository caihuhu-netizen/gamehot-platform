package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.SegmentTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SegmentTemplateRepository extends JpaRepository<SegmentTemplate, Long> {
    List<SegmentTemplate> findByGameType(String gameType);
}
