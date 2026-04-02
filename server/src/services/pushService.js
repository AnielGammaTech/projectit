import apn from '@parse/node-apn';
import path from 'path';
import { fileURLToPath } from 'url';
import entityService from './entityService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let apnProvider = null;

function getProvider() {
  if (apnProvider) return apnProvider;

  const keyId = process.env.APNS_KEY_ID || 'KC49B6DQLT';
  const teamId = process.env.APNS_TEAM_ID || '98K2QQUBAS';
  // APNS_PRODUCTION explicitly controls sandbox vs production APNs
  // Default to false (sandbox) since Xcode debug builds use development entitlement
  const production = process.env.APNS_PRODUCTION === 'true';

  // Support key as base64 env var (for Railway) or file path (for local dev)
  let keyOption;
  if (process.env.APNS_KEY_BASE64) {
    keyOption = Buffer.from(process.env.APNS_KEY_BASE64, 'base64');
  } else if (process.env.APNS_KEY_CONTENT) {
    keyOption = Buffer.from(process.env.APNS_KEY_CONTENT.replace(/\\n/g, '\n'));
  } else {
    keyOption = process.env.APNS_KEY_PATH || path.join(__dirname, '../../AuthKey_KC49B6DQLT.p8');
  }

  try {
    apnProvider = new apn.Provider({
      token: {
        key: keyOption,
        keyId,
        teamId,
      },
      production,
    });
    console.log(`APNs provider initialized (${production ? 'production' : 'sandbox'})`);
    return apnProvider;
  } catch (err) {
    console.error('Failed to initialize APNs provider:', err.message);
    return null;
  }
}

/**
 * Register a device token for a user.
 * Stores in DeviceToken entity (creates if not exists, updates if exists).
 */
export async function registerDeviceToken(userEmail, token, platform = 'ios') {
  // Check if this token already exists
  const existing = await entityService.filter('DeviceToken', { token, user_email: userEmail });
  if (existing.length > 0) {
    // Update last_seen
    await entityService.update('DeviceToken', existing[0].id, {
      user_email: userEmail,
      token,
      platform,
      last_seen: new Date().toISOString(),
    });
    return existing[0];
  }

  // Create new token
  return entityService.create('DeviceToken', {
    user_email: userEmail,
    token,
    platform,
    last_seen: new Date().toISOString(),
    active: true,
  });
}

/**
 * Send a push notification to a user's devices.
 */
export async function sendPushNotification(userEmail, { title, body, data = {} }) {
  const provider = getProvider();
  if (!provider) {
    console.warn('APNs not configured — skipping push to', userEmail);
    return { sent: 0 };
  }

  // Get all active device tokens for this user
  let tokens = [];
  try {
    tokens = await entityService.filter('DeviceToken', { user_email: userEmail, active: true });
  } catch (err) {
    // DeviceToken entity might not exist yet
    console.warn('Could not fetch device tokens:', err.message);
    return { sent: 0 };
  }

  if (tokens.length === 0) return { sent: 0 };

  const notification = new apn.Notification();
  notification.expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  notification.badge = 1;
  notification.sound = 'default';
  notification.alert = { title, body };
  notification.payload = data;
  notification.topic = 'com.gammatech.projectit';

  let sentCount = 0;
  const failedTokens = [];

  for (const deviceToken of tokens) {
    try {
      const result = await provider.send(notification, deviceToken.token);
      if (result.sent.length > 0) {
        sentCount++;
      }
      if (result.failed.length > 0) {
        failedTokens.push(deviceToken);
        // Deactivate invalid tokens
        for (const failure of result.failed) {
          if (failure.status === '410' || failure.response?.reason === 'Unregistered') {
            await entityService.update('DeviceToken', deviceToken.id, { active: false });
            console.log(`Deactivated stale token for ${userEmail}`);
          }
        }
      }
    } catch (err) {
      console.error(`Push failed for token ${deviceToken.token.substring(0, 10)}...:`, err.message);
    }
  }

  return { sent: sentCount, failed: failedTokens.length };
}

export default { registerDeviceToken, sendPushNotification };
