// Extend window type for electronAPI
import {StoryData, ChapterData} from '../data/library'
import {
    loadLibraryFromFirestore,
    updateStoryMetaFirestore,
    upsertChaptersFirestore,
} from '../data/firebaseClient'

export type OrderedChapterData = ChapterData & { order: number };

// api.ts
export interface AppAPI {
    isDev: boolean;
    loadLibrary: () => Promise<StoryData[]>;
    saveLibrary: (data: StoryData[]) => Promise<{ success: boolean }>;
    updateStoryMeta: (storyId: string, meta: Partial<StoryData>) => Promise<{ success: boolean }>;
    upsertChapters: (storyId: string, chapters: OrderedChapterData[]) => Promise<{ success: boolean }>;
    replaceChapters: (storyId: string, chapters: ChapterData[]) => Promise<{ success: boolean }>;
    deleteStoryRemote: (storyId: string) => Promise<{ success: boolean }>;
    getUpdateHTML: (story: StoryData) => Promise<string>;
    parseUpdateHTML: (story: StoryData, response: string) => Promise<ChapterData[]>
    openExternal: (url: string) => void;
    getImageUrl: (relativePath: string) => Promise<string>;
    isElectron: boolean;
}

declare global {
    interface Window {
        electronAPI: {
            isDev: boolean;
            loadLibrary: () => Promise<StoryData[]>;
            saveLibrary: (data: StoryData[]) => Promise<{ success: boolean }>;
            updateStoryMeta: (storyId: string, meta: Partial<StoryData>) => Promise<{ success: boolean }>;
            upsertChapters: (storyId: string, chapters: OrderedChapterData[]) => Promise<{ success: boolean }>;
            replaceChapters: (storyId: string, chapters: ChapterData[]) => Promise<{ success: boolean }>;
            deleteStoryRemote: (storyId: string) => Promise<{ success: boolean }>;
            getUpdateHTML: (story: StoryData) => Promise<string>;
            parseUpdateHTML: (story: StoryData, response: string) => Promise<ChapterData[]>
            openExternal: (url: string) => void;
            getImageUrl: (relativePath: string) => Promise<string>;
            // Electron-only manual export/import via native file dialogs - not part
            // of AppAPI since the PWA build has no equivalent.
            saveLibraryToFile: (data: StoryData[]) => Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }>;
            loadLibraryFromFile: () => Promise<{ success: boolean; canceled?: boolean; stories?: StoryData[]; error?: string }>;
        };
    }
}

const electronAPI: AppAPI = {
    isDev: false, // overwritten below once window.electronAPI is available
    loadLibrary: () => window.electronAPI.loadLibrary(),
    saveLibrary: (data) => window.electronAPI.saveLibrary(data),
    updateStoryMeta: (storyId, meta) => window.electronAPI.updateStoryMeta(storyId, meta),
    upsertChapters: (storyId, chapters) => window.electronAPI.upsertChapters(storyId, chapters),
    replaceChapters: (storyId, chapters) => window.electronAPI.replaceChapters(storyId, chapters),
    deleteStoryRemote: (storyId) => window.electronAPI.deleteStoryRemote(storyId),
    getUpdateHTML: (story: StoryData) => window.electronAPI.getUpdateHTML(story),
    parseUpdateHTML: (story: StoryData, response: string) => window.electronAPI.parseUpdateHTML(story, response),
    openExternal: (url) => window.electronAPI.openExternal(url),
    getImageUrl: (path) => window.electronAPI.getImageUrl(path),
    isElectron: true,
};
const defaultUA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

async function baseRequest(url: string, userAgent: string = defaultUA): Promise<string> {
    const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            "User-Agent": userAgent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    });

    if (!response.ok) {
        console.log(`Failed to fetch page. Status code: ${response.status}`);
        throw new Error(`Failed to fetch page. Status code: ${response.status}`);
    }

    return await response.text();
}


// `import.meta.env.DEV` can't distinguish "local build served with npx serve"
// (npm run serve -> build:localhost, a real production vite build) from "the
// actual deployed GitHub Pages PWA" - both are production builds. So this is
// its own explicit flag instead: everything defaults to Firestore/the emulator
// unless VITE_LIBRARY_SOURCE=static, which build:github sets for the one real
// deployed build that still needs the static library.json fallback.
const useFirestoreLibrary = import.meta.env.VITE_LIBRARY_SOURCE !== 'static';

const browserAPI: AppAPI = {
    isDev: useFirestoreLibrary,

    loadLibrary: async (): Promise<StoryData[]> => {
        if (useFirestoreLibrary) {
            return loadLibraryFromFirestore();
        }

        const data = await fetch("https://dragazzo01.github.io/serial-bowl-assests/library.json")

        if (!data.ok) {
            throw new Error(`Failed to fetch page. Status code: ${data.status}`);
        }

        return JSON.parse(await data.text());
    },

    saveLibrary: async (data: StoryData[]) => {
        console.log('saving file');
        return {success: true}
    },

    updateStoryMeta: async (storyId, meta) => {
        try {
            await updateStoryMetaFirestore(storyId, meta);
            return { success: true };
        } catch (error) {
            console.error('Error updating story meta:', error);
            return { success: false };
        }
    },

    upsertChapters: async (storyId, chapters) => {
        try {
            await upsertChaptersFirestore(storyId, chapters);
            return { success: true };
        } catch (error) {
            console.error('Error upserting chapters:', error);
            return { success: false };
        }
    },

    // The website never issues Firestore deletes - a chapter delete/insert-at-position
    // (structural change) and a story delete both only remove things locally here,
    // and are lost on reload since nothing was actually persisted. Only Electron,
    // which you fully control, can delete for real.
    replaceChapters: async () => {
        console.log('Structural chapter change kept local only - not saved from the website');
        return { success: true };
    },

    deleteStoryRemote: async () => {
        console.log('Story deletion kept local only - not saved from the website');
        return { success: true };
    },

    getUpdateHTML: async (_story: StoryData) => {
        console.log('Not actually going to scrape stories')
        return "";
    },

    parseUpdateHTML: async (story: StoryData, response: string) => {
        throw new Error("Got passed the response!!");
    },

    openExternal: (url: string) => {
        window.open(url, "_blank");
    },

    getImageUrl: async (relativePath: string): Promise<string> => {
        return `https://dragazzo01.github.io/serial-bowl-assests/images/${relativePath}`;
    },

    isElectron: false,
};


function isElectron(): boolean {
    return !!(window as any).electronAPI;
}

if (isElectron()) {
    electronAPI.isDev = window.electronAPI.isDev;
}

const api: AppAPI = isElectron() ? electronAPI : browserAPI;

export default api;
