import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    connectFirestoreEmulator,
    doc,
    setDoc,
    collection,
} from 'firebase/firestore';
import {
    getStorage,
    connectStorageEmulator,
    ref,
    uploadBytes,
} from 'firebase/storage';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ID = 'demo-serial-bowl';
const ASSETS_DIR = '/home/dragazzo/Documents/SerialBowl/serial-bowl-assests';
const LIBRARY_PATH = path.join(ASSETS_DIR, 'library.json');
const IMAGES_DIR = path.join(ASSETS_DIR, 'images');

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

// Firestore document IDs can't contain "/"; titles are otherwise safe to use directly.
function toDocId(title: string): string {
    const cleaned = title.trim().replace(/\//g, '-');
    if (!cleaned || cleaned === '.' || cleaned === '..') {
        throw new Error(`Story title can't be used as a Firestore doc id: "${title}"`);
    }
    return cleaned;
}

async function walk(dir: string, base: string = dir): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await walk(full, base)));
        } else {
            files.push(path.relative(base, full));
        }
    }
    return files;
}

async function uploadImages(storage: ReturnType<typeof getStorage>): Promise<void> {
    const files = await walk(IMAGES_DIR);
    console.log(`Uploading ${files.length} image(s)...`);
    for (const relPath of files) {
        const buffer = await fs.readFile(path.join(IMAGES_DIR, relPath));
        const storageRef = ref(storage, `images/${relPath}`);
        await uploadBytes(storageRef, buffer);
        console.log(`  uploaded images/${relPath}`);
    }
}

async function migrateStory(
    db: ReturnType<typeof getFirestore>,
    story: StoryData,
): Promise<void> {
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
    const app = initializeApp({
        projectId: PROJECT_ID,
        storageBucket: `${PROJECT_ID}.appspot.com`,
    });
    const db = getFirestore(app);
    const storage = getStorage(app);
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);

    await uploadImages(storage);

    console.log('Migrating stories...');
    const raw = await fs.readFile(LIBRARY_PATH, 'utf-8');
    const stories: StoryData[] = JSON.parse(raw);

    for (const story of stories) {
        await migrateStory(db, story);
    }

    console.log(`Done. Migrated ${stories.length} stories.`);
}

run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
