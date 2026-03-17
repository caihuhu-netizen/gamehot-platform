package com.gamehot.aiservice.repository;

import com.gamehot.aiservice.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    List<ChatSession> findByUserIdOrderByUpdatedAtDesc(String userId);
    Optional<ChatSession> findByIdAndUserId(Long id, String userId);
}
