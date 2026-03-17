package com.gamehot.aiservice.repository;

import com.gamehot.aiservice.entity.UserProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    Optional<UserProfile> findByUserId(String userId);
    Page<UserProfile> findByGameId(Long gameId, Pageable pageable);
    Page<UserProfile> findBySegmentLevel(String segmentLevel, Pageable pageable);

    @Query("SELECT u FROM UserProfile u WHERE " +
           "(:search IS NULL OR u.userId LIKE %:search% OR u.nickname LIKE %:search%)")
    Page<UserProfile> search(@Param("search") String search, Pageable pageable);
}
