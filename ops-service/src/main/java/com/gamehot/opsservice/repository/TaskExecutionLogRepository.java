package com.gamehot.opsservice.repository;

import com.gamehot.opsservice.model.TaskExecutionLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskExecutionLogRepository extends JpaRepository<TaskExecutionLog, Long> {

    List<TaskExecutionLog> findByOrderByCreatedAtDesc(Pageable pageable);

    List<TaskExecutionLog> findByTaskIdOrderByCreatedAtDesc(Long taskId, Pageable pageable);

    List<TaskExecutionLog> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    @Query("SELECT COUNT(l) FROM TaskExecutionLog l WHERE l.taskId = :taskId AND l.status = 'success'")
    long countSuccessByTaskId(Long taskId);

    @Query("SELECT COUNT(l) FROM TaskExecutionLog l WHERE l.taskId = :taskId AND l.status = 'failed'")
    long countFailedByTaskId(Long taskId);

    @Query("SELECT AVG(l.durationMs) FROM TaskExecutionLog l WHERE l.taskId = :taskId AND l.status = 'success'")
    Double avgDurationByTaskId(Long taskId);
}
