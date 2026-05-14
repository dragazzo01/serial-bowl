// renderer/src/components/MainView.tsx
import React, { useEffect, useState } from 'react';
import { Story, Chapter } from '../data/library';
import { useLibrary } from '../data/libraryContext';
import api from '../api/api'


import StoryViewContainer from '../components/StoryView/StoryViewContainer';
import StoryGrid from '../components/StoryGrid/StoryGrid'
import MultiWindowManager from '../components/MultiWindowManager';
import '../components/MainView.css'

const MainView: React.FC = () => {
    const { library, loadLibrary, updateLibrary } = useLibrary();
    const [isLoading, setIsLoading] = useState(true);
    const [stories, setStories] = useState<Story[]>([]);
    const [selectedStory, setSelectedStory] = useState<Story>(Story.empty());
    const [sideWindow, setSideWindow] = useState<'detail' | 'none'>('none');

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
        setSelectedStory(story);
        setSideWindow('detail');
    };

    const handleSideWindowClose = () => {
        setSideWindow('none');
    }

    const handleToggleUpdates = (story: Story) => {
        // Toggle updates for the story
        story.checkForUpdates = !story.checkForUpdates;
        updateLibrary();
        setStories([...stories]); // Trigger re-render
    };

    const handleChapterClick = (chapter: Chapter) => {
        chapter.openLink();
        updateLibrary();
        setStories([...stories]); // Trigger re-render
    };


    const deleteStoryDetail = (story: Story) => {
        library.deleteStory(story);
        updateLibrary();
        setStories([...library.stories]);
        setSideWindow('none');
    }

    return (
        <div className="main-view">
            <MultiWindowManager
                mainComponent={
                    <StoryGrid
                        stories={stories}
                        onStoryClick={handleStoryClick}
                        onToggleUpdates={handleToggleUpdates}
                        onChapterClick={handleChapterClick}
                     />}
                sideComponent={
                    sideWindow == 'detail' ? 
                        <StoryViewContainer 
                            story={selectedStory} 
                            refreshGrid={() => setStories([...stories])} 
                            onDelete={() => deleteStoryDetail(selectedStory)}
                        />
                    : null}
                onClose={handleSideWindowClose}
                defaultSideWindowWidth={400}
            />

        </div>
    );

    //return <DeleteStory/>
};

export default MainView;