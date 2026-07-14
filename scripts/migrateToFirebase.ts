import {
    doc,
    setDoc,
    collection,
} from 'firebase/firestore';
import fs from 'fs/promises';
import path from 'path';
// Reuses the same env-driven config, emulator switch, and Auth sign-in as the
// Electron app itself, so this script always talks to whichever project (demo
// emulator or real) main.ts would - see ../main/firebaseClient.ts.
import { db, authReady, toDocId } from '../main/firebaseClient';

const ASSETS_DIR = '/home/dragazzo/Documents/SerialBowl/serial-bowl-assests';
const LIBRARY_PATH = path.join(ASSETS_DIR, 'library.json');

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

async function migrateStory(story: StoryData): Promise<void> {
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
        const chunkRef = doc(collection(storyRef, 'chapterChunks'), chunkIndex.toString().padStart(4, '0'));
        await setDoc(chunkRef, { chunkIndex, chapters: chunkChapters });
    }

    console.log(`  migrated "${story.title}" (${chapters.length} chapters)`);
}

async function run(): Promise<void> {
    await authReady;

    // Images stay out of this for now - Firebase Storage requires the Blaze
    // plan, and Electron already serves them straight off local disk (see
    // main.ts's app-image protocol handler), so Storage isn't needed yet.
    console.log('Migrating stories...');
    const raw = await fs.readFile(LIBRARY_PATH, 'utf-8');
    const stories: StoryData[] = JSON.parse(raw);

    for (const story of stories) {
        await migrateStory(story);
    }

    console.log(`Done. Migrated ${stories.length} stories.`);
}

run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
