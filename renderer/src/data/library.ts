function getDate(): string {
    return new Date().toLocaleDateString('en-US');
}

interface ChapterData {
    isRead: boolean;
    title: string;
    url: string | null;
    datePublished: string;
    dateRead: string | null;
}

export class Chapter {
    read: boolean;
    title: string;
    url: string | null;
    datePublished: string;
    dateRead: string | null;

    constructor(chapter_dict: ChapterData) {
        this.read = chapter_dict.isRead;
        this.title = chapter_dict.title;
        this.url = chapter_dict.url;
        this.datePublished = chapter_dict.datePublished;
        this.dateRead = chapter_dict.dateRead;
    }

    static empty(): Chapter {
        return Chapter.new("No Chapter", null);
    }

    static new(title: string, url: string | null, date?: string): Chapter {
        return new Chapter({
            title: title,
            isRead: false,
            url: url,
            datePublished: date || getDate(),
            dateRead: null,
        });
    }

    toggle(): void {
        if (this.read) {
            this.read = false;
            this.dateRead = null;
        } else {
            this.read = true;
            this.dateRead = getDate();
        }
    }

    openLink(): void {
        // Add this import at the top of your file
        if (this.url) {
            if (!this.read) {
                this.read = true;
                this.dateRead = getDate();
            }
            window.electronAPI.openExternal(this.url);
        }
    }

    serialize(): ChapterData {
        return {
            title: this.title,
            isRead: this.read,
            url: this.url,
            datePublished: this.datePublished,
            dateRead: this.dateRead,
        };
    }
}

interface StoryData {
    title: string;
    coverImage: string;
    summary: string;
    homepageURL: string;
    checkForUpdates: boolean;
    additionalInfo?: any;
    chapters: ChapterData[];
}

export class Story {
    title: string;
    cover: string;
    summary: string;
    homepageURL: string;
    checkForUpdates: boolean;
    additionalInfo?: any;
    chapters: Chapter[];

    constructor(story_dict: StoryData) {
        this.title = story_dict.title;
        this.cover = story_dict.coverImage;
        this.summary = story_dict.summary;
        this.homepageURL = story_dict.homepageURL;
        this.checkForUpdates = story_dict.checkForUpdates;
        this.additionalInfo = story_dict.additionalInfo;
        this.chapters = story_dict.chapters.map(chap => new Chapter(chap));
    }

    editStory(edited_dict: Partial<StoryData>): void {
        if (edited_dict.title) this.title = edited_dict.title;
        if (edited_dict.coverImage) this.cover = edited_dict.coverImage;
        if (edited_dict.summary) this.summary = edited_dict.summary;
        if (edited_dict.homepageURL) this.homepageURL = edited_dict.homepageURL;
        if (edited_dict.checkForUpdates !== undefined) 
            this.checkForUpdates = edited_dict.checkForUpdates;
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
            coverImage: this.cover,
            homepageURL: this.homepageURL,
            summary: this.summary,
            checkForUpdates: this.checkForUpdates,
            chapters: this.chapters.map(c => c.serialize())
        };
        
        if (this.additionalInfo !== undefined) {
            result.additionalInfo = this.additionalInfo;
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
        console.log(`Saved Successfully`);
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
            } else if (story.checkForUpdates) {
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
            checkStoryUpdate: (story: StoryData) => Promise<ChapterData[]>;
            openExternal: (url: string) => void;
        };
    }
}