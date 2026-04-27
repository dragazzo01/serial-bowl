import React from 'react';
import {
    DEFAULT_STORY_GRID_FILTERS,
    StoryGridFilters,
    getStoryGridDomainOptions,
    STORY_GRID_PROGRESS_OPTIONS,
    STORY_GRID_SORT_OPTIONS,
    STORY_GRID_STATUS_OPTIONS,
    STORY_GRID_UPDATES_OPTIONS,
    StoryGridStoryLike,
} from '../../data/storyGrid';
import './FilterStories.css';

interface FilterStoriesProps {
    stories: StoryGridStoryLike[];
    filters: StoryGridFilters;
    isOpen: boolean;
    onSearchChange: (search: string) => void;
    onToggleOpen: () => void;
    onFiltersChange: (filters: Partial<StoryGridFilters>) => void;
    onReset: () => void;
}

const FilterStories: React.FC<FilterStoriesProps> = ({
    stories,
    filters,
    isOpen,
    onSearchChange,
    onToggleOpen,
    onFiltersChange,
    onReset,
}) => {
    const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_STORY_GRID_FILTERS);
    const domainOptions = getStoryGridDomainOptions(stories);

    return (
        <div className="filter-stories">
            <div className="filter-stories-toolbar">
                <input
                    className="filter-stories-search"
                    type="search"
                    value={filters.search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Search stories"
                    aria-label="Search stories"
                />
                <button
                    type="button"
                    className={`filter-stories-toggle ${isOpen ? 'open' : ''}`}
                    onClick={onToggleOpen}
                    aria-expanded={isOpen}
                    aria-controls="story-grid-filters-menu"
                >
                    Filters
                </button>
            </div>

            {isOpen && (
                <div className="filter-stories-menu" id="story-grid-filters-menu">
                    <label className="filter-stories-field">
                        <span>Order</span>
                        <select
                            value={filters.sort}
                            onChange={(event) => onFiltersChange({ sort: event.target.value as StoryGridFilters['sort'] })}
                        >
                            {STORY_GRID_SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="filter-stories-field">
                        <span>Updates</span>
                        <select
                            value={filters.updates}
                            onChange={(event) => onFiltersChange({ updates: event.target.value as StoryGridFilters['updates'] })}
                        >
                            {STORY_GRID_UPDATES_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="filter-stories-field">
                        <span>Progress</span>
                        <select
                            value={filters.progress}
                            onChange={(event) => onFiltersChange({ progress: event.target.value as StoryGridFilters['progress'] })}
                        >
                            {STORY_GRID_PROGRESS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="filter-stories-field">
                        <span>Status</span>
                        <select
                            value={filters.status}
                            onChange={(event) => onFiltersChange({ status: event.target.value as StoryGridFilters['status'] })}
                        >
                            {STORY_GRID_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="filter-stories-field">
                        <span>Domain</span>
                        <select
                            value={filters.domain}
                            onChange={(event) => onFiltersChange({ domain: event.target.value })}
                        >
                            {domainOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <button
                        type="button"
                        className="filter-stories-reset"
                        onClick={onReset}
                        disabled={!hasActiveFilters}
                    >
                        Reset
                    </button>
                </div>
            )}
        </div>
    );
};

export default FilterStories;
