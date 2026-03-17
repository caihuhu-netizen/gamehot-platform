package com.gamehot.opsservice.repository;

import com.gamehot.opsservice.model.ScheduledTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScheduledTaskRepository extends JpaRepository<ScheduledTask, Long> {

    List<ScheduledTask> findByOrderByCreatedAtDesc();

    List<ScheduledTask> findByGameIdOrderByCreatedAtDesc(Integer gameId);

    List<ScheduledTask> findByTaskTypeOrderByCreatedAtDesc(String taskType);

    boolean existsByTaskType(String taskType);
}
