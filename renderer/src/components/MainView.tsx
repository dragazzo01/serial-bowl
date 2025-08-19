// renderer/src/components/MainView.tsx
import React, { useEffect, useState } from 'react';
import { Story, Chapter } from '../data/library';
import { useLibrary } from '../data/libraryContext';
import './MainView.css'

import StoryViewContainer from './StoryView/StoryViewContainer';
import StoryGrid from './StoryGrid/StoryGrid'
import MultiWindowManager from './MultiWindowManager';
import DeleteStory from './DeleteStory'
import EditStoryPanel from './StoryView/EditStoryPanel';
import UpdateChecker from './UpdateChecker';


const MainView: React.FC = () => {
    const { library, loadLibrary, updateLibrary } = useLibrary();
    const [isLoading, setIsLoading] = useState(true);
    const [stories, setStories] = useState<Story[]>([]);
    const [selectedStory, setSelectedStory] = useState<Story>(Story.empty());
    const [sideWindow, setSideWindow] = useState<'detail' | 'add' | 'delete' | 'update' | 'none'>('none');

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

    const deleteStoryList = (story: Story) => {
        library.deleteStory(story);
        updateLibrary();
        setStories([...library.stories]);
    }

    const deleteStoryDetail = (story: Story) => {
        library.deleteStory(story);
        updateLibrary();
        setStories([...library.stories]);
        setSideWindow('none');
    }

    const handleCheckForUpdatesSave = (updated: { story: Story; chapters: Chapter[] }[]) => {
        updated.forEach(r => {
            r.story.newChapters(r.chapters);
        })
        updateLibrary();
        setStories([...stories]);
        setSideWindow('none');
    };

    const handleNewStorySave = (story : Story) => {
        library.addStory(story);
        updateLibrary();
        setStories([...library.stories]);
        setSideWindow('none');
    };

    return (
        <div className="main-view">
            <div className="main-view-button-container">
                <button
                    onClick={() => setSideWindow('update')}
                    className="main-view-button"
                >
                    Check For Updates
                </button>
                <button
                    onClick={() => setSideWindow('add')}
                    className="main-view-button"
                >
                    Add Story
                </button>
                <button
                    onClick={() => setSideWindow('delete')}
                    className="main-view-button"
                >
                    Delete Story
                </button>
            </div>
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
                    : sideWindow == 'delete' ? 
                        <DeleteStory
                            stories={stories}
                                onDelete={deleteStoryList} 
                        />
                    : sideWindow == 'add' ?
                        <EditStoryPanel
                            story={null}
                            onSave={handleNewStorySave}
                            onCancel={() => setSideWindow('none')}
                            onDelete={() => console.error('Delete should be impossible')}
                        />
                    : sideWindow == 'update' ?
                        <UpdateChecker
                            stories={stories}
                            onFinish={handleCheckForUpdatesSave}
                            onCancel={() => setSideWindow('none')}
                        />
                    : null}
                onClose={handleSideWindowClose}
                defaultSideWindowWidth={sideWindow == 'update' ? 750 : 400}
            />

        </div>
    );

    //return <DeleteStory/>
};

export default MainView;