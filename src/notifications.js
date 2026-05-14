/**
 * Notification Service — v2.0
 * NEW: SMS fallback when push notification delivery is not acknowledged.
 * ADO Feature: SMS Failover (#20)
 * ADO Story: #36 — SMS fallback triggers when push notification fails
 *
 * BUG (ADO #53): sendSMSFallback() calls Twilio directly with no deduplication
 * check. When the notification service restarts mid-delivery (e.g. during a
 * rolling deploy), in-flight events are replayed from the queue. Without a
 * deduplication key, the same event triggers a second SMS to the customer.
 */

const admin = require('firebase-admin');
const twilio = require('twilio');

const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const FROM_NUMBER = process.env.TWILIO_FROM;
const PUSH_ACK_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Sends a push notification and falls back to SMS if not acknowledged.
 */
async function sendNotification(userId, { title, body, data }) {
  const deviceToken = await getDeviceToken(userId);

  if (deviceToken) {
    const messageId = await sendPush(deviceToken, title, body, data);
    if (messageId) {
      const acked = await waitForAck(messageId, PUSH_ACK_TIMEOUT_MS);
      if (acked) {
        console.info('Push delivered and acknowledged', { userId, messageId });
        return { channel: 'push', messageId };
      }
      console.warn('Push not acknowledged within timeout, falling back to SMS', { userId });
    }
  }

  // SMS fallback
  const phone = await getUserPhone(userId);
  if (phone) {
    await sendSMSFallback(phone, body, data.orderId);
    return { channel: 'sms_fallback' };
  }

  console.warn('No delivery channel available for user', { userId });
  return { channel: 'none' };
}

async function sendPush(deviceToken, title, body, data) {
  try {
    return await admin.messaging().send({
      token: deviceToken,
      notification: { title, body },
      data,
    });
  } catch (err) {
    console.error('Push send failed', { error: err.message });
    return null;
  }
}

/**
 * BUG (ADO #53): No deduplication before sending SMS.
 * Should check Redis for a key like `sms:sent:${orderId}` (SETNX) before
 * calling Twilio. Without this, service restarts during a deploy window
 * cause duplicate SMS messages to be sent to customers.
 */
async function sendSMSFallback(phone, message, orderId) {
  // BUG: missing dedup check — should be:
  //   const sent = await redis.set(`sms:sent:${orderId}`, '1', { NX: true, EX: 3600 });
  //   if (!sent) return;
  await twilioClient.messages.create({  // BUG: always sends, no dedup
    body: message,
    from: FROM_NUMBER,
    to: phone,
  });
  console.info('SMS fallback sent', { phone, orderId });
}

async function waitForAck(messageId, timeoutMs) {
  // Simplified: in production this polls a Redis key set by the FCM delivery receipt webhook
  return new Promise(resolve => setTimeout(() => resolve(false), timeoutMs));
}

async function getDeviceToken(userId) {
  return process.env[`FCM_TOKEN_${userId}`] || null;
}

async function getUserPhone(userId) {
  return process.env[`PHONE_${userId}`] || null;
}

module.exports = { sendNotification };
