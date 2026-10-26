package com.droptechnologies.railyatra.payment;

import com.droptechnologies.railyatra.payment.dto.PaymentOrderResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PaymentController {

    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service = service;
    }

    @PostMapping("/bookings/{pnr}/payments")
    public ResponseEntity<PaymentOrderResponse> create(@AuthenticationPrincipal Jwt jwt, @PathVariable String pnr) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createPayment(Long.parseLong(jwt.getSubject()), pnr));
    }

    /** Called by the gateway, not by users. Protected by the signature header. */
    @PostMapping("/payments/webhook")
    public ResponseEntity<Void> webhook(@RequestBody String rawBody,
                                        @RequestHeader(name = "X-Signature", required = false) String signature) {
        service.handleWebhook(rawBody, signature);
        return ResponseEntity.ok().build();
    }
}