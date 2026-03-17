package com.gamehot.opsservice.repository;

import com.gamehot.opsservice.model.PushTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PushTaskRepository extends JpaRepository<PushTask, Long> {

    List<PushTask> findByDeletedOrderByCreatedAtDesc(Integer deleted);

    List<PushTask> findByGameIdAndDeletedOrderByCreatedAtDesc(Integer gameId, Integer deleted);

    List<PushTask> findByStatusAndDeletedOrderByCreatedAtDesc(String status, Integer deleted);

    List<PushTask> findByGameIdAndStatusAndDeletedOrderByCreatedAtDesc(Integer gameId, String status, Integer deleted);

    Optional<PushTask> findByIdAndDeleted(Long id, Integer deleted);

    @Query("SELECT COUNT(t) FROM PushTask t WHERE t.deleted = 0")
    long countTotal();

    @Query("SELECT COUNT(t) FROM PushTask t WHERE t.status = :status AND t.deleted = 0")
    long countByStatus(@Param("status") String status);

    @Query("SELECT AVG(t.deliveryRate) FROM PushTask t WHERE t.status = 'sent' AND t.deleted = 0")
    Double avgDeliveryRate();

    @Query("SELECT AVG(t.openRate) FROM PushTask t WHERE t.status = 'sent' AND t.deleted = 0")
    Double avgOpenRate();
}
