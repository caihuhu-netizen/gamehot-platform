package com.gamehot.opsservice.repository;

import com.gamehot.opsservice.model.DailyReport;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyReportRepository extends JpaRepository<DailyReport, Long> {

    List<DailyReport> findByOrderByReportDateDesc(Pageable pageable);

    List<DailyReport> findByGameIdOrderByReportDateDesc(Integer gameId, Pageable pageable);

    Optional<DailyReport> findByReportDateAndGameId(LocalDate reportDate, Integer gameId);

    Optional<DailyReport> findByReportDate(LocalDate reportDate);
}
