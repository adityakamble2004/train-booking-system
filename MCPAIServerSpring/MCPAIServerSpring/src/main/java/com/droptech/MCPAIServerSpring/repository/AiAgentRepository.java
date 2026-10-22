package com.droptech.MCPAIServerSpring.repository;

import com.droptech.MCPAIServerSpring.entity.AiAgent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiAgentRepository extends JpaRepository<AiAgent, Long> {

    Optional<AiAgent> findByUserGmail(String userGmail);
}