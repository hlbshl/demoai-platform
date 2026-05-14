/**
 * Notification Service — v1.0
 * Push notifications only. No SMS fallback in v1.0.
 * ADO Feature: Push Notification Service (#19)
 */

const admin = require('firebase-admin');

/**
 * Send a push notification to a user's device.
 * Returns messageId on success, null on failure (non-fatal).
 */
async function sendNotification(userId, { title, body, data }) {
  const deviceToken = await getDeviceToken(userId);
  if (!deviceToken) {
    console.warn('No device token for user', userId);
    return null;
  }

  try {
    const messageId = await admin.messaging().send({
      token: deviceToken,
      notification: { title, body },
      data,
    });
    console.info('Push notification sent', { userId, messageId });
    return messageId;
  } catch (err) {
    console.error('Push notification failed', { userId, error: err.message });
    return null;
  }
}

async function getDeviceToken(userId) {
  // In production this looks up the FCM token from user profile store
  return process.env[`FCM_TOKEN_${userId}`] || null;
}

module.exports = { sendNotification };
