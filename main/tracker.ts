// main/tracker.ts
import { Story, Chapter } from './lib'; // Or import from renderer if you prefer
import puppeteer from "puppeteer";
import { JSDOM } from 'jsdom';

export async function checkStoryUpdate(story: Story): Promise<Chapter[]> {
    if (story.homepageURL.includes("frieren.online")) {
        return frierenCheck(story);
    } else if (story.homepageURL.includes("demonicscans.org")) {
        return demonicScansCheck(story);
    } else if (story.homepageURL.includes("ranobes.net")) {
        return ranobesCheck(story);
    } else if (story.homepageURL.includes("royalroad.com")) {
        return royalRoadChecker(story);
    } else if (story.homepageURL.includes("genesistudio.com")) {
        return genesisChecker(story);
    } else {
        throw new Error("No checker assigned to this story");
    }
}
const defaultUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
export async function baseRequest(url: string, userAgent: string = defaultUA): Promise<string> {
    const response = await fetch(url, { 
        method: "GET",
        credentials: "include",  // 🔑 send browser cookies
        headers: {
            "User-Agent": userAgent, // use the real browser UA
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch page. Status code: ${response.status}`);
    }

    return await response.text();
}

export function latestTitle(story: Story): string {
    return story.getLastKnownChapter().title;
}

async function ranobesCheck(story: Story): Promise<Chapter[]> {
    const browser = await puppeteer.launch({
        headless: false, // show browser so you can solve CAPTCHA
    });
    const page = await browser.newPage();

    await page.goto(story.additionalInfo?.chapters_link, {
        waitUntil: "domcontentloaded"
    });

    // Give yourself some time to solve the captcha manually
    await new Promise(resolve => setTimeout(resolve, 6000));

    const response = await page.content();
    await browser.close();

    // maybe one of these days
    // console.log(userAgent);
    //const response = await baseRequest('https://ranobes.net/chapters/1205249/');

    const dom = new JSDOM(response);
    const doc = dom.window.document;

    // Grab all chapter blocks
    const divs = doc.querySelectorAll('div.cat_block.cat_line');
    const latestChapter = latestTitle(story);
    const newChapters: Chapter[] = [];

    if (divs.length > 0) {
        const firstChild = divs[0].querySelector('*'); // first element inside
        if (firstChild && firstChild.getAttribute('title') === latestChapter) {
            return [];
        }
    } else {
        throw new Error("No Chapters Detected (likely a captcha)"); 
    }

    for (const div of Array.from(divs)) {
        const firstChild = div.querySelector('*'); // gets the first element inside
        if (!firstChild) continue;

        const chapTitle = firstChild.getAttribute('title') || '';
        const url = firstChild.getAttribute('href') || '';
        console.log(`${chapTitle}`)

        if (chapTitle === latestChapter) {
            break;
        }
        newChapters.push(Chapter.new(chapTitle, url));
    }
    return newChapters.reverse();
}

async function demonicScansCheck(story: Story): Promise<Chapter[]> {
    const response = await baseRequest(story.homepageURL);
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
    const response = await baseRequest(story.homepageURL);
    const dom = new JSDOM(response);
    const doc = dom.window.document;
    const divs = doc.querySelectorAll('div.h-full.main-chapter');
    
    const latestChapter = latestTitle(story);
    const newChapters: Chapter[] = [];

    if (story.chapters.length === divs.length) {
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
        if (lines.length > 1) {
            chapterTitle += `: ${lines[1]}`;
        }
        
        if (chapterTitle === latestChapter) break;
        
        newChapters.push(Chapter.new(chapterTitle, url));
    }
    return newChapters.reverse();
}

async function royalRoadChecker(story: Story): Promise<Chapter[]> {
    const response = await baseRequest(story.homepageURL);
    
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
    const response = await baseRequest(story.homepageURL);
    
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
