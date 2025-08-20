// renderer/src/components/MainView.tsx
import React, { useEffect, useState } from 'react';
import { Story, Chapter } from '../data/library';
import { useLibrary } from '../data/libraryContext';
import './MobileView.css'
import api from '../api/api'

import StoryGrid from '../components/StoryGrid/StoryGrid'


const MainView: React.FC = () => {
    const { loadLibrary } = useLibrary();
    const [isLoading, setIsLoading] = useState(true);
    const [stories, setStories] = useState<Story[]>([]);

    useEffect(() => {
        const init = async () => {
            try {
                const loadedLibrary = await loadLibrary();
                setStories(loadedLibrary.stories);
            } catch (error) {
                console.error('Failed to load library:', error);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    if (isLoading) {
        return <div>Loading library...</div>;
    }

    const handleStoryClick = (story: Story) => {
        api.openExternal(story.homepageURL);
    };


    const handleToggleUpdates = (story: Story) => {
        // Toggle updates for the story
        story.checkForUpdates = !story.checkForUpdates;
        setStories([...stories]); // Trigger re-render
    };

    const handleChapterClick = (chapter: Chapter) => {
        chapter.openLink();
        setStories([...stories]); // Trigger re-render
    };


    return (
        <div className="main-view">
            <StoryGrid
                stories={stories}
                onStoryClick={handleStoryClick}
                onToggleUpdates={handleToggleUpdates}
                onChapterClick={handleChapterClick}
            />
        </div>
    );
};

export default MainView;