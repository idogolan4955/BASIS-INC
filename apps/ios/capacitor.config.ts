import type { CapacitorConfig } from '@capacitor/cli';

// The BASIS customer app (docs/APP_STORE.md). The portal of the brand site,
// built from apps/web and bundled into the app (scripts/bundle.mjs), served
// at capacitor://localhost; the site's home route sends the app to /account.
// Data is always live: the bundle talks to Firebase Auth, Data Connect and
// the functions over HTTPS.

const config: CapacitorConfig = {
  appId: 'com.basisinc.customer',
  appName: 'BASIS',
  webDir: 'www',
  ios: {
    scheme: 'App',
    contentInset: 'never',
    backgroundColor: '#F3EEE6',
  },
  plugins: {
    SplashScreen: {
      // The web app hides it once the account frame has drawn.
      launchAutoHide: false,
      backgroundColor: '#F3EEE6',
      showSpinner: false,
    },
    FirebaseMessaging: {
      presentationOptions: ['alert', 'badge', 'sound'],
    },
  },
};

export default config;
