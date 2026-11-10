import { connectorConfig } from '@basis/shared/dataconnect/customer';
import { FUNCTIONS_REGION } from '@basis/shared';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence } from 'firebase/auth';
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

// The portal's Firebase: the same public web configuration as the platform
// (it ships to every browser and is restricted in Google Cloud to the BASIS
// origins); what a customer can read is decided by the claim role = customer
// and by @auth on the `customer` connector, never by hiding this file. The
// portal is client-only: nothing here runs while the public pages prerender.

const config = {
  projectId: 'basis-inc',
  appId: '1:355671529737:web:881299c4ce1984a02f1bd8',
  apiKey: 'AIzaSyDq4BudXmb3YxAfYGQi0mpVwWqrz_7aCik',
  authDomain: 'basis-inc.firebaseapp.com',
  storageBucket: 'basis-inc.firebasestorage.app',
  messagingSenderId: '355671529737',
};

const fresh = getApps().length === 0;
export const app = fresh ? initializeApp(config) : getApp();
export const auth = getAuth(app);
export const dataConnect = getDataConnect(app, connectorConfig);
export const functions = getFunctions(app, FUNCTIONS_REGION);

// Development talks to the local emulators, never to production data.
if (fresh && import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDataConnectEmulator(dataConnect, '127.0.0.1', 9399);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
void setPersistence(auth, browserLocalPersistence);

/** The api function: same origin in production, the emulator in development. */
export const API = import.meta.env.DEV ? 'http://127.0.0.1:5001/basis-inc/europe-west1/api' : '/api';
export const apiUrl = (path: string) => (path.startsWith('/api') ? `${API}${path.slice(4)}` : path);
