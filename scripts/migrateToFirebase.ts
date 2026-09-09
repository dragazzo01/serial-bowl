import {
    doc,
    setDoc,
    getDocs,
    deleteDoc,
    collection,
} from 'firebase/firestore';
import fs from 'fs/promises';
import path from 'path';
// Reuses the same env-driven config, emulator switch, and Auth sign-in as the
// Electron app itself, so this script always talks to whichever project (demo
// emulator or real) main.ts would - see ../main/firebaseClient.ts.
import { db, authReady, toDocId, useEmulators } from '../main/firebaseClient';

const ASSETS_DIR = '/home/dragazzo/Documents/SerialBowl/serial-bowl-assests';
const DEFAULT_LIBRARY_PATH = path.join(ASSETS_DIR, 'library.json');

// Chapters are stored in fixed-size chunks (one Firestore doc holds up to this
// many chapters) instead of one doc per chapter, so loading/reading the library
// costs a handful of document reads instead of one per chapter. Must match the
// chunk size used by main/main.ts and renderer/src/data/firebaseClient.ts.
const CHAPTER_CHUNK_SIZE = 100;

interface ChapterData {
    isRead: boolean;
    title: string;
    url: string | null;
    datePublished: string;
    dateRead: string | null;
}

interface StoryData {
    title: string;
    coverImage: string;
    summary: string;
    homepageURL: string;
    checkForUpdates: boolean;
    status: string;
    additionalInfo: Record<string, string>;
    chapters: ChapterData[];
}

function chunkDocId(chunkIndex: number): string {
    return chunkIndex.toString().padStart(4, '0');
}

async function syncStory(story: StoryData): Promise<void> {
    const storyId = toDocId(story.title);
    const storyRef = doc(db, 'stories', storyId);

    // Stored explicitly so the app can key off a stable id instead of the title -
    // renaming a story would otherwise orphan its Firestore doc (title changes
    // would compute a different doc id every time).
    const { chapters, ...meta } = story;
    await setDoc(storyRef, { ...meta, id: storyId });

    for (let i = 0; i < chapters.length; i += CHAPTER_CHUNK_SIZE) {
        const chunkIndex = i / CHAPTER_CHUNK_SIZE;
        const chunkChapters = chapters.slice(i, i + CHAPTER_CHUNK_SIZE);
        const chunkRef = doc(collection(storyRef, 'chapterChunks'), chunkDocId(chunkIndex));
        await setDoc(chunkRef, { chunkIndex, chapters: chunkChapters });
    }

    // setDoc only ever overwrites, so a story that lost chapters since the last run
    // would keep serving the stale tail out of chunks past its new end. Drop them,
    // otherwise this is an upsert rather than a sync.
    const chunkCount = Math.ceil(chapters.length / CHAPTER_CHUNK_SIZE);
    const existingChunks = await getDocs(collection(storyRef, 'chapterChunks'));
    const staleChunks = existingChunks.docs.filter(chunk => Number(chunk.id) >= chunkCount);
    await Promise.all(staleChunks.map(chunk => deleteDoc(chunk.ref)));

    const dropped = staleChunks.length ? `, dropped ${staleChunks.length} stale chunk(s)` : '';
    console.log(`  synced "${story.title}" (${chapters.length} chapters${dropped})`);
}

// Firestore keeps a subcollection alive independently of its parent, so deleting the
// story doc alone would leave its chapter chunks behind as orphans.
async function deleteStory(storyId: string): Promise<void> {
    const storyRef = doc(db, 'stories', storyId);
    const chunks = await getDocs(collection(storyRef, 'chapterChunks'));
    await Promise.all(chunks.docs.map(chunk => deleteDoc(chunk.ref)));
    await deleteDoc(storyRef);
    console.log(`  removed "${storyId}" (no longer in the library file)`);
}

async function run(): Promise<void> {
    const args = process.argv.slice(2);
    const allowRealProject = args.includes('--allow-real-project');
    const pathArg = args.find(arg => !arg.startsWith('--'));
    const libraryPath = pathArg ? path.resolve(pathArg) : DEFAULT_LIBRARY_PATH;

    const target = useEmulators
        ? 'the local emulator suite (127.0.0.1:8080)'
        : `the REAL Firebase project (${process.env.FIREBASE_PROJECT_ID || 'serialbowl-691dc'})`;
    console.log(`Syncing ${libraryPath}\n     -> ${target}`);

    // This deletes stories missing from the file, so pointing it at the real project
    // with a stale or partial library.json would wipe live data. Nothing about the
    // emulator flow needs the flag; it only guards the irreversible case.
    if (!useEmulators && !allowRealProject) {
        throw new Error(
            'Refusing to sync the real Firebase project without --allow-real-project ' +
            '(this run would delete any story not present in the file). Set ' +
            'SB_USE_FIREBASE_EMULATORS=true in .env to target the emulators instead.'
        );
    }

    await authReady;

    // Images stay out of this for now - Firebase Storage requires the Blaze
    // plan, and Electron already serves them straight off local disk (see
    // main.ts's app-image protocol handler), so Storage isn't needed yet.
    const raw = await fs.readFile(libraryPath, 'utf-8');
    const stories: StoryData[] = JSON.parse(raw);
    if (!Array.isArray(stories)) {
        throw new Error(`${libraryPath} is not an array of stories`);
    }

    for (const story of stories) {
        await syncStory(story);
    }

    const keep = new Set(stories.map(story => toDocId(story.title)));
    const existingStories = await getDocs(collection(db, 'stories'));
    const removed = existingStories.docs.filter(story => !keep.has(story.id));
    for (const story of removed) {
        await deleteStory(story.id);
    }

    console.log(`Done. Synced ${stories.length} stories, removed ${removed.length}.`);
}

run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Sync failed:', err instanceof Error ? err.message : err);
        process.exit(1);
    });
