import 'dotenv/config';
import { app as electronApp } from 'electron';
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';

// Real project config, compiled in as the default so packaged builds work
// without needing a `.env` file bundled alongside them (electron-builder's
// `files` allowlist doesn't include one - see package.json's `build` config).
// This is not a secret: a Firebase web apiKey only identifies which project a
// client talks to, it grants no access by itself - that's enforced by
// firestore.rules (request.auth != null) + Firebase Auth. The same values are
// already shipped inside the deployed PWA's JS bundle via renderer/.env.
// `.env` (SB_USE_FIREBASE_EMULATORS + FIREBASE_* overrides) still lets a dev
// build point at the local emulator instead - see useEmulators below.
const REAL_PROJECT_ID = 'serialbowl-691dc';
const REAL_FIREBASE_CONFIG = {
    apiKey: 'AIzaSyAK_QR8MCdCLz-1WpfcUFI6u76DYaTt9yk',
    authDomain: 'serialbowl-691dc.firebaseapp.com',
    projectId: REAL_PROJECT_ID,
    storageBucket: 'serialbowl-691dc.firebasestorage.app',
    messagingSenderId: '1035811294974',
    appId: '1:1035811294974:web:0893eccc3f06664a229faf',
};

const projectId = process.env.FIREBASE_PROJECT_ID || REAL_PROJECT_ID;

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || REAL_FIREBASE_CONFIG.apiKey,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || REAL_FIREBASE_CONFIG.authDomain,
    projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || REAL_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || REAL_FIREBASE_CONFIG.messagingSenderId,
    appId: process.env.FIREBASE_APP_ID || REAL_FIREBASE_CONFIG.appId,
};

// SB_USE_FIREBASE_EMULATORS, when explicitly set in `.env`, always wins - this is
// how a dev build can be pointed at the real project (set to "false") or a packaged
// build could be pointed at a local emulator for testing (set to "true"). With no
// `.env` at all - always true for a packaged/installed build, since electron-builder
// never bundles one - default to emulators only in an unpackaged dev run, and to the
// real project otherwise. This matters: without it, a packaged app on a machine with
// no local emulator running would default to `true` and fail to connect to anything.
const emulatorsEnvOverride = process.env.SB_USE_FIREBASE_EMULATORS;
export const useEmulators =
    emulatorsEnvOverride !== undefined ? emulatorsEnvOverride !== 'false' : !electronApp.isPackaged;

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
