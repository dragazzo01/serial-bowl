// main/tracker.ts
import puppeteer from "puppeteer";
import { Story, Chapter } from './lib';
import * as cheerio from "cheerio";

export async function getStoryUpdateHTML(story: Story): Promise<string> {
    if (story.homepageURL.includes("frieren.online")) {
        return baseRequest(story.homepageURL);
    } else if (story.homepageURL.includes("demonicscans.org")) {
        return baseRequest(story.homepageURL);
    } else if (story.homepageURL.includes("ranobes.net")) {
        return puppeteerRequest(story.additionalInfo.chaptersLink);
    } else if (story.homepageURL.includes("lightnovelworld.org")) {
        return baseRequest(story.additionalInfo.chaptersLink);
    } else if (story.homepageURL.includes("royalroad.com")) {
        return baseRequest(story.homepageURL);
    } else if (story.homepageURL.includes("genesistudio.com")) {
        return baseRequest(story.additionalInfo.chaptersLink);
    } else if (story.homepageURL.includes("mangadex.org")) {
        return baseRequest(`https://api.mangadex.org/chapter?manga=${story.additionalInfo.mangaID}&translatedLanguage[]=en&order[chapter]=desc&limit=100`);
    } else {
        throw new Error("No scrapper assigned to this story");
    }
}

async function puppeteerRequest(url: string): Promise<string> {
    const browser = await puppeteer.launch({
        headless: false, // show browser so you can solve CAPTCHA
    });
    const page = await browser.newPage();

    await page.goto(url, {
        waitUntil: "domcontentloaded"
    });

    // Give yourself some time to solve the captcha manually
    await new Promise(resolve => setTimeout(resolve, 6000));

    const response = await page.content();
    await browser.close();
    return response;
}
const defaultUA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

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
        throw new Error(`Failed to fetch page. Status code: ${response.status}`);
    }

    return await response.text();
}

export async function parseStoryUpdateHTML(story: Story, data: string): Promise<Chapter[]> {
    if (story.homepageURL.includes("frieren.online")) {
        return parseFrieren(story, data);
    } else if (story.homepageURL.includes("demonicscans.org")) {
        return parseDemoicScans(story, data);
    } else if (story.homepageURL.includes("ranobes.net")) {
        return parseRanobes(story, data);
    } else if (story.homepageURL.includes("lightnovelworld.org")) {
        return parseLNW(story, data);
    } else if (story.homepageURL.includes("royalroad.com")) {
        return parseRoyalRoad(story, data);
    } else if (story.homepageURL.includes("genesistudio.com")) {
        return parseGenesis(story, data);
    } else if (story.homepageURL.includes("mangadex.org")) {
        return parseMangaDex(story, data);
    } else {
        throw new Error("No scrapper assigned to this story");
    }
}


function latestTitle(story: Story): string {
    return story.getLastKnownChapter().title;
}

// // ❌ Puppeteer-based — leave stub
// async function ranobesCheck(_: Story): Promise<Chapter[]> {
//     throw new Error("ranobesCheck must be run locally (Puppeteer required)");
// }

async function parseRanobes(story: Story, response: string): Promise<Chapter[]> {
    const $ = cheerio.load(response);

    // Grab all chapter blocks
    const divs = $("div.cat_block.cat_line").toArray();
    const latestChapter = latestTitle(story);
    const newChapters: Chapter[] = [];

    if (divs.length === 0) {
        throw new Error("No Chapters Detected (likely a captcha)");
    }

    // Check the first child
    const firstChild = $(divs[0]).children().first();
    if (firstChild.attr("title") === latestChapter) {
        return [];
    }

    for (const div of divs) {
        const firstChild = $(div).children().first();
        if (!firstChild.length) continue;

        const chapTitle = firstChild.attr("title") || "";
        const url = firstChild.attr("href") || "";

        if (chapTitle === latestChapter) {
            break;
        }
        newChapters.push(Chapter.new(chapTitle, url));
    }

    return newChapters.reverse();
}

async function parseLNW(story: Story, response: string): Promise<Chapter[]> {
    const $ = cheerio.load(response);

    // Grab all chapter blocks
    const chapterElements = $('.chapters-grid .chapter-card').toArray();
    const latestChapter = latestTitle(story);
    const newChapters: Chapter[] = [];

    if (chapterElements.length === 0) {
        throw new Error("No Chapters Detected");
    }

    for (const div of chapterElements.reverse()) {
        const chapterElement = $(div);

        const chapterTitle = chapterElement.find('.chapter-title').text().trim().replace(/^(Chapter\s+\d+)\s+/, "$1: ");

        const onclickAttr = chapterElement.attr('onclick') || '';
        let chapterLink = 'https://lightnovelworld.org';

        const match = onclickAttr.match(/location\.href='([^']+)'/);
        if (match && match[1]) {
            chapterLink += match[1];
        }
        if (chapterTitle == latestChapter) {
            break;
        }
        
        newChapters.push(Chapter.new(chapterTitle, chapterLink))
    }

    return newChapters.reverse();
}

