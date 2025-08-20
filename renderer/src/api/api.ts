// Extend window type for electronAPI
import {StoryData, ChapterData} from '../data/library'
// api.ts
export interface AppAPI {
    loadLibrary: () => Promise<StoryData[]>;
    saveLibrary: (data: StoryData[]) => Promise<{ success: boolean }>;
    checkStoryUpdate: (story: StoryData) => Promise<ChapterData[]>;
    openExternal: (url: string) => void;
    getImageUrl: (relativePath: string) => Promise<string>;
    saveToCloud: () => Promise<{ success: boolean, message: string}>;
}

declare global {
    interface Window {
        electronAPI: {
            loadLibrary: () => Promise<StoryData[]>;
            saveLibrary: (data: StoryData[]) => Promise<{ success: boolean }>;
            checkStoryUpdate: (story: StoryData) => Promise<ChapterData[]>;
            openExternal: (url: string) => void;
            getImageUrl: (relativePath: string) => Promise<string>;
            saveToCloud: () => Promise<{ success: boolean, message: string }>;
        };
    }
}

const electronAPI: AppAPI = {
    loadLibrary: () => window.electronAPI.loadLibrary(),
    saveLibrary: (data) => window.electronAPI.saveLibrary(data),
    checkStoryUpdate: (story) => window.electronAPI.checkStoryUpdate(story),
    openExternal: (url) => window.electronAPI.openExternal(url),
    getImageUrl: (path) => window.electronAPI.getImageUrl(path),
    saveToCloud: () => window.electronAPI.saveToCloud(),
};

const browserAPI: AppAPI = {
    loadLibrary: async (): Promise<StoryData[]> => {
        console.log('HELLO??')
        const data = await fetch("https://dragazzo01.github.io/serial-bowl-assests/library.json")

        if (!data.ok) {
            throw new Error(`Failed to fetch page. Status code: ${data.status}`);
        }

        return JSON.parse(await data.text());

    },

    saveLibrary: async (data: StoryData[]) => {
        localStorage.setItem("library", JSON.stringify(data));
        return { success: true };
    },

    checkStoryUpdate: async (_story: StoryData): Promise<ChapterData[]> => {
        // TODO: replace with real fetch if needed
        return [];
    },

    openExternal: (url: string) => {
        window.open(url, "_blank");
    },

    getImageUrl: async (relativePath: string): Promise<string> => {
        return `https://dragazzo01.github.io/serial-bowl-assests/images/${relativePath}`;
    },

    saveToCloud: async () => {
        return {success: true, message: "Nice Try"}
    }
};


function isElectron(): boolean {
    return !!(window as any).electronAPI;
}

const api: AppAPI = isElectron() ? electronAPI : browserAPI;

export default api;
