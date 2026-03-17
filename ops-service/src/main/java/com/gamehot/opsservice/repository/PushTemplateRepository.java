package com.gamehot.opsservice.repository;

import com.gamehot.opsservice.model.PushTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PushTemplateRepository extends JpaRepository<PushTemplate, Long> {

    List<PushTemplate> findByDeletedOrderByCreatedAtDesc(Integer deleted);

    List<PushTemplate> findByCategoryAndDeletedOrderByCreatedAtDesc(String category, Integer deleted);

    List<PushTemplate> findByGameIdAndDeletedOrderByCreatedAtDesc(Integer gameId, Integer deleted);

    Optional<PushTemplate> findByIdAndDeleted(Long id, Integer deleted);

    @Query("SELECT DISTINCT t.category FROM PushTemplate t WHERE t.deleted = 0 ORDER BY t.category")
    List<String> findDistinctCategories();
}
