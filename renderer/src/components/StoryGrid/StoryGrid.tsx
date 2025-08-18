// StoryGrid.tsx
import React, { useMemo } from 'react';
import { Story, Chapter } from '../../data/library';
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
    // Memoize the sorted stories to prevent unnecessary re-renders
    const sortedStories = useMemo(() => {
        // Create separate arrays for each category
        const unfinishedCheckingUpdates: Story[] = [];
        const finishedCheckingUpdates: Story[] = [];
        const unfinishedNotCheckingUpdates: Story[] = [];
        const finishedNotCheckingUpdates: Story[] = [];

        // Categorize each story
        for (const story of stories) {
            if (!story.finished()) {
                if (story.checkForUpdates) {
                    unfinishedCheckingUpdates.push(story);
                } else {
                    unfinishedNotCheckingUpdates.push(story);
                }
            } else {
                if (story.checkForUpdates) {
                    finishedCheckingUpdates.push(story);
                } else {
                    finishedNotCheckingUpdates.push(story);
                }
            }
        }

        // Combine in the desired order
        return [
            ...unfinishedCheckingUpdates,
            ...finishedCheckingUpdates,
            ...unfinishedNotCheckingUpdates,
            ...finishedNotCheckingUpdates
        ];
    }, [stories]);

    return (
        <div className="story-grid">
            {sortedStories.map((story) => (
                <StoryGridElem
                    key={story.title}
                    story={story}
                    onClick={onStoryClick}
                    onToggleUpdates={onToggleUpdates}
                    onChapterClick={onChapterClick}
                />
            ))}
        </div>
    );
};

export default StoryGrid;