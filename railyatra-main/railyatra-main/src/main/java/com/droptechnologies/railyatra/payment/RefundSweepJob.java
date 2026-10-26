package com.droptechnologies.railyatra.payment;

import com.droptechnologies.railyatra.payment.PaymentRepository.RefundJob;
import com.droptechnologies.railyatra.payment.gateway.PaymentGateway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RefundSweepJob {

    private static final Logger log = LoggerFactory.getLogger(RefundSweepJob.class);

    private final PaymentRepository repo;
    private final PaymentGateway gateway;

    public RefundSweepJob(PaymentRepository repo, PaymentGateway gateway) {
        this.repo = repo;
        this.gateway = gateway;
    }

    @Scheduled(fixedDelayString = "${app.payment.refund-sweep-ms:10000}")
    public void sweep() {
        for (RefundJob job : repo.pendingRefunds(20)) {
            try {
                String gatewayRefundId = gateway.refund(job.gatewayPaymentId(), job.amountPaise());
                repo.markRefundProcessed(job.id(), gatewayRefundId);
                log.info("Refund {} processed ({} paise)", job.id(), job.amountPaise());
            } catch (Exception e) {
                log.error("Refund {} failed, will retry", job.id(), e);   // stays PENDING
            }
        }
    }
}