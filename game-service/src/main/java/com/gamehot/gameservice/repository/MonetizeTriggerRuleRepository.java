package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.MonetizeTriggerRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MonetizeTriggerRuleRepository extends JpaRepository<MonetizeTriggerRule, Long> {
}
