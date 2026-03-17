package com.gamehot.opsservice.repository;

import com.gamehot.opsservice.model.FeishuNotificationLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FeishuNotificationLogRepository extends JpaRepository<FeishuNotificationLog, Long> {

    List<FeishuNotificationLog> findByOrderByCreatedAtDesc(Pageable pageable);

    List<FeishuNotificationLog> findByWebhookConfigIdOrderByCreatedAtDesc(Long webhookConfigId, Pageable pageable);

    List<FeishuNotificationLog> findByEventTypeOrderByCreatedAtDesc(String eventType, Pageable pageable);

    @Query("SELECT COUNT(l) FROM FeishuNotificationLog l WHERE l.createdAt >= :since")
    long countSince(LocalDateTime since);

    @Query("SELECT COUNT(l) FROM FeishuNotificationLog l WHERE l.status = 'success' AND l.createdAt >= :since")
    long countSuccessSince(LocalDateTime since);
}
