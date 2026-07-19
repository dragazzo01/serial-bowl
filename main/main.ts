// Polyfill browser-like globals for undici (Node fetch)
import { Blob } from "buffer";

if (!(global as any).File) {
  class File extends Blob {
    name: string;
    lastModified: number;

    constructor(chunks: any[], name: string, options: any = {}) {
      super(chunks, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  }
  (global as any).File = File;
}

import { app, BrowserWindow, ipcMain, shell, protocol, dialog } from 'electron';
import { getStoryUpdateHTML, parseStoryUpdateHTML } from './tracker';
import { Story, StoryData, ChapterData } from './lib';
import path from 'path';
import fs from 'fs/promises';
import { collection, collectionGroup, getDocs, getDoc, query, orderBy, doc, setDoc, deleteDoc, writeBatch, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, toDocId, authReady } from './firebaseClient';

const PUBLIC_PATH = path.join(__dirname, '../../public/');
const ASSETSDIR = "/home/dragazzo/Documents/SerialBowl/serial-bowl-assests";

const isDev = !app.isPackaged; // true when running `npm run dev` - gates window loading only; storage is always Firestore, dev and packaged alike

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(PUBLIC_PATH, 'icon.ico')
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.maximize();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  protocol.handle('app-image', async (request) => {
    try {
      const relativePath = path.normalize(
        decodeURIComponent(request.url.replace('app-image:///', ''))
      );

      const actualPath = path.join(ASSETSDIR, 'images', relativePath);

      const buffer = await fs.readFile(actualPath);

      // Convert Buffer into Uint8Array
      const uint8 = new Uint8Array(buffer);

      return new Response(uint8, {
        headers: {
          "Content-Type": getMimeType(actualPath),
        },
      });
    } catch (error) {
      console.error(`Error loading image:`, error);
      return new Response(null, { status: 404 });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Helper function to get MIME type
function getMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}


// Chapters are stored in fixed-size chunks (one Firestore doc holds up to this
// many chapters) instead of one doc per chapter, so loading/reading the library
// costs a handful of document reads instead of one per chapter. Must match the
// chunk size used by renderer/src/data/firebaseClient.ts and scripts/migrateToFirebase.ts.
const CHAPTER_CHUNK_SIZE = 100;

function chunkArray<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

// Reconstructs StoryData[] from Firestore's story-doc + chapterChunks-subcollection
// shape, so the rest of the app can keep treating library data as a flat array.
// Uses one collectionGroup query for every story's chunks instead of querying each
// story's subcollection separately, and each chunk holds ~100 chapters instead of
// 1 - together that's what keeps startup to a couple of document reads.
async function loadLibraryFromFirestore(): Promise<StoryData[]> {
  await authReady;
  const [storiesSnap, chunksSnap] = await Promise.all([
    getDocs(collection(db, 'stories')),
    getDocs(query(collectionGroup(db, 'chapterChunks'), orderBy('chunkIndex'))),
  ]);

  // A global orderBy('chunkIndex') still guarantees each story's own chunks arrive
  // in ascending order relative to each other, even though it's interleaved with
  // every other story's chunks in the same stream.
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

// Handle loading the library
ipcMain.handle('loadLibrary', async () => {
  try {
    return await loadLibraryFromFirestore();
  } catch (error) {
    console.error('Error loading library:', error);
    return [];
  }
});

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

function chunkDocRef(storyRef: ReturnType<typeof doc>, chunkIndex: number) {
  return doc(collection(storyRef, 'chapterChunks'), chunkIndex.toString().padStart(4, '0'));
}

// Granular writes for the Firestore/emulator path only (see loadLibraryFromFirestore
// above) — these exist so reading/marking-read doesn't rewrite the whole library on
// every action, which would burn through Firestore's free daily write quota fast.
ipcMain.handle('updateStoryMeta', async (_, storyId: string, meta: Partial<StoryData>) => {
  try {
    await authReady;
    const storyRef = doc(db, 'stories', toDocId(storyId));
    await setDoc(storyRef, meta, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating story meta:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// Chapters only ever change a few at a time (mark read, check for updates), but
// each one lives inside a ~100-chapter chunk doc. So for each touched chunk: read
// its current contents, patch just the changed slots, write the whole chunk back.
// Still one read + one write per touched CHUNK, not per chapter.
ipcMain.handle('upsertChapters', async (_, storyId: string, chapters: Array<ChapterData & { order: number }>) => {
  try {
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

      // A hole here means some earlier chapter in this chunk was never written -
      // Firestore rejects `undefined` array slots, so fail loudly instead of
      // writing (or crashing on) a corrupt chunk.
      if (Object.keys(currentChapters).length !== currentChapters.length) {
        throw new Error(`Chunk ${chunkIndex} for story "${storyId}" has missing chapters - refusing to write a sparse chunk`);
      }

      await setDoc(chunkRef, { chunkIndex, chapters: currentChapters });
    }

    return { success: true };
  } catch (error) {
    console.error('Error upserting chapters:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// Full rewrite of one story's chapter chunks. Only used for the rare structural
// edits (insert/delete a chapter mid-list shifts every order after it) - still
// far cheaper than touching every other story in the library.
//
// Writes the new chunks first and only deletes now-unneeded leftover chunks
// (chapter count shrank) afterward, so a crash/connection loss mid-operation
// still leaves the story's chapters intact - at worst a few stale extra chunk
// docs to clean up on the next successful replaceChapters call.
ipcMain.handle('replaceChapters', async (_, storyId: string, chapters: ChapterData[]) => {
  try {
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

    return { success: true };
  } catch (error) {
    console.error('Error replacing chapters:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('deleteStory', async (_, storyId: string) => {
  try {
    await authReady;
    const storyRef = doc(db, 'stories', toDocId(storyId));
    const chunksCol = collection(storyRef, 'chapterChunks');
    const existing = await getDocs(chunksCol);

    await commitInBatches(existing.docs.map((d: QueryDocumentSnapshot) => ({ ref: d.ref })), 'delete');
    await deleteDoc(storyRef);

    return { success: true };
  } catch (error) {
    console.error('Error deleting story:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('getUpdateHTML', async (_, storydata) => {
    const story = new Story(storydata);
    const response = getStoryUpdateHTML(story);
    return response
});

ipcMain.handle('parseUpdateHTML', async (_, storydata, response) => {
  const story = new Story(storydata);
  const newChapters = await parseStoryUpdateHTML(story, response);
  return newChapters.map(chapter => chapter.serialize());
});

// Add this IPC handler in main.ts (place it with the other handlers)
ipcMain.handle('openExternal', async (_, url) => {
  shell.openExternal(url);
});

// getImageURL is app.whenReady().then(()=> ...)

// Electron-only manual export/import, using native OS file dialogs. Not part of
// the isomorphic api.ts contract - the PWA build has no equivalent.
ipcMain.handle('saveLibraryToFile', async (_, data: StoryData[]) => {
  try {
    const options: Electron.SaveDialogOptions = {
      title: 'Save Library',
      defaultPath: 'library.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    };
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const { canceled, filePath } = focusedWindow
      ? await dialog.showSaveDialog(focusedWindow, options)
      : await dialog.showSaveDialog(options);
    if (canceled || !filePath) return { success: false, canceled: true };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, filePath };
  } catch (error) {
    console.error('Error saving library to file:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('loadLibraryFromFile', async () => {
  try {
    const options: Electron.OpenDialogOptions = {
      title: 'Load Library',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    };
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const { canceled, filePaths } = focusedWindow
      ? await dialog.showOpenDialog(focusedWindow, options)
      : await dialog.showOpenDialog(options);
    if (canceled || filePaths.length === 0) return { success: false, canceled: true };

    const raw = await fs.readFile(filePaths[0], 'utf-8');
    const stories: StoryData[] = JSON.parse(raw);
    return { success: true, stories };
  } catch (error) {
    console.error('Error loading library from file:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});
