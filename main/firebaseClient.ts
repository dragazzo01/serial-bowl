import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Matches the "demo-" project the local emulator suite runs under
// (see ../.firebaserc) so this works with zero setup before a real
// Firebase project exists.
const PROJECT_ID = 'demo-serial-bowl';

const app = initializeApp({
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.appspot.com`,
});

export const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

// Firestore document IDs can't contain "/"; titles are otherwise safe to use directly.
export function toDocId(title: string): string {
    const cleaned = title.trim().replace(/\//g, '-');
    if (!cleaned || cleaned === '.' || cleaned === '..') {
        throw new Error(`Story title can't be used as a Firestore doc id: "${title}"`);
    }
    return cleaned;
}