// ✅ demonicScansCheck (cheerio)
async function parseDemoicScans(story: Story, response: string): Promise<Chapter[]> {
    const $ = cheerio.load(response);

    const chaptersDiv = $("div#chapters-list");
    if (!chaptersDiv.length) {
        throw new Error("Could Not Find Chapters");
    }

    const items = chaptersDiv.find("li");
    if (story.chapters.length === items.length) {
        return [];
    }

    const newChapters: Chapter[] = [];
    const latestChapter = latestTitle(story);

    $(items.get()).each((_, item) => {
        const a = $(item).find("a").first();
        if (!a.length) return false; // break

        const chapName = a.text().split("\n")[1]?.trim() || "";
        const url = "https://demonicscans.org" + a.attr("href");
        const dateText = a.find("span").text().trim();

        if (!dateText || !chapName) throw new Error(`Failed to parse html correctly`);

        const date = new Date(dateText).toLocaleDateString("en-US");

        if (chapName === latestChapter) return false; // break

        newChapters.push(Chapter.new(chapName, url || "", date));
    });

    return newChapters.reverse();
}

// ✅ frierenCheck (cheerio)
async function parseFrieren(story: Story, response: string): Promise<Chapter[]> {

    const $ = cheerio.load(response);

    const divs = $("div.h-full.main-chapter");
    if (story.chapters.length === divs.length) {
        return [];
    }

    const newChapters: Chapter[] = [];
    const latestChapter = latestTitle(story);

    $(divs.get()).each((_, div) => {
        const a = $(div).find("a").first();
        if (!a.length) return false;

        const url = a.attr("href") || "";
        const lines = (a.text() || "")
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        let chapterTitle = `Chapter ${lines[0].split("Chapter ")[1]}`;
        if (lines.length > 1) {
            chapterTitle += `: ${lines[1]}`;
        }

        if (chapterTitle === latestChapter) return false;

        newChapters.push(Chapter.new(chapterTitle, url));
    });

    return newChapters.reverse();
}

// ✅ royalRoadChecker (regex + cheerio)
async function parseRoyalRoad(story: Story, response: string): Promise<Chapter[]> {

    const chaptersMatch = response.match(/window\.chapters\s*=\s*(\[.*?\])(?=;|$)/s);
    if (!chaptersMatch) {
        throw new Error("Failed to parse html");
    }

    let chaptersJson = chaptersMatch[1];
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
        if (chapter.title === latestChapter) break;

        const url = "https://www.royalroad.com" + chapter.url;
        const date = new Date(chapter.date.replace("Z", "+00:00")).toLocaleDateString("en-US");
        newChapters.push(Chapter.new(chapter.title, url, date));
    }

    return newChapters.reverse();
}

// ✅ genesisChecker (regex + cheerio)
async function parseGenesis(story: Story, response: string): Promise<Chapter[]> {
    const chapters = JSON.parse(response).data.chapters;
    const newChapters: Chapter[] = [];
    const latestChapter = latestTitle(story);
    for (let i = chapters.length - 1; i >= 0; i--) {
        const ch = chapters[i];
        
        if (!ch.isPaid) {
            //console.log(`Title: ${title}, Link: ${link}`);
            
            const title = `Ch. ${ch.chapter_number}: ${ch.chapter_title}`
            const url = "https://genesistudio.com/viewer/" + ch.id;
            console.log(`title: ${title}`);
            if (title === latestChapter) break;

            newChapters.push(Chapter.new(title, url));
        }
    }

    return newChapters.reverse();
}

async function parseMangaDex(story: Story, response: string): Promise<Chapter[]> {
    const data = JSON.parse(response).data;
    const chapterUrlRoot = 'https://mangadex.org/chapter/';

    let lastParsedChap: string | null = null;
    const latestChapterFull = latestTitle(story).match(/^Ch\.\s*(\d+(?:\.\d+)?)/);
    const latestChapter = latestChapterFull ? latestChapterFull[1] : null;

    const newChapters: Chapter[] = [];
    for (let i = 0; i < data.length; i++) {
        const chapter = data[i];
        const attributes = chapter.attributes;

        //if (chapter.title === latestChapter) break;
        if (chapter.type != 'chapter') continue;
        if (attributes.chapter == lastParsedChap) continue;
        if (attributes.chapter == latestChapter) break;
        lastParsedChap = attributes.chapter;

        const title = attributes.title?.trim()
            ? `Ch. ${attributes.chapter}: ${attributes.title.trim()}`
            : `Ch. ${attributes.chapter}`;


        const date = new Date(attributes.readableAt).toLocaleDateString("en-US");

        const url = chapterUrlRoot + chapter.id;
        newChapters.push(Chapter.new(title, url, date));
    }

    return newChapters.reverse();
}

