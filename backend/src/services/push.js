'use strict';

const { Expo } = require('expo-server-sdk');
const config = require('../config');
const logger = require('../lib/logger');

const expo = new Expo({ accessToken: config.expoAccessToken });

const isValidToken = (t) => Expo.isExpoPushToken(t);

/**
 * Send push notifications. `messages` = [{ to, title, body, data? }].
 * Returns the list of tokens Expo says are dead (DeviceNotRegistered) so the caller can delete them.
 */
async function sendPush(messages) {
  const valid = messages.filter((m) => isValidToken(m.to)).map((m) => ({ sound: 'default', ...m }));
  const deadTokens = [];
  let sent = 0;

  for (const chunk of expo.chunkPushNotifications(valid)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'ok') sent += 1;
        else if (ticket.details?.error === 'DeviceNotRegistered') deadTokens.push(chunk[i].to);
        else logger.warn({ ticket }, 'Expo push ticket error');
      });
    } catch (err) {
      logger.error({ err }, 'Failed to send a push chunk');
    }
  }
  return { sent, deadTokens };
}

module.exports = { sendPush, isValidToken };
