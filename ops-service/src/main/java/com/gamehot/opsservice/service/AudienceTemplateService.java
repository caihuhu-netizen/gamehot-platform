package com.gamehot.opsservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gamehot.opsservice.dto.CreateAudienceTemplateRequest;
import com.gamehot.opsservice.model.AudienceGroup;
import com.gamehot.opsservice.model.AudienceTemplate;
import com.gamehot.opsservice.repository.AudienceGroupRepository;
import com.gamehot.opsservice.repository.AudienceTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AudienceTemplateService {

    private final AudienceTemplateRepository audienceTemplateRepository;
    private final AudienceGroupRepository audienceGroupRepository;
    private final ObjectMapper objectMapper;

    public List<AudienceTemplate> listTemplates(String category) {
        if (category != null) {
            return audienceTemplateRepository.findByCategoryAndDeletedOrderByCreatedAtDesc(category, 0);
        }
        return audienceTemplateRepository.findByDeletedOrderByCreatedAtDesc(0);
    }

    public Optional<AudienceTemplate> getTemplate(Long id) {
        return audienceTemplateRepository.findByIdAndDeleted(id, 0);
    }

    public List<String> getCategories() {
        return audienceTemplateRepository.findDistinctCategories();
    }

    @Transactional
    public AudienceTemplate createTemplate(CreateAudienceTemplateRequest req, String createdBy) {
        AudienceTemplate template = new AudienceTemplate();
        template.setName(req.getName());
        template.setDescription(req.getDescription());
        template.setCategory(req.getCategory());
        template.setIcon(req.getIcon());
        template.setMatchType(req.getMatchType() != null ? req.getMatchType() : "all");
        template.setIsBuiltin(0);
        template.setCreatedBy(createdBy);
        try {
            template.setConditions(objectMapper.writeValueAsString(req.getConditions()));
            if (req.getTags() != null) template.setTags(objectMapper.writeValueAsString(req.getTags()));
        } catch (Exception e) {
            template.setConditions("[]");
        }
        return audienceTemplateRepository.save(template);
    }

    @Transactional
    public void updateTemplate(Long id, Map<String, Object> updates) {
        AudienceTemplate template = audienceTemplateRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Audience template not found: " + id));
        if (updates.containsKey("name")) template.setName((String) updates.get("name"));
        if (updates.containsKey("description")) template.setDescription((String) updates.get("description"));
        if (updates.containsKey("category")) template.setCategory((String) updates.get("category"));
        if (updates.containsKey("icon")) template.setIcon((String) updates.get("icon"));
        if (updates.containsKey("matchType")) template.setMatchType((String) updates.get("matchType"));
        if (updates.containsKey("conditions")) {
            try {
                template.setConditions(objectMapper.writeValueAsString(updates.get("conditions")));
            } catch (Exception ignored) {}
        }
        if (updates.containsKey("tags")) {
            try {
                template.setTags(objectMapper.writeValueAsString(updates.get("tags")));
            } catch (Exception ignored) {}
        }
        audienceTemplateRepository.save(template);
    }

    @Transactional
    public void deleteTemplate(Long id) {
        AudienceTemplate template = audienceTemplateRepository.findByIdAndDeleted(id, 0)
                .orElseThrow(() -> new RuntimeException("Audience template not found: " + id));
        template.setDeleted(1);
        audienceTemplateRepository.save(template);
    }

    @Transactional
    public AudienceGroup createAudienceFromTemplate(Long templateId, String name, String description,
                                                     Integer gameId, String createdBy) {
        AudienceTemplate template = audienceTemplateRepository.findByIdAndDeleted(templateId, 0)
                .orElseThrow(() -> new RuntimeException("Audience template not found: " + templateId));
        template.setUseCount(template.getUseCount() + 1);
        audienceTemplateRepository.save(template);

        AudienceGroup group = new AudienceGroup();
        group.setName(name);
        group.setDescription(description != null ? description : template.getDescription());
        group.setConditions(template.getConditions());
        group.setMatchType(template.getMatchType());
        group.setGameId(gameId);
        group.setCreatedBy(createdBy);
        return audienceGroupRepository.save(group);
    }

    public Map<String, Object> previewCount(Long templateId) {
        AudienceTemplate template = audienceTemplateRepository.findByIdAndDeleted(templateId, 0)
                .orElseThrow(() -> new RuntimeException("Audience template not found: " + templateId));
        int estimated = (int)(Math.random() * 8000) + 100;
        return Map.of("templateId", templateId, "estimatedCount", estimated,
                "conditions", template.getConditions(), "matchType", template.getMatchType());
    }
}
