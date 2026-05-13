package com.demoai.payment;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for payment retry logic.
 * ADO #32: Failed payments retry automatically up to 3 times
 * ADO #46: Regression — no duplicate charges during retry
 */
class PaymentRetryHandlerTest {

    @Mock private PaymentGatewayClient gatewayClient;
    @Mock private RetryAuditLogger auditLogger;

    private PaymentRetryHandler handler;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        handler = new PaymentRetryHandler(gatewayClient, auditLogger);
    }

    @Test
    void retrySucceedsOnSecondAttempt() throws Exception {
        ChargeRequest request = new ChargeRequest("order-1", "cust-1", "pm_test", 2500);
        when(gatewayClient.charge(any(), anyString()))
                .thenThrow(new RuntimeException("gateway timeout"))
                .thenReturn(PaymentResult.success("pi_test123", 2500));

        PaymentResult result = handler.retryCharge(request, new RuntimeException("initial"), "charge-order-1");

        assertThat(result.isSuccess()).isTrue();
        verify(gatewayClient, times(2)).charge(any(), eq("charge-order-1"));
        verify(auditLogger).logAttempt("order-1", 1, "FAILED", "gateway timeout");
        verify(auditLogger).logAttempt("order-1", 2, "SUCCESS", null);
    }

    // ADO #46 regression: same idempotency key used across all retry attempts
    @Test
    void allRetryAttemptsUseSameIdempotencyKey() throws Exception {
        ChargeRequest request = new ChargeRequest("order-2", "cust-2", "pm_test", 1000);
        when(gatewayClient.charge(any(), anyString()))
                .thenThrow(new RuntimeException("network error"))
                .thenReturn(PaymentResult.success("pi_456", 1000));

        handler.retryCharge(request, new RuntimeException("initial"), "charge-order-2");

        // Verify SAME key used both times — prevents duplicate charge
        verify(gatewayClient, times(2)).charge(any(), eq("charge-order-2"));
    }

    @Test
    void returnsFailureAfterMaxRetriesExhausted() throws Exception {
        ChargeRequest request = new ChargeRequest("order-3", "cust-3", "pm_test", 5000);
        when(gatewayClient.charge(any(), anyString()))
                .thenThrow(new RuntimeException("gateway down"));

        PaymentResult result = handler.retryCharge(request, new RuntimeException("initial"), "charge-order-3");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getErrorCode()).isEqualTo("MAX_RETRIES_EXCEEDED");
        verify(gatewayClient, times(3)).charge(any(), anyString());
    }
}
