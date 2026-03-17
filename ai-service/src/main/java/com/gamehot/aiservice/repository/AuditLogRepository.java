package com.gamehot.aiservice.repository;

import com.gamehot.aiservice.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:userId IS NULL OR a.userId = :userId) AND " +
           "(:action IS NULL OR a.action = :action) AND " +
           "(:resource IS NULL OR a.resource LIKE %:resource%) AND " +
           "(:status IS NULL OR a.status = :status) AND " +
           "(:module IS NULL OR a.module = :module) AND " +
           "(:startDate IS NULL OR a.createdAt >= :startDate) AND " +
           "(:endDate IS NULL OR a.createdAt <= :endDate) AND " +
           "(:keyword IS NULL OR a.detail LIKE %:keyword% OR a.action LIKE %:keyword%)")
    Page<AuditLog> search(
        @Param("userId") String userId,
        @Param("action") String action,
        @Param("resource") String resource,
        @Param("status") String status,
        @Param("module") String module,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        @Param("keyword") String keyword,
        Pageable pageable
    );

    long countByCreatedAtAfterAndStatus(LocalDateTime after, String status);
    long countByCreatedAtAfter(LocalDateTime after);
}
