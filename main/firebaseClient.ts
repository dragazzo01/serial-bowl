import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';

// Matches the "demo-" project the local emulator suite runs under
// (see ../.firebaserc) so this works with zero setup before a real
// Firebase project exists.
const DEMO_PROJECT_ID = 'demo-serial-bowl';

const projectId = process.env.FIREBASE_PROJECT_ID || DEMO_PROJECT_ID;

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || 'demo-api-key',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '000000000000',
    appId: process.env.FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
};

// Defaults to true so a plain `npm run dev` still talks to the local emulator
// with zero config. Set SB_USE_FIREBASE_EMULATORS=false (alongside real
// FIREBASE_* values above) to point this process at a real project instead -
// independent of app.isPackaged, so a real project can be tested from a dev
// build before ever building/packaging against it.
export const useEmulators = process.env.SB_USE_FIREBASE_EMULATORS !== 'false';

export const firebaseApp = initializeApp(firebaseConfig);
const app = firebaseApp;
export const db = getFirestore(app);
const auth = getAuth(app);

if (useEmulators) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}

// Firestore rules require request.auth != null (see ../firestore.rules) - this
// isn't per-user access control, just a gate against anyone who didn't come
// through the app. Every Firestore call below must await this first.
export const authReady: Promise<void> = signInAnonymously(auth)
    .then(() => {})
    .catch((error) => {
        console.error('Firebase anonymous sign-in failed:', error);
        throw error;
    });

// Firestore document IDs can't contain "/"; titles are otherwise safe to use directly.
export function toDocId(title: string): string {
    const cleaned = title.trim().replace(/\//g, '-');
    if (!cleaned || cleaned === '.' || cleaned === '..') {
        throw new Error(`Story title can't be used as a Firestore doc id: "${title}"`);
    }
    return cleaned;
}
