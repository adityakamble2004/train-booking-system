package com.droptechnologies.railyatra.payment;

import com.droptechnologies.railyatra.common.error.ApiException;
import com.droptechnologies.railyatra.payment.gateway.MockPaymentGateway;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** DEV ONLY: simulates the customer paying (or failing to pay) at the gateway. */
@RestController
@ConditionalOnProperty(name = "app.dev.mock-payment", havingValue = "true")
@RequestMapping("/api/v1/dev/payments")
public class DevPaymentController {

    public record CompleteRequest(@NotBlank @Pattern(regexp = "^(SUCCESS|FAILURE)$",
            message = "Use SUCCESS or FAILURE") String outcome) {}

    private final PaymentService service;
    private final MockPaymentGateway gateway;

    public DevPaymentController(PaymentService service, MockPaymentGateway gateway) {
        this.service = service;
        this.gateway = gateway;
    }

    @PostMapping("/{orderId}/complete")
    public Map<String, String> complete(@PathVariable String orderId, @Valid @RequestBody CompleteRequest body) {
        if (!orderId.matches("^[A-Za-z0-9_]{1,64}$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PARAMETER", "Invalid order id");
        }
        String raw = "SUCCESS".equals(body.outcome())
                ? "{\"type\":\"PAID\",\"orderId\":\"" + orderId + "\",\"paymentId\":\""
                        + orderId.replace("mock_order_", "mock_pay_") + "\",\"failureReason\":null}"
                : "{\"type\":\"FAILED\",\"orderId\":\"" + orderId
                        + "\",\"paymentId\":null,\"failureReason\":\"Card declined (mock)\"}";

        service.handleWebhook(raw, gateway.sign(raw));
        return Map.of("orderId", orderId, "delivered", body.outcome());
    }
}