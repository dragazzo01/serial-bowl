// Extend window type for electronAPI
import {StoryData, ChapterData} from '../data/library'
// api.ts
export interface AppAPI {
    loadLibrary: () => Promise<StoryData[]>;
    saveLibrary: (data: StoryData[]) => Promise<{ success: boolean }>;
    getUpdateHTML: (story: StoryData) => Promise<string>;
    parseUpdateHTML: (story: StoryData, response: string) => Promise<ChapterData[]>
    openExternal: (url: string) => void;
    getImageUrl: (relativePath: string) => Promise<string>;
    saveToCloud: (data: StoryData[]) => Promise<{ success: boolean, message: string}>;
    isElectron: boolean;
}

declare global {
    interface Window {
        electronAPI: {
            loadLibrary: () => Promise<StoryData[]>;
            saveLibrary: (data: StoryData[]) => Promise<{ success: boolean }>;
            getUpdateHTML: (story: StoryData) => Promise<string>;
            parseUpdateHTML: (story: StoryData, response: string) => Promise<ChapterData[]>
            openExternal: (url: string) => void;
            getImageUrl: (relativePath: string) => Promise<string>;
            saveToCloud: (data: StoryData[]) => Promise<{ success: boolean, message: string }>;
        };
    }
}

const electronAPI: AppAPI = {
    loadLibrary: () => window.electronAPI.loadLibrary(),
    saveLibrary: (data) => window.electronAPI.saveLibrary(data),
    getUpdateHTML: (story: StoryData) => window.electronAPI.getUpdateHTML(story),
    parseUpdateHTML: (story: StoryData, response: string) => window.electronAPI.parseUpdateHTML(story, response),
    openExternal: (url) => window.electronAPI.openExternal(url),
    getImageUrl: (path) => window.electronAPI.getImageUrl(path),
    saveToCloud: (data) => window.electronAPI.saveToCloud(data),
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


const browserAPI: AppAPI = {
    loadLibrary: async (): Promise<StoryData[]> => {
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

    getUpdateHTML: async (story: StoryData) => {
        if(story.homepageURL.includes("frieren.online")) {
            return baseRequest(story.homepageURL);
        } else if(story.homepageURL.includes("demonicscans.org")) {
            return baseRequest(story.homepageURL);
        } else if (story.homepageURL.includes("lightnovelworld.org")) {
            return baseRequest(story.additionalInfo.chaptersLink);
        } else if (story.homepageURL.includes("royalroad.com")) {
            return baseRequest(story.homepageURL);
        } else if (story.homepageURL.includes("genesistudio.com")) {
            return baseRequest(story.additionalInfo.chaptersLink);
        } else if (story.homepageURL.includes("mangadex.org")) {
            return baseRequest(`https://api.mangadex.org/chapter?manga=${story.additionalInfo.mangaID}&translatedLanguage[]=en&order[chapter]=desc&limit=30`);
        } else {
            throw new Error("No scrapper assigned to this story");
        }
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

    saveToCloud: async (data: StoryData[]) => {
        console.log('saved to cloud (not)');
        return {success: true, message: "Can't Do this without electron"};
    },

    isElectron: false,
};


function isElectron(): boolean {
    return !!(window as any).electronAPI;
}

const api: AppAPI = isElectron() ? electronAPI : browserAPI;

export default api;
