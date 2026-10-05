import { connectorConfig } from '@basis/shared/dataconnect/platform';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';

// Public web configuration of Firebase project basis-inc. These identifiers
// ship to every browser; access is governed by Auth and by @auth on every
// Data Connect operation, never by hiding this file.
const config = {
  projectId: 'basis-inc',
  appId: '1:355671529737:web:881299c4ce1984a02f1bd8',
  apiKey: 'AIzaSyDq4BudXmb3YxAfYGQi0mpVwWqrz_7aCik',
  authDomain: 'basis-inc.firebaseapp.com',
  storageBucket: 'basis-inc.firebasestorage.app',
  messagingSenderId: '355671529737',
};

export const app = initializeApp(config);
export const auth = getAuth(app);
export const dataConnect = getDataConnect(app, connectorConfig);

// Development talks to the local emulators, never to production data.
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDataConnectEmulator(dataConnect, '127.0.0.1', 9399);
}
