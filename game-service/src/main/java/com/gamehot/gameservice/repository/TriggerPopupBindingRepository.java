package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.TriggerPopupBinding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TriggerPopupBindingRepository extends JpaRepository<TriggerPopupBinding, Long> {
    List<TriggerPopupBinding> findByRuleId(Long ruleId);
}
