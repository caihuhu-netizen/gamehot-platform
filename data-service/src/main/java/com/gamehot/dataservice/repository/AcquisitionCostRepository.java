package com.gamehot.dataservice.repository;

import com.gamehot.dataservice.model.AcquisitionCost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AcquisitionCostRepository extends JpaRepository<AcquisitionCost, Long> {

    @Query("SELECT c FROM AcquisitionCost c WHERE " +
           "(:channelId IS NULL OR c.channelId = :channelId) AND " +
           "(:gameId IS NULL OR c.gameId = :gameId) AND " +
           "(:startDate IS NULL OR c.costDate >= :startDate) AND " +
           "(:endDate IS NULL OR c.costDate <= :endDate) " +
           "ORDER BY c.costDate DESC")
    List<AcquisitionCost> findWithFilters(
        @Param("channelId") Long channelId,
        @Param("gameId") Integer gameId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
}
