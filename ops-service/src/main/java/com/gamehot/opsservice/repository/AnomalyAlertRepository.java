package com.gamehot.opsservice.repository;

import com.gamehot.opsservice.model.AnomalyAlert;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnomalyAlertRepository extends JpaRepository<AnomalyAlert, Long> {

    List<AnomalyAlert> findByOrderByCreatedAtDesc(Pageable pageable);

    List<AnomalyAlert> findByGameIdOrderByCreatedAtDesc(Integer gameId, Pageable pageable);

    List<AnomalyAlert> findByAlertTypeOrderByCreatedAtDesc(String alertType, Pageable pageable);

    List<AnomalyAlert> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    @Query("SELECT COUNT(a) FROM AnomalyAlert a")
    long countTotal();

    @Query("SELECT COUNT(a) FROM AnomalyAlert a WHERE a.status = 'open'")
    long countOpen();

    @Query("SELECT COUNT(a) FROM AnomalyAlert a WHERE a.severity = :severity")
    long countBySeverity(String severity);
}
