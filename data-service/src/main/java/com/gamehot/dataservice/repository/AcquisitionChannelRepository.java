package com.gamehot.dataservice.repository;

import com.gamehot.dataservice.model.AcquisitionChannel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AcquisitionChannelRepository extends JpaRepository<AcquisitionChannel, Long> {

    @Query("SELECT c FROM AcquisitionChannel c WHERE c.deleted = 0 ORDER BY c.createdAt DESC")
    List<AcquisitionChannel> findAllActive();

    @Query("SELECT c FROM AcquisitionChannel c WHERE c.deleted = 0 AND c.gameId = :gameId ORDER BY c.createdAt DESC")
    List<AcquisitionChannel> findAllActiveByGameId(@Param("gameId") Integer gameId);

    @Query("SELECT c FROM AcquisitionChannel c WHERE c.id = :id AND c.deleted = 0")
    Optional<AcquisitionChannel> findActiveById(@Param("id") Long id);

    @Modifying
    @Query("UPDATE AcquisitionChannel c SET c.deleted = 1 WHERE c.id = :id")
    void softDelete(@Param("id") Long id);
}
