import { App } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { appPath } from './platform';

// What the app does natively. Loaded only by the app's bundle, and only from
// inside a function, so the site never downloads it.

interface BasisDocumentPlugin {
  open(options: { url: string; token: string; filename: string }): Promise<void>;
  share(options: { url: string; token: string; filename: string }): Promise<void>;
  shareLink(options: { text: string; url: string }): Promise<void>;
}

/** apps/ios/ios/App/App/BasisNative.swift */
const BasisDocument = registerPlugin<BasisDocumentPlugin>('BasisDocument');

/** Links that open the app, notifications that are tapped, and the launch screen. */
export async function startApp(navigate: (path: string) => void): Promise<() => void> {
  const handles = await Promise.all([
    App.addListener('appUrlOpen', ({ url }) => navigate(appPath(url))),
    FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
      const path = (notification.data as { path?: unknown } | undefined)?.path;
      navigate(typeof path === 'string' ? appPath(`https://basis-inc.web.app${path}`) : '/account');
    }),
  ]);
  void SplashScreen.hide({ fadeOutDuration: 250 });
  return () => {
    for (const handle of handles) if (handle && 'remove' in handle) void handle.remove();
  };
}

export type PushPermission = 'granted' | 'denied' | 'prompt';

export async function pushPermission(): Promise<PushPermission> {
  const { receive } = await FirebaseMessaging.checkPermissions();
  return receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'prompt';
}

/** Asks iOS for permission when the person chooses to; returns what they decided. */
export async function askForPush(): Promise<PushPermission> {
  const { receive } = await FirebaseMessaging.requestPermissions();
  return receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'prompt';
}

/** iOS hands the phone's push address to the app a moment after launch; wait for it once. */
function apnsAddress(within: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, within);
    void FirebaseMessaging.addListener('apnsTokenReceived', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/** This phone's Firebase Cloud Messaging token, or null without permission. */
export async function pushToken(): Promise<string | null> {
  if ((await pushPermission()) !== 'granted') return null;
  try {
    return (await FirebaseMessaging.getToken()).token || null;
  } catch {
    await apnsAddress(8000);
    return (await FirebaseMessaging.getToken()).token || null;
  }
}

export async function forgetPushToken(): Promise<void> {
  await FirebaseMessaging.deleteToken();
}

export async function appVersion(): Promise<string> {
  const info = await App.getInfo();
  return `${info.version} (${info.build})`;
}

/** A link for someone else (an invitation) through the phone's share sheet. */
export async function shareLink(text: string, url: string): Promise<void> {
  await BasisDocument.shareLink({ text, url });
}

export async function nativeDocument(action: 'open' | 'share', url: string, token: string, filename: string): Promise<void> {
  await BasisDocument[action]({ url, token, filename });
}
