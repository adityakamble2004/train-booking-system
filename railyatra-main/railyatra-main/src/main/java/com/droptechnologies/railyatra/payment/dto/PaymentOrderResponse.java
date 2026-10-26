package com.droptechnologies.railyatra.payment.dto;

public record PaymentOrderResponse(long paymentId, String gateway, String orderId, int amountPaise,
                                   String currency, long holdSecondsLeft) {}