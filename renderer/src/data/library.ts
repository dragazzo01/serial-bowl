import api from '../api/api'
import {
    applyStoryGrid,
    StoryGridFilters,
} from './storyGrid';

function getDate(): string {
    return new Date().toLocaleDateString('en-US');
}

export interface ChapterData {
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
    // Position within its story's chapter list; assigned by Story, not self-managed.
    order: number = 0;
    // Set on any local mutation; Library.saveLibrary() syncs only dirty chapters
    // to Firestore instead of rewriting the whole library on every change.
    dirty: boolean = false;

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
        this.dirty = true;
    }

    openLink(): void {
        // Add this import at the top of your file
        if (this.url) {
            if (!this.read) {
                this.read = true;
                this.dateRead = getDate();
                this.dirty = true;
            }
            api.openExternal(this.url);
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

export type StoryStatus = 'reading' | 'complete' | 'broken' | 'hidden' | 'hiatus' | 'dropped';
export interface StoryData {
    title: string;
    coverImage: string;
    summary: string;
    homepageURL: string;
    checkForUpdates: boolean;
    status: StoryStatus;
    additionalInfo: Record<string, string>;
    chapters: ChapterData[];
    // Stable Firestore doc id, frozen at creation. Optional since plain file-based
    // (non-Firestore) data has no need for one.
    id?: string;
}

// Firestore document IDs can't contain "/"; titles are otherwise safe to use
// directly. Only used to assign a fresh id to a brand new story - once assigned,
// an id is never recomputed from the (possibly later-edited) title again.
function slugifyTitle(title: string): string {
    const cleaned = title.trim().replace(/\//g, '-');
    return cleaned || 'untitled';
}

export class Story {
    title: string;
    // Stable Firestore doc id - assigned once (from loaded data, or a fresh slug
    // for a brand new story) and never changed again, even if the title is edited
    // later. This is what keeps a rename from orphaning the story's Firestore doc:
    // renaming only ever changes the `title` *field* on the same, unmoved doc.
    id: string;
    coverRelativePath: string;
    coverPath: string;
    summary: string;
    homepageURL: string;
    checkForUpdates: boolean;
    status: StoryStatus;
    additionalInfo: Record<string, string>;
    chapters: Chapter[];
    // Set by editStory(); Library.saveLibrary() pushes just the metadata fields
    // (never the chapters subcollection) when this is true.
    metaDirty: boolean = false;
    // Set whenever a chapter is inserted/removed at an arbitrary position, since
    // that shifts every subsequent chapter's `order`. Library.saveLibrary() handles
    // this by replacing the whole chapters subcollection for just this one story,
    // rather than trying to patch individual order values.
    structuralChange: boolean = false;

    constructor(story_dict: StoryData) {
        this.title = story_dict.title;
        this.id = story_dict.id ?? slugifyTitle(story_dict.title);
        this.coverRelativePath = story_dict.coverImage;
        this.coverPath = '';
        this.summary = story_dict.summary;
        this.homepageURL = story_dict.homepageURL;
        this.checkForUpdates = story_dict.checkForUpdates;
        this.status = story_dict.status;
        this.additionalInfo = story_dict.additionalInfo || {};
        this.chapters = story_dict.chapters.map((chap, i) => {
            const chapter = new Chapter(chap);
            chapter.order = i;
            return chapter;
        });
    }

    static empty(): Story {
        return new Story({
            title: "No Story",
            coverImage: "",
            summary: "",
            homepageURL: "",
            checkForUpdates: false,
            status: 'reading',
            additionalInfo: {},
            chapters: [],
        });
    }

    async setCover() {

        if (this.coverRelativePath.includes("https://")) {
            this.coverPath = this.coverRelativePath;
        } else {
            this.coverPath = await api.getImageUrl(this.coverRelativePath);
        }
    }

    editStory(edited_dict: Partial<StoryData>): void {
        if (edited_dict.title) this.title = edited_dict.title;
        if (edited_dict.coverImage) {
            this.coverRelativePath = edited_dict.coverImage;
            this.setCover();
        }
        if (edited_dict.summary) this.summary = edited_dict.summary;
        if (edited_dict.homepageURL) this.homepageURL = edited_dict.homepageURL;
        if (edited_dict.checkForUpdates !== undefined)
            this.checkForUpdates = edited_dict.checkForUpdates;
        if (edited_dict.additionalInfo) this.additionalInfo = edited_dict.additionalInfo;
        if (edited_dict.status) this.status = edited_dict.status;
        this.metaDirty = true;
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

    // Appended at the end, so no existing chapter's order shifts - only the new
    // ones need to be synced.
    newChapters(newChapters: Chapter[]): void {
        const startOrder = this.chapters.length;
        newChapters.forEach((chapter, i) => {
            chapter.order = startOrder + i;
            chapter.dirty = true;
        });
        this.chapters.push(...newChapters);
    }

    addChapter(newChapter: Chapter, position: number): void {
        this.chapters.splice(position, 0, newChapter);
        this.chapters.forEach((chapter, i) => { chapter.order = i; });
        this.structuralChange = true;
    }

    deleteChapter(chapter: Chapter): void {
        const index = this.chapters.indexOf(chapter);
        if (index !== -1) {
            this.chapters.splice(index, 1);
            this.chapters.forEach((c, i) => { c.order = i; });
            this.structuralChange = true;
        }
    }

    async getUpdates(): Promise<Chapter[]> {
        const storyData = this.serialize();
        const response = await api.getUpdateHTML(storyData);
        const chapData = await api.parseUpdateHTML(storyData, response);
        return chapData.map(c => new Chapter(c));
    }

    serialize(): StoryData {
        const result: StoryData = {
            title: this.title,
            id: this.id,
            coverImage: this.coverRelativePath,
            homepageURL: this.homepageURL,
            summary: this.summary,
            checkForUpdates: this.checkForUpdates,
            status: this.status,
            additionalInfo: this.additionalInfo,
            chapters: this.chapters.map(c => c.serialize())
        };


        return result;
    }
}

export class Library {
    stories: Story[];
    // Ids removed locally since the last successful sync, still owed a
    // delete call against Firestore.
    private pendingDeletedIds: string[] = [];
    // True after "Load from File" - lets you inspect/edit an arbitrary snapshot
    // without it touching the real synced library. saveLibrary() becomes a no-op
    // while this is set, so nothing here is persisted anywhere.
    viewingLoadedFile: boolean = false;
    // Serializes saveLibrary() calls so two rapid edits can't race on the same
    // dirty-flag state - each call's own outcome is still returned to its caller
    // via the promise saveLibrary() hands back, only the underlying work is queued.
    private saveChain: Promise<void> = Promise.resolve();

    constructor() {
        this.stories = []
    }
    // Alternative better approach: use a static async factory method
    static async create(): Promise<Library> {
        let jsonList: StoryData[];

        try {
            jsonList = await api.loadLibrary();
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                jsonList = [];
            } else {
                throw error;
            }
        }
        const library = new Library();
        library.stories = jsonList.map(story => new Story(story));
        library.stories.forEach(story => story.setCover())
        return library;
    }

    // In dev mode (Firestore/emulator) this only pushes what actually changed -
    // deleted stories, edited metadata, dirty chapters, or a full chapter replace
    // for structural edits - instead of rewriting the whole library every time,
    // which would burn through Firestore's free daily write quota fast once this
    // points at a real project. Packaged builds still use the old blanket file save.
    saveLibrary(): Promise<void> {
        const run = this.saveChain.then(() => this.doSaveLibrary());
        // Keep the chain itself always resolving, so one failed save doesn't
        // permanently wedge every future call - each call's own success/failure
        // is still reflected in the `run` promise returned to its own caller.
        this.saveChain = run.catch(() => {});
        return run;
    }

    private async doSaveLibrary(): Promise<void> {
        if (this.viewingLoadedFile) {
            console.log('Viewing a loaded file - changes are not being saved.');
            return;
        }

        if (!api.useFirestore) {
            const result = await api.saveLibrary(this.stories.map(s => s.serialize()));
            if (!result.success) throw new Error('Failed to save library to file');
            console.log('Saved Successfully');
            return;
        }

        // Only drop ids whose delete actually succeeded - anything else stays
        // queued and gets retried on the next saveLibrary() call.
        const stillPendingDeletes: string[] = [];
        for (const id of this.pendingDeletedIds) {
            const result = await api.deleteStoryRemote(id);
            if (!result.success) stillPendingDeletes.push(id);
        }
        this.pendingDeletedIds = stillPendingDeletes;

        for (const story of this.stories) {
            if (story.metaDirty) {
                const { chapters, ...meta } = story.serialize();
                const result = await api.updateStoryMeta(story.id, meta);
                if (result.success) story.metaDirty = false;
            }

            if (story.structuralChange) {
                const result = await api.replaceChapters(story.id, story.chapters.map(c => c.serialize()));
                if (result.success) {
                    story.structuralChange = false;
                    story.chapters.forEach(c => { c.dirty = false; });
                }
                continue;
            }

            const dirtyChapters = story.chapters.filter(c => c.dirty);
            if (dirtyChapters.length > 0) {
                const result = await api.upsertChapters(
                    story.id,
                    dirtyChapters.map(c => ({ ...c.serialize(), order: c.order }))
                );
                if (result.success) {
                    dirtyChapters.forEach(c => { c.dirty = false; });
                }
            }
        }

        console.log('Saved Successfully');
    }

    getStory(title: string): Story | undefined {
        return this.stories.find(s => s.title === title);
    }

    deleteStory(story: Story): void {
        const index = this.stories.indexOf(story);
        if (index !== -1) {
            this.stories.splice(index, 1);
            this.pendingDeletedIds.push(story.id);
        }
    }

    addStory(story: Story): void {
        story.metaDirty = true;
        story.structuralChange = true;
        this.stories.push(story);
    }

    // Used by "Load from File": swaps in a whole new set of stories purely for
    // local viewing/editing. Sets viewingLoadedFile so saveLibrary() no-ops -
    // nothing here touches Firestore or the synced library.
    replaceAll(storiesData: StoryData[]): void {
        this.viewingLoadedFile = true;
        this.stories = storiesData.map(data => {
            const story = new Story(data);
            story.setCover();
            return story;
        });
    }

    grid(filters?: Partial<StoryGridFilters>): Story[] {
        return applyStoryGrid(this.stories, filters);
    }

    static grid(stories: Story[], filters?: Partial<StoryGridFilters>): Story[] {
        return applyStoryGrid(stories, filters);
    }

    serialize(): StoryData[] {
        return this.stories.map(s => s.serialize());
    }
}
