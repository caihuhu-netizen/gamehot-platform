package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.SegmentCalcRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SegmentCalcRuleRepository extends JpaRepository<SegmentCalcRule, Long> {
    List<SegmentCalcRule> findByRuleType(Integer ruleType);
    Optional<SegmentCalcRule> findByRuleTypeAndTargetLayer(Integer ruleType, Integer targetLayer);
    List<SegmentCalcRule> findByIsActive(Integer isActive);
}
