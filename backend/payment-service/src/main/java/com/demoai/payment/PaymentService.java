package com.demoai.payment;

import com.stripe.Stripe;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Core payment processing service.
 *
 * ADO #31: Apple Pay Integration
 * ADO #32: Retry Logic for Failed Payments
 * ADO #33: Refund Automation
 * ADO #46: BUG — Duplicate charge after retry (fixed by idempotency key)
 * ADO #54: BUG — Apple Pay shows wrong total when promo applied
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRetryHandler retryHandler;
    private final RefundService refundService;

    public PaymentService(PaymentRetryHandler retryHandler, RefundService refundService) {
        this.retryHandler = retryHandler;
        this.refundService = refundService;
    }

    /**
     * Creates a payment intent with an idempotency key to prevent duplicate charges.
     * ADO #46: Fixes duplicate charge bug — idempotency key generated from orderId.
     */
    public PaymentResult charge(ChargeRequest request) {
        // Idempotency key scoped to orderId prevents duplicate charges on retry
        String idempotencyKey = "charge-" + request.getOrderId();

        log.info("Initiating charge for orderId={} amount={} idempotencyKey={}",
                request.getOrderId(), request.getAmountCents(), idempotencyKey);

        try {
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount((long) request.getAmountCents())
                    .setCurrency("usd")
                    .setPaymentMethod(request.getPaymentMethodId())
                    .setConfirm(true)
                    .setDescription("DemoAI Order " + request.getOrderId())
                    .putMetadata("orderId", request.getOrderId())
                    .putMetadata("customerId", request.getCustomerId())
                    .build();

            PaymentIntent intent = PaymentIntent.create(
                    params,
                    com.stripe.net.RequestOptions.builder()
                            .setIdempotencyKey(idempotencyKey)
                            .build()
            );

            log.info("Payment succeeded orderId={} intentId={}", request.getOrderId(), intent.getId());
            return PaymentResult.success(intent.getId(), request.getAmountCents());

        } catch (Exception e) {
            log.error("Payment failed orderId={} error={}", request.getOrderId(), e.getMessage());
            // Delegate to retry handler — ADO #32
            return retryHandler.retryCharge(request, e, idempotencyKey);
        }
    }

    /**
     * Initiates a refund for the given order.
     * ADO #33: Refund Automation — status tracked and updated via webhook
     * ADO #51: BUG — Refund stuck in Processing for orders > 48h (fixed in RefundService)
     */
    public RefundResult refund(String orderId, String reason) {
        log.info("Initiating refund for orderId={} reason={}", orderId, reason);
        return refundService.processRefund(orderId, reason);
    }
}
