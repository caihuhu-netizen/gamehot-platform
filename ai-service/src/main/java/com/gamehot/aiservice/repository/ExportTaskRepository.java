package com.gamehot.aiservice.repository;

import com.gamehot.aiservice.entity.ExportTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExportTaskRepository extends JpaRepository<ExportTask, Long> {
    List<ExportTask> findByUserIdOrderByCreatedAtDesc(String userId);
}
