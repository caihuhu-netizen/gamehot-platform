package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.PopupTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PopupTemplateRepository extends JpaRepository<PopupTemplate, Long> {
}
