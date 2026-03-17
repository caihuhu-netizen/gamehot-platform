package com.gamehot.gameservice.repository;

import com.gamehot.gameservice.entity.DifficultyCurveTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DifficultyCurveTemplateRepository extends JpaRepository<DifficultyCurveTemplate, Long> {
}
