package com.droptech.MCPAIServerSpring.controller;

import com.droptech.MCPAIServerSpring.entity.AiAgent;
import com.droptech.MCPAIServerSpring.dto.VerifyRequest;
import com.droptech.MCPAIServerSpring.service.AiAgentService;
import com.droptech.MCPAIServerSpring.dto.CreateAiAgentRequest;

import org.hibernate.internal.build.AllowSysOut;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai-agents")
public class AiAgentController {

    private final AiAgentService aiAgentService;

    public AiAgentController(AiAgentService aiAgentService) {
        this.aiAgentService = aiAgentService;
    }

    @PostMapping
    public AiAgent createAgent(@RequestBody CreateAiAgentRequest request) {
        return aiAgentService.createAgent(request);
    }

    @GetMapping
    public List<AiAgent> getAllAgents() {
        return aiAgentService.getAllAgents();
    }

    @GetMapping("/{id}")
    public AiAgent getAgentById(@PathVariable Long id) {
        return aiAgentService.getAgentById(id);
    }

    @DeleteMapping("/{id}")
    public String deleteAgent(@PathVariable Long id) {
        aiAgentService.deleteAgent(id);
        return "AI Agent deleted successfully";
    }
    
    @PostMapping("/verify")
    public String verifyAgent(@RequestBody VerifyRequest request) {

        boolean valid = aiAgentService.verifyAgent(
            request.getEmail(),
            request.getToken()
        );

        if (valid) {
            return "AI Agent authenticated successfully";
        }

        return "Invalid email, access token, or access denied";
    }
    
}