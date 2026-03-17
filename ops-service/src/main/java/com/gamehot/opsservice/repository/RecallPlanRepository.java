package com.gamehot.opsservice.repository;

import com.gamehot.opsservice.model.RecallPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecallPlanRepository extends JpaRepository<RecallPlan, Long> {

    List<RecallPlan> findByDeletedOrderByCreatedAtDesc(Integer deleted);

    List<RecallPlan> findByGameIdAndDeletedOrderByCreatedAtDesc(Integer gameId, Integer deleted);

    List<RecallPlan> findByStatusAndDeletedOrderByCreatedAtDesc(String status, Integer deleted);

    List<RecallPlan> findByGameIdAndStatusAndDeletedOrderByCreatedAtDesc(Integer gameId, String status, Integer deleted);

    Optional<RecallPlan> findByIdAndDeleted(Long id, Integer deleted);

    @Query("SELECT COUNT(r) FROM RecallPlan r WHERE r.deleted = 0")
    long countTotal();

    @Query("SELECT COUNT(r) FROM RecallPlan r WHERE r.status = 'active' AND r.deleted = 0")
    long countActive();

    @Query("SELECT SUM(r.totalTargeted) FROM RecallPlan r WHERE r.deleted = 0")
    Long sumTotalTargeted();

    @Query("SELECT SUM(r.totalRecalled) FROM RecallPlan r WHERE r.deleted = 0")
    Long sumTotalRecalled();
}
