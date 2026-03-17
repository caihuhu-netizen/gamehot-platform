package com.gamehot.opsservice.repository;

import com.gamehot.opsservice.model.FeishuWebhookConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeishuWebhookConfigRepository extends JpaRepository<FeishuWebhookConfig, Long> {

    List<FeishuWebhookConfig> findByOrderByCreatedAtDesc();

    List<FeishuWebhookConfig> findByEnabledOrderByCreatedAtDesc(Integer enabled);
}
