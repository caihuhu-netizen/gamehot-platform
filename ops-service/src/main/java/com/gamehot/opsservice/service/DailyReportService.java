package com.gamehot.opsservice.service;

import com.gamehot.opsservice.config.RabbitConfig;
import com.gamehot.opsservice.model.DailyReport;
import com.gamehot.opsservice.repository.DailyReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DailyReportService {

    private final DailyReportRepository dailyReportRepository;
    private final RabbitTemplate rabbitTemplate;

    public List<DailyReport> listReports(Integer gameId, String startDate, String endDate, Integer limit) {
        int pageSize = limit != null ? limit : 30;
        PageRequest page = PageRequest.of(0, pageSize);
        if (gameId != null) return dailyReportRepository.findByGameIdOrderByReportDateDesc(gameId, page);
        return dailyReportRepository.findByOrderByReportDateDesc(page);
    }

    public Optional<DailyReport> getReport(Long id) {
        return dailyReportRepository.findById(id);
    }

    @Transactional
    public Map<String, Object> generateReport(String reportDate, Integer gameId) {
        LocalDate date = reportDate != null ? LocalDate.parse(reportDate) : LocalDate.now();
        // Check if already exists
        Optional<DailyReport> existing = gameId != null
                ? dailyReportRepository.findByReportDateAndGameId(date, gameId)
                : dailyReportRepository.findByReportDate(date);
        if (existing.isPresent()) {
            return Map.of("id", existing.get().getId(), "message", "Report already exists for this date");
        }
        // Queue async generation via RabbitMQ
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE_OPS, RabbitConfig.QUEUE_DAILY_REPORT,
                Map.of("reportDate", date.toString(), "gameId", gameId != null ? gameId : 0));
        // Create placeholder record
        DailyReport report = new DailyReport();
        report.setReportDate(date);
        report.setGameId(gameId);
        report.setTitle(date + " 运营日报");
        report.setSummary("日报生成中，请稍后刷新...");
        report.setStatus("GENERATING");
        report.setGeneratedBy("ai");
        DailyReport saved = dailyReportRepository.save(report);
        log.info("[DailyReportService] Report generation queued for date={}, gameId={}", date, gameId);
        return Map.of("id", saved.getId(), "message", "Report generation queued");
    }

    @Transactional
    public Map<String, Object> sendNotification(Long id) {
        DailyReport report = dailyReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Report not found: " + id));
        // Queue feishu notification
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE_OPS, RabbitConfig.QUEUE_FEISHU_NOTIFY,
                Map.of("reportId", id, "title", report.getTitle(), "summary", report.getSummary() != null ? report.getSummary() : "",
                        "eventType", "daily_report"));
        report.setStatus("SENT");
        report.setSentAt(LocalDateTime.now());
        dailyReportRepository.save(report);
        log.info("[DailyReportService] Notification sent for report {}", id);
        return Map.of("success", true, "reportId", id);
    }
}
