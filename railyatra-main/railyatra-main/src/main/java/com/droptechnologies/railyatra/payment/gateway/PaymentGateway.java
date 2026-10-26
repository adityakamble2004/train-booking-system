package com.droptechnologies.railyatra.payment.gateway;

public interface PaymentGateway {

    /** type is normalized to PAID or FAILED; anything else is ignored. */
    record GatewayEvent(String type, String orderId, String paymentId, String failureReason) {}

    String name();

    String createOrder(String receipt, int amountPaise);

    boolean verifyWebhook(String rawBody, String signature);

    GatewayEvent parseWebhook(String rawBody);

    String refund(String gatewayPaymentId, int amountPaise);
}