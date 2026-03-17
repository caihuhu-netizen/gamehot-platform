package com.gamehot.aiservice.repository;

import com.gamehot.aiservice.entity.PerfSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PerfSnapshotRepository extends JpaRepository<PerfSnapshot, Long> {
    List<PerfSnapshot> findByCreatedAtAfterOrderByCreatedAtAsc(LocalDateTime after);
    Optional<PerfSnapshot> findTopByOrderByCreatedAtDesc();
}
