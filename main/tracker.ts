// main/tracker.ts
import { Story, Chapter } from './library-shared'; // Or import from renderer if you prefer
import { JSDOM } from 'jsdom';

export async function checkStoryUpdate(story: Story): Promise<Chapter[]> {
    if (story.title.includes("Frieren")) {
        return frierenCheck(story);
    } else if (story.homepage_url.includes("demonicscans.org")) {
        return demonicScansCheck(story);
    //} else if (story.homepage_url.includes("ranobes.net")) {
    //     return ranobesCheck(story);
    } else if (story.homepage_url.includes("royalroad.com")) {
        return royalRoadChecker(story);
    } else if (story.homepage_url.includes("genesistudio.com")) {
        return genesisChecker(story);
    } else {
        throw new Error("No checker assigned to this story");
    }
}

async function baseRequest(url: string): Promise<string> {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://www.google.com/'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch page. Status code: ${response.status}`);
    }

    return await response.text();
}

function latestTitle(story: Story): string {
    console.log("")
    return story.getLastKnownChapter().title;
}

async function demonicScansCheck(story: Story): Promise<Chapter[]> {
    const response = await baseRequest(story.homepage_url);
    const dom = new JSDOM(response);
    const doc = dom.window.document;
    const chaptersDiv = doc.querySelector('div#chapters-list');
    
    if (!chaptersDiv) {
        throw new Error("Could Not Find Chapters");
    }
    
    const items = chaptersDiv.querySelectorAll('li');
    if (story.chapters.length === items.length) {
        return [];
    }
    
    const newChapters: Chapter[] = [];
    const latestChapter = latestTitle(story);

    // Convert NodeList to array and reverse it
    const itemsArray = Array.from(items);
    
    for (const item of itemsArray) {
        const a = item.querySelector('a');
        if (!a) break;
        
        const chapName = a.textContent?.split('\n')[1]?.trim() || '';
        const url = "https://demonicscans.org" + a.getAttribute('href');
        const dateSpan = a.querySelector('span');
        const dateText = dateSpan?.textContent?.trim();
        
        if (!dateText || !chapName) throw new Error(`Failed to parse html correctly`);
        
        const date = new Date(dateText).toLocaleDateString('en-US');
        
        if (chapName === latestChapter) {
            break;
        }

        newChapters.push(Chapter.new(chapName, url, date));
    }

    return newChapters.reverse();
}

// Add these functions to tracker.ts



async function frierenCheck(story: Story): Promise<Chapter[]> {
    console.log(`Trying Frieren with url: ${story.homepage_url}:`)
    const response = await baseRequest(story.homepage_url);
    const dom = new JSDOM(response);
    const doc = dom.window.document;
    const divs = doc.querySelectorAll('div.h-full.main-chapter');
    
    const latestChapter = latestTitle(story);
    const newChapters: Chapter[] = [];

    if (story.chapters.length === divs.length) {
        console.log(`Same Length`)
        return [];
    }

    // Convert NodeList to array and reverse it
    const itemsArray = Array.from(divs);
    
    for (const div of itemsArray) {
        
        const a = div.querySelector('a');
        if (!a) break;
        
        const url = a.getAttribute('href') || '';
        const lines = a.textContent?.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0) || [];
            
        let chapterTitle = `Chapter ${lines[0].split("Chapter ")[1]}`;
        console.log(`New Chapter baby: ${chapterTitle}:`)
        if (lines.length > 1) {
            chapterTitle += `: ${lines[1]}`;
        }
        
        if (chapterTitle === latestChapter) break;
        
        newChapters.push(Chapter.new(chapterTitle, url));
    }
    console.log(`Went through array`)
    return newChapters.reverse();
}

async function royalRoadChecker(story: Story): Promise<Chapter[]> {
    const response = await baseRequest(story.homepage_url);
    
    // Look for the window.chapters assignment
    const chaptersMatch = response.match(/window\.chapters\s*=\s*(\[.*?\])(?=;|$)/s);
    if (!chaptersMatch) {
        throw new Error("Failed to parse html");
    }
    
    let chaptersJson = chaptersMatch[1];
    
    // Clean JSON by handling JavaScript-specific syntax
    chaptersJson = chaptersJson.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    
    const chapters = JSON.parse(chaptersJson) as Array<{
        title: string;
        url: string;
        date: string;
    }>;
    
    if (story.chapters.length === chapters.length) {
        return [];
    }
    
    const latestChapter = latestTitle(story);
    const newChapters: Chapter[] = [];
    
    for (let i = chapters.length - 1; i >= 0; i--) {
        const chapter = chapters[i];
        if (chapter.title === latestChapter) {
            break;
        }
        
        const url = 'https://www.royalroad.com' + chapter.url;
        const date = new Date(chapter.date.replace("Z", "+00:00")).toLocaleDateString('en-US');
        newChapters.push(Chapter.new(chapter.title, url, date));
    }
    
    return newChapters.reverse();
}

async function genesisChecker(story: Story): Promise<Chapter[]> {
    const response = await baseRequest(story.homepage_url);
    
    // Extract the free chapters array using regex
    const match = response.match(/free:(\[.*?\])/s);
    if (!match) {
        throw new Error("Could not find free chapters array.");
    }
    
    let freeChaptersJson = match[1];
    // Fix JSON by adding quotes around property names
    freeChaptersJson = freeChaptersJson.replace(/([{\s,])([A-Za-z_]\w*)\s*:/g, '$1"$2":');
    
    const chapters = JSON.parse(freeChaptersJson) as Array<{
        chapter_number: number;
        chapter_title: string;
        id: number;
        date_created: string;
    }>;
    
    const latestChapter = latestTitle(story);
    const newChapters: Chapter[] = [];
    
    for (let i = chapters.length - 1; i >= 0; i--) {
        const chapter = chapters[i];
        const title = `Ch. ${chapter.chapter_number}: ${chapter.chapter_title}`;
        
        if (title === latestChapter) {
            break;
        }
        
        const url = "https://genesistudio.com/viewer/" + chapter.id;
        const datePublished = new Date(chapter.date_created.replace("Z", "+00:00")).toLocaleDateString('en-US');
        newChapters.push(Chapter.new(title, url, datePublished));
    }
    
    return newChapters.reverse();
}

// Implement other checkers similarly...

// Note: For sites requiring Selenium (like ranobesCheck), you might need a different approach
// since Electron's main process doesn't have a DOM. You could:
// 1. Use a headless browser library like Puppeteer
// 2. Implement a simple HTTP server in the main process that the renderer can communicate with
// 3. Or find alternative scraping methods that don't require a full browser

// Preload.ts would expose this via:
// contextBridge.exposeInMainWorld('trackerAPI', {
//     checkStoryUpdate: (story: Story) => ipcRenderer.invoke('tracker:check-update', story)
// });

// And in main.ts you'd handle the IPC call:
// ipcMain.handle('tracker:check-update', async (event, story) => {
//     return await checkStoryUpdate(story);
// });