import type { Locale } from '../account/i18n';
import { call } from '../account/data';
import type { PushPermission } from './bridge';

// Notifications in the app: a sent quote and a shipment that has arrived
// (functions/src/notify.ts). The phone's token is kept against the signed-in
// person; it is given up when they sign out or delete their login.

/** Registers this phone for the signed-in person, if they have allowed notifications. */
export async function syncPush(locale: Locale): Promise<void> {
  const bridge = await import('./bridge');
  const token = await bridge.pushToken();
  if (!token) return;
  await call('registerPushDevice', { token, platform: 'ios', locale, appVersion: await bridge.appVersion() });
}

/** The person chose to turn notifications on: iOS asks them, then the phone is registered. */
export async function enablePush(locale: Locale): Promise<PushPermission> {
  const bridge = await import('./bridge');
  const decided = await bridge.askForPush();
  if (decided === 'granted') await syncPush(locale);
  return decided;
}

export async function pushState(): Promise<PushPermission> {
  const bridge = await import('./bridge');
  return bridge.pushPermission();
}

/** Before signing out: this phone stops receiving the person's notifications. */
export async function releasePush(): Promise<void> {
  try {
    const bridge = await import('./bridge');
    const token = await bridge.pushToken();
    if (!token) return;
    await call('unregisterPushDevice', { token });
    await bridge.forgetPushToken();
  } catch {
    // Signing out never waits on this; the server forgets tokens FCM rejects.
  }
}
