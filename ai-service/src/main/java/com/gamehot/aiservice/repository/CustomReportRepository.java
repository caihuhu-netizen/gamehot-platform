package com.gamehot.aiservice.repository;

import com.gamehot.aiservice.entity.CustomReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomReportRepository extends JpaRepository<CustomReport, Long> {
    List<CustomReport> findByGameId(Long gameId);
    List<CustomReport> findByCreatedBy(String createdBy);

    @Query("SELECT r FROM CustomReport r WHERE r.gameId = :gameId OR r.isPublic = 1 OR r.createdBy = :userId")
    List<CustomReport> findAccessible(@Param("gameId") Long gameId, @Param("userId") String userId);
}
