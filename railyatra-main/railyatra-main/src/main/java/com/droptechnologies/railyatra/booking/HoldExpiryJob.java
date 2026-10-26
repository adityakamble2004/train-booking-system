package com.droptechnologies.railyatra.booking;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class HoldExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(HoldExpiryJob.class);

    private final BookingRepository repo;
    private final TransactionTemplate tx;

    public HoldExpiryJob(BookingRepository repo, PlatformTransactionManager txManager) {
        this.repo = repo;
        this.tx = new TransactionTemplate(txManager);
        // READ_COMMITTED avoids gap locks, so the sweep never delays new bookings
        this.tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }

    @Scheduled(fixedDelayString = "${app.booking.expiry-sweep-ms:60000}")
    public void sweep() {
        try {
            Integer expired = tx.execute(status -> {
                int n = repo.expireDueBookings();
                repo.releaseExpiredAllocations();
                repo.cancelExpiredPassengers();
                return n;
            });
            if (expired != null && expired > 0) {
                log.info("Expired {} unpaid booking(s) and released their seats", expired);
            }
        } catch (Exception e) {
            log.error("Hold expiry sweep failed", e);
        }
    }
}