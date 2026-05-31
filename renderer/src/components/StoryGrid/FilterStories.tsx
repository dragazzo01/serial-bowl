import React from 'react';
import {
    DEFAULT_STORY_GRID_FILTERS,
    StoryGridFilters,
    StoryGridUpdatesFilter,
    StoryGridProgressFilter,
    StoryGridStatusFilter,
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
    const domainValues = domainOptions.map((option) => option.value);

    const toggleArrayValue = <T extends string>(current: T[], value: T) =>
        current.includes(value) ? current.filter((item) => item !== value) : [...current, value];

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

                    <details className="filter-stories-checkbox-group">
                        <summary>Updates</summary>
                        {STORY_GRID_UPDATES_OPTIONS.map((option) => (
                            <label key={option.value}>
                                <input
                                    type="checkbox"
                                    checked={filters.updates.includes(option.value)}
                                    onChange={() => {
                                        const nextUpdates = toggleArrayValue(filters.updates, option.value);
                                        onFiltersChange({ updates: nextUpdates });
                                    }}
                                />
                                <span>{option.label}</span>
                            </label>
                        ))}
                    </details>

                    <details className="filter-stories-checkbox-group">
                        <summary>Progress</summary>
                        {STORY_GRID_PROGRESS_OPTIONS.map((option) => (
                            <label key={option.value}>
                                <input
                                    type="checkbox"
                                    checked={filters.progress.includes(option.value)}
                                    onChange={() => {
                                        const nextProgress = toggleArrayValue(filters.progress, option.value);
                                        onFiltersChange({ progress: nextProgress });
                                    }}
                                />
                                <span>{option.label}</span>
                            </label>
                        ))}
                    </details>

                    <details className="filter-stories-checkbox-group">
                        <summary>Status</summary>
                        {STORY_GRID_STATUS_OPTIONS.map((option) => (
                            <label key={option.value}>
                                <input
                                    type="checkbox"
                                    checked={filters.status.includes(option.value)}
                                    onChange={() => {
                                        const nextStatus = toggleArrayValue(filters.status, option.value);
                                        onFiltersChange({ status: nextStatus });
                                    }}
                                />
                                <span>{option.label}</span>
                            </label>
                        ))}
                    </details>

                    <details className="filter-stories-checkbox-group">
                        <summary>Domain</summary>
                        {domainOptions.map((option) => {
                            const checked = filters.domain.includes('all') ? true : filters.domain.includes(option.value);
                            return (
                                <label key={option.value}>
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                            const currentDomains = filters.domain.includes('all') ? domainValues : filters.domain;
                                            const nextDomains = toggleArrayValue(currentDomains, option.value);

                                            onFiltersChange({
                                                domain:
                                                    nextDomains.length === domainValues.length
                                                        ? ['all']
                                                        : nextDomains,
                                            });
                                        }}
                                    />
                                    <span>{option.label}</span>
                                </label>
                            );
                        })}
                    </details>

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
