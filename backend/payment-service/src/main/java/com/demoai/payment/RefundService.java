package com.demoai.payment;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Manages refund lifecycle and status transitions.
 *
 * ADO #33: Refund Automation — status tracked Pending → Processing → Completed
 * ADO #51: BUG — Refund stuck in Processing for orders > 48h
 *   Fix: Webhook handler now processes completion events regardless of order age.
 */
@Service
public class RefundService {

    private static final Logger log = LoggerFactory.getLogger(RefundService.class);

    private final RefundRepository refundRepository;
    private final PaymentGatewayClient gatewayClient;
    private final NotificationClient notificationClient;

    public RefundService(RefundRepository refundRepository,
                         PaymentGatewayClient gatewayClient,
                         NotificationClient notificationClient) {
        this.refundRepository = refundRepository;
        this.gatewayClient = gatewayClient;
        this.notificationClient = notificationClient;
    }

    public RefundResult processRefund(String orderId, String reason) {
        RefundRecord record = refundRepository.findByOrderId(orderId)
                .orElseGet(() -> createRefundRecord(orderId, reason));

        if (record.getStatus() == RefundStatus.COMPLETED) {
            log.info("Refund already completed for orderId={}", orderId);
            return RefundResult.alreadyCompleted(record);
        }

        record.setStatus(RefundStatus.PROCESSING);
        refundRepository.save(record);

        try {
            String gatewayRefundId = gatewayClient.initiateRefund(record.getChargeId(), record.getAmountCents());
            record.setGatewayRefundId(gatewayRefundId);
            record.setInitiatedAt(Instant.now());
            refundRepository.save(record);

            log.info("Refund initiated orderId={} gatewayRefundId={}", orderId, gatewayRefundId);
            return RefundResult.processing(record);

        } catch (Exception e) {
            record.setStatus(RefundStatus.FAILED);
            refundRepository.save(record);
            log.error("Refund initiation failed orderId={} error={}", orderId, e.getMessage());
            return RefundResult.failed(e.getMessage());
        }
    }

    /**
     * Webhook handler for gateway refund completion events.
     * ADO #51 Fix: Removed age-based filter that was skipping completion for orders > 48h.
     */
    public void handleRefundCompletedWebhook(String gatewayRefundId) {
        refundRepository.findByGatewayRefundId(gatewayRefundId).ifPresent(record -> {
            record.setStatus(RefundStatus.COMPLETED);
            record.setCompletedAt(Instant.now());
            refundRepository.save(record);

            // ADO #33 AC: Customer notified upon refund completion
            notificationClient.sendRefundConfirmation(record.getOrderId(), record.getAmountCents());
            log.info("Refund completed orderId={} gatewayRefundId={}", record.getOrderId(), gatewayRefundId);
        });
    }

    private RefundRecord createRefundRecord(String orderId, String reason) {
        RefundRecord record = new RefundRecord();
        record.setOrderId(orderId);
        record.setReason(reason);
        record.setStatus(RefundStatus.PENDING);
        record.setCreatedAt(Instant.now());
        return refundRepository.save(record);
    }
}
