package com.gamehot.aiservice.repository;

import com.gamehot.aiservice.entity.KnowledgeBase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBase, Long> {
    List<KnowledgeBase> findByCategory(String category);
    List<KnowledgeBase> findByRelatedModule(String module);
    List<KnowledgeBase> findByRelatedGameId(Long gameId);

    @Query("SELECT k FROM KnowledgeBase k WHERE k.title LIKE %:keyword% OR k.content LIKE %:keyword%")
    List<KnowledgeBase> searchByKeyword(@Param("keyword") String keyword);
}
