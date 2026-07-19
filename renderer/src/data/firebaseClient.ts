import { initializeApp } from 'firebase/app';
import {
    connectFirestoreEmulator,
    getFirestore,
    collection,
    collectionGroup,
    getDocs,
    getDoc,
    query,
    orderBy,
    doc,
    setDoc,
    deleteDoc,
    writeBatch,
    QueryDocumentSnapshot,
} from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
// Type-only: library.ts imports api.ts, which will import from this file, so this
// must never become a real runtime import or it'd be a circular dependency.
import type { StoryData, ChapterData } from './library';

// Matches the "demo-" project the local emulator suite runs under
// (see ../../../.firebaserc) so the app works with zero setup before
// a real Firebase project exists.
const DEMO_PROJECT_ID = 'demo-serial-bowl';

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || DEMO_PROJECT_ID;

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
};

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'false';

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
const auth = getAuth(firebaseApp);

// Vite HMR can re-run this module; guard so we don't try to connect/sign-in twice.
const globalFlags = globalThis as unknown as {
    __sbEmulatorsConnected?: boolean;
    __sbAuthReady?: Promise<void>;
};

if (useEmulators && !globalFlags.__sbEmulatorsConnected) {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    globalFlags.__sbEmulatorsConnected = true;
}

// Firestore rules require request.auth != null (see ../../../firestore.rules) -
// not per-user access control (there's only one user), just a gate against
// anyone who didn't come through the app. Every exported Firestore call below
// awaits this first.
if (!globalFlags.__sbAuthReady) {
    globalFlags.__sbAuthReady = signInAnonymously(auth)
        .then(() => {})
        .catch((error) => {
            console.error('Firebase anonymous sign-in failed:', error);
            throw error;
        });
}
export const authReady: Promise<void> = globalFlags.__sbAuthReady;

// Firestore document IDs can't contain "/"; titles are otherwise safe to use directly.
export function toDocId(title: string): string {
    const cleaned = title.trim().replace(/\//g, '-');
    if (!cleaned || cleaned === '.' || cleaned === '..') {
        throw new Error(`Story title can't be used as a Firestore doc id: "${title}"`);
    }
    return cleaned;
}

// Chapters are stored in fixed-size chunks (one Firestore doc holds up to this
// many chapters) instead of one doc per chapter, so loading/reading the library
// costs a handful of document reads instead of one per chapter. Must match the
// chunk size used by main/main.ts and scripts/migrateToFirebase.ts.
const CHAPTER_CHUNK_SIZE = 100;

function chunkDocRef(storyRef: ReturnType<typeof doc>, chunkIndex: number) {
    return doc(collection(storyRef, 'chapterChunks'), chunkIndex.toString().padStart(4, '0'));
}

function chunkArray<T>(items: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        result.push(items.slice(i, i + size));
    }
    return result;
}

// Firestore batches cap at 500 writes; stay comfortably under that.
async function commitInBatches(refs: { ref: any; data?: any }[], op: 'set' | 'delete'): Promise<void> {
    for (const group of chunkArray(refs, 400)) {
        const batch = writeBatch(db);
        group.forEach(({ ref, data }) => {
            if (op === 'set') batch.set(ref, data);
            else batch.delete(ref);
        });
        await batch.commit();
    }
}

// Reconstructs StoryData[] from Firestore's story-doc + chapterChunks-subcollection
// shape - mirrors main/main.ts's loadLibraryFromFirestore for the Electron side.
export async function loadLibraryFromFirestore(): Promise<StoryData[]> {
    await authReady;
    const [storiesSnap, chunksSnap] = await Promise.all([
        getDocs(collection(db, 'stories')),
        getDocs(query(collectionGroup(db, 'chapterChunks'), orderBy('chunkIndex'))),
    ]);

    // A global orderBy('chunkIndex') still guarantees each story's own chunks
    // arrive in ascending order relative to each other, even though it's
    // interleaved with every other story's chunks in the same stream.
    const chaptersByStoryId = new Map<string, ChapterData[]>();
    for (const chunkDoc of chunksSnap.docs) {
        const storyId = chunkDoc.ref.parent.parent!.id;
        const { chapters } = chunkDoc.data() as { chunkIndex: number; chapters: ChapterData[] };
        if (!chaptersByStoryId.has(storyId)) chaptersByStoryId.set(storyId, []);
        chaptersByStoryId.get(storyId)!.push(...chapters);
    }

    return storiesSnap.docs.map((storyDoc) => ({
        ...(storyDoc.data() as Omit<StoryData, 'chapters'>),
        chapters: chaptersByStoryId.get(storyDoc.id) ?? [],
    }));
}

