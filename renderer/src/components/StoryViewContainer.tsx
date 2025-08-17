// Parent component that contains DetailStoryPanel
import React, { useState } from 'react';
import DetailStoryPanel from './DetailStoryPanel';
import EditStoryPanel from './EditStoryPanel';
import { Story } from '../data/library';
import { useLibrary } from '../data/libraryContext';

const StoryViewContainer: React.FC<{ story: Story }> = ({ story }) => {
    const [currentView, setCurrentView] = useState<'detail' | 'edit' | 'none'>('detail');
    const { library, updateLibrary } = useLibrary();

    const handleSave = () => {
        updateLibrary();
        setCurrentView('detail');
    };

    const handleDelete = () => {
        library.deleteStory(story);
        updateLibrary();
        setCurrentView('none');
    };



    return (
        <div className="story-view-container">
            {currentView === 'detail' ? (
                <DetailStoryPanel
                    story={story}
                    onEdit={() => setCurrentView('edit')}
                />
            ) : currentView === 'edit' ? (
                <EditStoryPanel
                    story={story}
                    onSave={handleSave}
                    onCancel={() => setCurrentView('detail')}
                    onDelete={handleDelete}
                />
            ) : (
                <h1> Select A Story </h1>
            )}
        </div>
    );
};

export default StoryViewContainer;