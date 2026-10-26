package com.droptechnologies.railyatra.payment.gateway;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;

@Component
@ConditionalOnProperty(name = "app.payment.gateway", havingValue = "mock", matchIfMissing = true)
public class MockPaymentGateway implements PaymentGateway {

    public record MockEvent(String type, String orderId, String paymentId, String failureReason) {}

    private static final SecureRandom RANDOM = new SecureRandom();

    private final String secret;
    private final JsonMapper json = JsonMapper.builder().build();

    public MockPaymentGateway(@Value("${app.payment.mock.webhook-secret:dev-webhook-secret-change-me}") String secret) {
        this.secret = secret;
    }

    @Override
    public String name() {
        return "MOCK";
    }

    @Override
    public String createOrder(String receipt, int amountPaise) {
        return "mock_order_" + token(8);
    }

    @Override
    public boolean verifyWebhook(String rawBody, String signature) {
        byte[] expected = sign(rawBody).getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expected, signature.getBytes(StandardCharsets.UTF_8));   // constant time
    }

    @Override
    public GatewayEvent parseWebhook(String rawBody) {
        MockEvent e = json.readValue(rawBody, MockEvent.class);
        return new GatewayEvent(e.type(), e.orderId(), e.paymentId(), e.failureReason());
    }

    @Override
    public String refund(String gatewayPaymentId, int amountPaise) {
        return "mock_rfnd_" + token(8);
    }

    /** Used by the dev endpoint to play the part of the gateway. */
    public String sign(String rawBody) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String token(int bytes) {
        byte[] b = new byte[bytes];
        RANDOM.nextBytes(b);
        return HexFormat.of().formatHex(b);
    }
}