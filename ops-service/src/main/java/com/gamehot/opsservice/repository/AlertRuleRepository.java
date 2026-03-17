package com.gamehot.opsservice.repository;

import com.gamehot.opsservice.model.AlertRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRuleRepository extends JpaRepository<AlertRule, Long> {

    List<AlertRule> findByOrderByCreatedAtDesc();

    List<AlertRule> findByRuleTypeOrderByCreatedAtDesc(String ruleType);

    List<AlertRule> findByIsActiveOrderByCreatedAtDesc(Integer isActive);

    List<AlertRule> findByRuleTypeAndIsActiveOrderByCreatedAtDesc(String ruleType, Integer isActive);
}
