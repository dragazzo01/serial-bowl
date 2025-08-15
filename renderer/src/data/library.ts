// src/main/data/library.ts
// import { readFileSync, writeFileSync } from 'fs';
// import { app } from 'electron';
// import path from 'path';

function getDate(): string {
    return new Date().toLocaleDateString('en-US');
}

interface ChapterData {
    is_read: boolean;
    title: string;
    url: string | null;
    date_published: string;
    date_read: string | null;
}

export class Chapter {
    read: boolean;
    title: string;
    url: string | null;
    date_published: string;
    date_read: string | null;

    constructor(chapter_dict: ChapterData) {
        this.read = chapter_dict.is_read;
        this.title = chapter_dict.title;
        this.url = chapter_dict.url;
        this.date_published = chapter_dict.date_published;
        this.date_read = chapter_dict.date_read;
    }

    static empty(): Chapter {
        return Chapter.new("No Chapter", null);
    }

    static new(title: string, url: string | null, date?: string): Chapter {
        return new Chapter({
            title: title,
            is_read: false,
            url: url,
            date_published: date || getDate(),
            date_read: null,
        });
    }

    toggleChap(): void {
        if (this.read) {
            this.read = false;
            this.date_read = null;
        } else {
            this.read = true;
            this.date_read = getDate();
        }
    }

    openLink(): void {
        if (this.url) {
            if (!this.read) {
                this.read = true;
                this.date_read = getDate();
            }
            require('electron').shell.openExternal(this.url);
        }
    }

    serialize(): ChapterData {
        return {
            title: this.title,
            is_read: this.read,
            url: this.url,
            date_published: this.date_published,
            date_read: this.date_read,
        };
    }
}

interface StoryData {
    title: string;
    cover_image: string;
    summary: string;
    homepage_url: string;
    check_for_updates: boolean;
    additional_info?: any;
    chapters: ChapterData[];
}

export class Story {
    title: string;
    cover: string;
    summary: string;
    homepage_url: string;
    check_for_updates: boolean;
    additional_info?: any;
    chapters: Chapter[];

    constructor(story_dict: StoryData) {
        this.title = story_dict.title;
        this.cover = story_dict.cover_image;
        this.summary = story_dict.summary;
        this.homepage_url = story_dict.homepage_url;
        this.check_for_updates = story_dict.check_for_updates;
        this.additional_info = story_dict.additional_info;
        this.chapters = story_dict.chapters.map(chap => new Chapter(chap));
    }

    editStory(edited_dict: Partial<StoryData>): void {
        if (edited_dict.title) this.title = edited_dict.title;
        if (edited_dict.cover_image) this.cover = edited_dict.cover_image;
        if (edited_dict.summary) this.summary = edited_dict.summary;
        if (edited_dict.homepage_url) this.homepage_url = edited_dict.homepage_url;
        if (edited_dict.check_for_updates !== undefined) 
            this.check_for_updates = edited_dict.check_for_updates;
    }

    finished(): boolean {
        return this.chapters.every(chap => chap.read);
    }

    getLastKnownChapter(): Chapter {
        if (this.chapters.length === 0) return Chapter.empty();
        return this.chapters[this.chapters.length - 1];
    }

    getLastReadChapter(): Chapter {
        if (this.chapters.length === 0) return Chapter.empty();
        
        for (let i = this.chapters.length - 1; i >= 0; i--) {
            if (this.chapters[i].read) return this.chapters[i];
        }
        
        return Chapter.empty();
    }

    getFirstUnread(): Chapter | null {
        const unread = this.chapters.find(chap => !chap.read);
        return unread || null;
    }

    newChapters(new_chapters: Chapter[]): void {
        this.chapters.push(...new_chapters);
    }

    serialize(): StoryData {
        const result: StoryData = {
            title: this.title,
            cover_image: this.cover,
            homepage_url: this.homepage_url,
            summary: this.summary,
            check_for_updates: this.check_for_updates,
            chapters: this.chapters.map(c => c.serialize())
        };
        
        if (this.additional_info !== undefined) {
            result.additional_info = this.additional_info;
        }
        
        return result;
    }
}

export class Library {
    stories: Story[];

    constructor() {
        this.stories = []
    }
    // Alternative better approach: use a static async factory method
    static async create(): Promise<Library> {
        let jsonList: StoryData[];
        
        try {
            jsonList = await window.electronAPI.loadLibrary();
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                jsonList = [];
            } else {
                throw error;
            }
        }

        const library = new Library();
        library.stories = jsonList.map(story => new Story(story));
        return library;
    }

    async saveLibrary(): Promise<void> {
        await window.electronAPI.saveLibrary(this.stories.map(s => s.serialize()));
    }

    getStory(title: string): Story | undefined {
        return this.stories.find(s => s.title === title);
    }

    deleteStory(story: Story): void {
        const index = this.stories.indexOf(story);
        if (index !== -1) {
            this.stories.splice(index, 1);
        }
    }

    addStory(story_dict: StoryData): void {
        this.stories.push(new Story(story_dict));
    }

    grid(): Story[] {
        const gridOrder: Story[] = [];
        let yellowInsert = 0;
        
        for (const story of this.stories) {
            if (story.finished()) {
                // Finished stories at back
                gridOrder.push(story);
            } else if (story.check_for_updates) {
                // Stories checking for updates at front
                gridOrder.unshift(story);
                yellowInsert++;
            } else {
                // Other stories in middle
                gridOrder.splice(yellowInsert, 0, story);
            }
        }
        
        return gridOrder;
    }

    serialize(): StoryData[] {
        return this.stories.map(s => s.serialize());
    }
}

// Extend window type for electronAPI
declare global {
  interface Window {
    electronAPI: {
      loadLibrary: () => Promise<StoryData[]>;
      saveLibrary: (data: StoryData[]) => Promise<{ success: boolean }>;
    };
  }
}

// Default save file path
// export const defaultSavePath = path.join(app.getPath('userData'), 'library.json');