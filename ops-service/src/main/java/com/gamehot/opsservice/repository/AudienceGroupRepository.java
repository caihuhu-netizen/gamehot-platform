package com.gamehot.opsservice.repository;

import com.gamehot.opsservice.model.AudienceGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AudienceGroupRepository extends JpaRepository<AudienceGroup, Long> {

    List<AudienceGroup> findByDeletedOrderByCreatedAtDesc(Integer deleted);

    List<AudienceGroup> findByGameIdAndDeletedOrderByCreatedAtDesc(Integer gameId, Integer deleted);

    Optional<AudienceGroup> findByIdAndDeleted(Long id, Integer deleted);
}
