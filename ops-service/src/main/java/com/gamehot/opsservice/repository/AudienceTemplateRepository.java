package com.gamehot.opsservice.repository;

import com.gamehot.opsservice.model.AudienceTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AudienceTemplateRepository extends JpaRepository<AudienceTemplate, Long> {

    List<AudienceTemplate> findByDeletedOrderByCreatedAtDesc(Integer deleted);

    List<AudienceTemplate> findByCategoryAndDeletedOrderByCreatedAtDesc(String category, Integer deleted);

    Optional<AudienceTemplate> findByIdAndDeleted(Long id, Integer deleted);

    @Query("SELECT DISTINCT t.category FROM AudienceTemplate t WHERE t.deleted = 0 ORDER BY t.category")
    List<String> findDistinctCategories();
}
