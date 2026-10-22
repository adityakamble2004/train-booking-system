package com.droptech.MCPAIServerSpring.service;

import com.droptech.MCPAIServerSpring.entity.AiAgent;
import com.droptech.MCPAIServerSpring.repository.AiAgentRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.droptech.MCPAIServerSpring.dto.CreateAiAgentRequest;

import java.util.List;
import java.util.Optional;

@Service
public class AiAgentService {

    private final AiAgentRepository aiAgentRepository;
    private final PasswordEncoder passwordEncoder;

    public AiAgentService(
            AiAgentRepository aiAgentRepository,
            PasswordEncoder passwordEncoder) {

        this.aiAgentRepository = aiAgentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public AiAgent createAgent(CreateAiAgentRequest request) {

        AiAgent aiAgent = new AiAgent();

        aiAgent.setUserId(request.getUserId());
        aiAgent.setUserGmail(request.getUserGmail());
        aiAgent.setAccess(request.isAccess());
        aiAgent.setLevel(request.getLevel());

        // Hash the plain token before storing it
        String hashedToken =
                passwordEncoder.encode(request.getAccessToken());

        aiAgent.setAccessTokenHash(hashedToken);

        return aiAgentRepository.save(aiAgent);
    }

    public List<AiAgent> getAllAgents() {
        return aiAgentRepository.findAll();
    }

    public AiAgent getAgentById(Long id) {
        return aiAgentRepository.findById(id).orElse(null);
    }

    public void deleteAgent(Long id) {
        aiAgentRepository.deleteById(id);
    }

    public boolean verifyAgent(String email, String plainToken) {

        Optional<AiAgent> agentOptional =
                aiAgentRepository.findByUserGmail(email);

        if (agentOptional.isEmpty()) {
            return false;
        }

        AiAgent agent = agentOptional.get();

        // Check whether access is enabled
        if (!agent.isAccess()) {
            return false;
        }

        // Compare plain token with BCrypt hash
        return passwordEncoder.matches(
                plainToken,
                agent.getAccessTokenHash()
        );
    }
}