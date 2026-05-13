package com.demoai.payment;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Handles exponential backoff retry logic for failed payment attempts.
 *
 * ADO #32: Failed payments retry automatically up to 3 times
 * ADO #46: BUG — Duplicate charge after retry (idempotency key reused per attempt)
 */
@Component
public class PaymentRetryHandler {

    private static final Logger log = LoggerFactory.getLogger(PaymentRetryHandler.class);
    private static final int MAX_RETRIES = 3;
    private static final long[] BACKOFF_MS = {1_000L, 3_000L, 9_000L};

    private final PaymentGatewayClient gatewayClient;
    private final RetryAuditLogger auditLogger;

    public PaymentRetryHandler(PaymentGatewayClient gatewayClient, RetryAuditLogger auditLogger) {
        this.gatewayClient = gatewayClient;
        this.auditLogger = auditLogger;
    }

    /**
     * Retries a failed charge with exponential backoff.
     * Reuses the same idempotencyKey to prevent duplicate charges across attempts.
     */
    public PaymentResult retryCharge(ChargeRequest request, Exception initialError, String idempotencyKey) {
        log.warn("Starting retry sequence for orderId={} maxRetries={}", request.getOrderId(), MAX_RETRIES);

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                Thread.sleep(BACKOFF_MS[attempt - 1]);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            }

            log.info("Retry attempt {}/{} for orderId={}", attempt, MAX_RETRIES, request.getOrderId());

            try {
                // Same idempotency key ensures no duplicate charge even if a previous attempt
                // partially succeeded at the gateway level — fixes ADO #46
                PaymentResult result = gatewayClient.charge(request, idempotencyKey);

                auditLogger.logAttempt(request.getOrderId(), attempt, "SUCCESS", null);
                log.info("Retry succeeded on attempt {} for orderId={}", attempt, request.getOrderId());
                return result;

            } catch (Exception e) {
                auditLogger.logAttempt(request.getOrderId(), attempt, "FAILED", e.getMessage());
                log.warn("Retry attempt {} failed for orderId={}: {}", attempt, request.getOrderId(), e.getMessage());
            }
        }

        log.error("All {} retry attempts exhausted for orderId={}", MAX_RETRIES, request.getOrderId());
        // ADO #32 AC: Customer notified only if all retries fail
        return PaymentResult.failure("MAX_RETRIES_EXCEEDED", request.getOrderId());
    }
}
