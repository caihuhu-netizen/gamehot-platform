package com.gamehot.opsservice.service;

import com.gamehot.opsservice.config.RabbitConfig;
import com.gamehot.opsservice.dto.CreateRecallPlanRequest;
import com.gamehot.opsservice.dto.UpdateRecallPlanRequest;
import com.gamehot.opsservice.model.RecallPlan;
import com.gamehot.opsservice.repository.RecallPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecallService {

    private final RecallPlanRepository recallPlanRepository;
    private final RabbitTemplate rabbitTemplate;

    public List<RecallPlan> listPlans(Integer gameId, String status) {
        if (gameId != null && status != null) {
            return recallPlanRepository.findByGameIdAndStatusAndDeletedOrderByCreatedAtDesc(gameId, status, 0);
        } else if (gameId != null) {
            return recallPlanRepository.findByGameIdAndDeletedOrderByCreatedAtDesc(gameId, 0);
        } else if (status != null) {
            return recallPlanRepository.findByStatusAndDeletedOrderByCreatedAtDesc(status, 0);
        }
        return recallPlanRepository.findByDeletedOrderByCreatedAtDesc(0);
    }

    public Optional<RecallPlan> getPlan(Long id) {
        return recallPlanRepository.findByIdAndDeleted(id, 0);
    }

    @Transactional
    public RecallPlan createPlan(CreateRecallPlanRequest req, String createdBy) {
        RecallPlan plan = new RecallPlan();
        plan.setName(req.getName());
        plan.setChannel(req.getChannel() != null ? req.getChannel() : "push");
        plan.setTargetSegment(req.getTargetSegment());
        plan.setTriggerCondition(req.getTriggerCondition());
        plan.setTriggerDays(req.getTriggerDays() != null ? req.getTriggerDays() : 7);
        plan.setReward(req.getReward());
        plan.setRewardConfig(req.getRewardConfig());
        plan.setMessage(req.getMessage());
        plan.setStatus("draft");
        plan.setGameId(req.getGameId());
        plan.setCreatedBy(createdBy);
        if (req.getStartDate() != null) plan.setStartDate(LocalDate.parse(req.getStartDate()));
        if (req.getEndDate() != null) plan.setEndDate(LocalDate.parse(req.getEndDate()));
        return recallPlanRepository.save(plan);
    }

    @Transactional
    public void updatePlan(Long id, UpdateRecallPlanRequest req) {
        RecallPlan plan = recallPlanRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Recall plan not found: " + id));
        if (req.getName() != null) plan.setName(req.getName());
        if (req.getChannel() != null) plan.setChannel(req.getChannel());
        if (req.getTargetSegment() != null) plan.setTargetSegment(req.getTargetSegment());
        if (req.getTriggerCondition() != null) plan.setTriggerCondition(req.getTriggerCondition());
        if (req.getTriggerDays() != null) plan.setTriggerDays(req.getTriggerDays());
        if (req.getReward() != null) plan.setReward(req.getReward());
        if (req.getRewardConfig() != null) plan.setRewardConfig(req.getRewardConfig());
        if (req.getMessage() != null) plan.setMessage(req.getMessage());
        if (req.getStatus() != null) plan.setStatus(req.getStatus());
        if (req.getStartDate() != null) plan.setStartDate(LocalDate.parse(req.getStartDate()));
        if (req.getEndDate() != null) plan.setEndDate(LocalDate.parse(req.getEndDate()));
        recallPlanRepository.save(plan);
    }

    @Transactional
    public void deletePlan(Long id) {
        RecallPlan plan = recallPlanRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Recall plan not found: " + id));
        plan.setDeleted(1);
        recallPlanRepository.save(plan);
    }

    @Transactional
    public Map<String, Object> executePlan(Long id) {
        RecallPlan plan = recallPlanRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Recall plan not found: " + id));
        plan.setStatus("active");
        recallPlanRepository.save(plan);
        // Async execution via RabbitMQ
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE_OPS, RabbitConfig.QUEUE_RECALL_EXECUTE,
                Map.of("planId", id, "channel", plan.getChannel(), "triggerDays", plan.getTriggerDays()));
        log.info("[RecallService] Plan {} queued for execution", id);
        return Map.of("success", true, "planId", id, "message", "Recall plan queued for execution");
    }

    public Map<String, Object> getStats(Integer gameId) {
        long total = recallPlanRepository.countTotal();
        long active = recallPlanRepository.countActive();
        Long totalTargeted = recallPlanRepository.sumTotalTargeted();
        Long totalRecalled = recallPlanRepository.sumTotalRecalled();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", total);
        stats.put("active", active);
        stats.put("totalTargeted", totalTargeted != null ? totalTargeted : 0);
        stats.put("totalRecalled", totalRecalled != null ? totalRecalled : 0);
        stats.put("avgRecallRate", totalTargeted != null && totalTargeted > 0
                ? Math.round((double)(totalRecalled != null ? totalRecalled : 0) / totalTargeted * 10000.0) / 100.0 : 0.0);
        return stats;
    }
}
