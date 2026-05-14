import {StoryStatus} from './library'

export type StoryGridSort =
    | 'default'
    | 'newest-read'
    | 'oldest-read'
    | 'newest-update'
    | 'oldest-update'
    | 'title-asc'
    | 'title-desc';

export type StoryGridUpdatesFilter = 'all' | 'enabled' | 'disabled';
export type StoryGridProgressFilter = 'all' | 'unfinished' | 'finished';

export interface StoryGridFilters {
    search: string;
    updates: StoryGridUpdatesFilter;
    progress: StoryGridProgressFilter;
    status: 'all' | StoryStatus;
    domain: string;
    sort: StoryGridSort;
}

export interface StoryGridChapterLike {
    datePublished: string;
    dateRead: string | null;
}

export interface StoryGridStoryLike {
    title: string;
    homepageURL: string;
    checkForUpdates: boolean;
    status: StoryStatus;
    finished(): boolean;
    getLastKnownChapter(): StoryGridChapterLike;
    getLastReadChapter(): StoryGridChapterLike;
}

export const DEFAULT_STORY_GRID_FILTERS: StoryGridFilters = {
    search: '',
    updates: 'all',
    progress: 'all',
    status: 'all',
    domain: 'all',
    sort: 'default',
};

export const STORY_GRID_SORT_OPTIONS: Array<{ value: StoryGridSort; label: string }> = [
    { value: 'default', label: 'Default Order' },
    { value: 'newest-read', label: 'Newest Read' },
    { value: 'oldest-read', label: 'Oldest Read' },
    { value: 'newest-update', label: 'Newest Update' },
    { value: 'oldest-update', label: 'Oldest Update' },
    { value: 'title-asc', label: 'Title A-Z' },
    { value: 'title-desc', label: 'Title Z-A' },
];

export const STORY_GRID_UPDATES_OPTIONS: Array<{ value: StoryGridUpdatesFilter; label: string }> = [
    { value: 'all', label: 'All Update States' },
    { value: 'enabled', label: 'Updates Enabled' },
    { value: 'disabled', label: 'Updates Disabled' },
];

export const STORY_GRID_PROGRESS_OPTIONS: Array<{ value: StoryGridProgressFilter; label: string }> = [
    { value: 'all', label: 'All Progress' },
    { value: 'unfinished', label: 'Unread Remaining' },
    { value: 'finished', label: 'All Read' },
];

export const STORY_GRID_STATUS_OPTIONS: Array<{ value: StoryGridFilters['status']; label: string }> = [
    { value: 'all', label: 'All Statuses' },
    { value: 'reading', label: 'Reading' },
    { value: 'complete', label: 'Complete' },
    { value: 'broken', label: 'Broken' },
    { value: 'hidden', label: 'Hidden' },
    { value: 'hiatus', label: 'Hiatus' },
    { value: 'dropped', label: 'Dropped' },
];

export function getStoryDomain(homepageURL: string): string | null {
    try {
        const hostname = new URL(homepageURL).hostname.toLowerCase();
        return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
    } catch {
        return null;
    }
}

export function getStoryGridDomainOptions<T extends StoryGridStoryLike>(
    stories: T[],
): Array<{ value: string; label: string }> {
    const domains = Array.from(
        new Set(
            stories
                .map((story) => getStoryDomain(story.homepageURL))
                .filter((domain): domain is string => Boolean(domain)),
        ),
    ).sort((left, right) => left.localeCompare(right));

    return [
        { value: 'all', label: 'All Domains' },
        ...domains.map((domain) => ({
            value: domain,
            label: domain,
        })),
    ];
}

function parseLibraryDate(value: string | null): number | null {
    if (!value) {
        return null;
    }

    const parts = value.split('/').map(part => Number.parseInt(part, 10));
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return null;
    }

    const [month, day, year] = parts;
    return new Date(year, month - 1, day).getTime();
}

function getDefaultGridRank(story: StoryGridStoryLike): number {
    if (!story.finished()) {
        return story.checkForUpdates ? 0 : 2;
    }

    return story.checkForUpdates ? 1 : 3;
}

function getSortTimestamp(story: StoryGridStoryLike, sort: StoryGridSort): number | null {
    if (sort === 'newest-read' || sort === 'oldest-read') {
        return parseLibraryDate(story.getLastReadChapter().dateRead);
    }

    if (sort === 'newest-update' || sort === 'oldest-update') {
        return parseLibraryDate(story.getLastKnownChapter().datePublished);
    }

    return null;
}

export function normalizeStoryGridFilters(filters?: Partial<StoryGridFilters>): StoryGridFilters {
    return {
        ...DEFAULT_STORY_GRID_FILTERS,
        ...filters,
    };
}

export function matchesStoryGridFilters(
    story: StoryGridStoryLike,
    filters: StoryGridFilters,
): boolean {
    const search = filters.search.trim().toLowerCase();
    if (search && !story.title.toLowerCase().includes(search)) {
        return false;
    }

    if (filters.updates === 'enabled' && !story.checkForUpdates) {
        return false;
    }

    if (filters.updates === 'disabled' && story.checkForUpdates) {
        return false;
    }

    const isFinished = story.finished();
    if (filters.progress === 'finished' && !isFinished) {
        return false;
    }

    if (filters.progress === 'unfinished' && isFinished) {
        return false;
    }

    if (filters.status !== 'all' && story.status !== filters.status) {
        return false;
    }

    if (filters.domain !== 'all' && getStoryDomain(story.homepageURL) !== filters.domain) {
        return false;
    }

    if (filters.status === 'all' && story.status === 'hidden') {
        return false;
    }

    return true;
}

export function applyStoryGrid<T extends StoryGridStoryLike>(
    stories: T[],
    filters?: Partial<StoryGridFilters>,
): T[] {
    const normalizedFilters = normalizeStoryGridFilters(filters);

    return stories
        .map((story, index) => ({ story, index }))
        .filter(({ story }) => matchesStoryGridFilters(story, normalizedFilters))
        .sort((left, right) => {
            const { sort } = normalizedFilters;

            if (sort === 'title-asc') {
                return left.story.title.localeCompare(right.story.title) || left.index - right.index;
            }

            if (sort === 'title-desc') {
                return right.story.title.localeCompare(left.story.title) || left.index - right.index;
            }

            if (sort !== 'default') {
                const leftTime = getSortTimestamp(left.story, sort);
                const rightTime = getSortTimestamp(right.story, sort);

                if (leftTime === null && rightTime !== null) {
                    return 1;
                }

                if (leftTime !== null && rightTime === null) {
                    return -1;
                }

                if (leftTime !== null && rightTime !== null && leftTime !== rightTime) {
                    return sort.startsWith('newest') ? rightTime - leftTime : leftTime - rightTime;
                }
            }

            const rankDiff = getDefaultGridRank(left.story) - getDefaultGridRank(right.story);
            if (rankDiff !== 0) {
                return rankDiff;
            }

            return left.index - right.index;
        })
        .map(({ story }) => story);
}
