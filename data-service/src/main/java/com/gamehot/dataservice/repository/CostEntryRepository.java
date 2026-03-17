package com.gamehot.dataservice.repository;

import com.gamehot.dataservice.model.CostEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface CostEntryRepository extends JpaRepository<CostEntry, Long> {

    @Query("SELECT e FROM CostEntry e WHERE e.deleted = 0 AND " +
           "(:categoryId IS NULL OR e.categoryId = :categoryId) AND " +
           "(:gameId IS NULL OR e.gameId = :gameId) AND " +
           "(:startDate IS NULL OR e.costDate >= :startDate) AND " +
           "(:endDate IS NULL OR e.costDate <= :endDate) " +
           "ORDER BY e.costDate DESC")
    List<CostEntry> findWithFilters(
        @Param("categoryId") Long categoryId,
        @Param("gameId") Integer gameId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    @Modifying
    @Query("UPDATE CostEntry e SET e.deleted = 1 WHERE e.id = :id")
    void softDelete(@Param("id") Long id);
}
