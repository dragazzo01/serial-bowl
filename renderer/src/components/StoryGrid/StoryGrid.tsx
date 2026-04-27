import React, { useMemo, useState } from 'react';
import { Story, Chapter, Library } from '../../data/library';
import { DEFAULT_STORY_GRID_FILTERS, StoryGridFilters } from '../../data/storyGrid';
import FilterStories from './FilterStories';
import StoryGridElem from './StoryGridElem';
import './StoryGrid.css';

interface StoryGridProps {
    stories: Story[];
    onStoryClick: (story: Story) => void;
    onToggleUpdates: (story: Story) => void;
    onChapterClick: (chapter: Chapter) => void;
}

const StoryGrid: React.FC<StoryGridProps> = ({
    stories,
    onStoryClick,
    onToggleUpdates,
    onChapterClick
}) => {
    const [filters, setFilters] = useState<StoryGridFilters>(DEFAULT_STORY_GRID_FILTERS);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    const visibleStories = useMemo(
        () => Library.grid(stories, filters),
        [stories, filters],
    );

    return (
        <div className="story-grid-panel">
            <FilterStories
                stories={stories}
                filters={filters}
                isOpen={isFiltersOpen}
                onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
                onToggleOpen={() => setIsFiltersOpen((current) => !current)}
                onFiltersChange={(nextFilters) => setFilters((current) => ({ ...current, ...nextFilters }))}
                onReset={() => setFilters(DEFAULT_STORY_GRID_FILTERS)}
            />

            <div className="story-grid">
                {visibleStories.map((story) => (
                    <StoryGridElem
                        key={story.title}
                        story={story}
                        onClick={onStoryClick}
                        onToggleUpdates={onToggleUpdates}
                        onChapterClick={onChapterClick}
                    />
                ))}
            </div>

            {visibleStories.length === 0 && (
                <div className="story-grid-empty">No stories match the current search and filters.</div>
            )}
        </div>
    );
};

export default StoryGrid;