export async function updateStoryMetaFirestore(storyId: string, meta: Partial<StoryData>): Promise<void> {
    await authReady;
    const storyRef = doc(db, 'stories', toDocId(storyId));
    await setDoc(storyRef, meta, { merge: true });
}

// Chapters only ever change a few at a time (mark read, check for updates), but
// each one lives inside a ~100-chapter chunk doc. So for each touched chunk: read
// its current contents, patch just the changed slots, write the whole chunk back.
// Still one read + one write per touched CHUNK, not per chapter.
export async function upsertChaptersFirestore(
    storyId: string,
    chapters: Array<ChapterData & { order: number }>
): Promise<void> {
    await authReady;
    const storyRef = doc(db, 'stories', toDocId(storyId));
    const byChunk = new Map<number, Array<ChapterData & { order: number }>>();
    for (const chapter of chapters) {
        const chunkIndex = Math.floor(chapter.order / CHAPTER_CHUNK_SIZE);
        if (!byChunk.has(chunkIndex)) byChunk.set(chunkIndex, []);
        byChunk.get(chunkIndex)!.push(chapter);
    }

    for (const [chunkIndex, dirtyChapters] of byChunk) {
        const chunkRef = chunkDocRef(storyRef, chunkIndex);
        const existing = await getDoc(chunkRef);
        const currentChapters: ChapterData[] = existing.exists()
            ? (existing.data().chapters as ChapterData[])
            : [];

        for (const { order, ...chapterData } of dirtyChapters) {
            currentChapters[order - chunkIndex * CHAPTER_CHUNK_SIZE] = chapterData;
        }

        await setDoc(chunkRef, { chunkIndex, chapters: currentChapters });
    }
}

// Full rewrite of one story's chapter chunks - mirrors main/main.ts's replaceChapters
// handler. Writes the new chunks first and only deletes now-unneeded leftover chunks
// afterward, so a crash/connection loss mid-operation still leaves the story's
// chapters intact - at worst a few stale extra chunk docs to clean up next time.
export async function replaceChaptersFirestore(storyId: string, chapters: ChapterData[]): Promise<void> {
    await authReady;
    const storyRef = doc(db, 'stories', toDocId(storyId));
    const chunksCol = collection(storyRef, 'chapterChunks');

    const newChunks = chunkArray(chapters, CHAPTER_CHUNK_SIZE);
    const refs = newChunks.map((group, chunkIndex) => ({
        ref: chunkDocRef(storyRef, chunkIndex),
        data: { chunkIndex, chapters: group },
    }));
    await commitInBatches(refs, 'set');

    const existing = await getDocs(chunksCol);
    const staleRefs = existing.docs
        .filter((d: QueryDocumentSnapshot) => (d.data().chunkIndex as number) >= newChunks.length)
        .map((d: QueryDocumentSnapshot) => ({ ref: d.ref }));
    await commitInBatches(staleRefs, 'delete');
}

export async function deleteStoryFirestore(storyId: string): Promise<void> {
    await authReady;
    const storyRef = doc(db, 'stories', toDocId(storyId));
    const chunksCol = collection(storyRef, 'chapterChunks');
    const existing = await getDocs(chunksCol);

    await commitInBatches(existing.docs.map((d: QueryDocumentSnapshot) => ({ ref: d.ref })), 'delete');
    await deleteDoc(storyRef);
}
