// Parent component that contains DetailStoryPanel
import React, { useState } from 'react';
import DetailStoryPanel from './DetailStoryPanel';
import EditStoryPanel from './EditStoryPanel';
import { Story } from '../../data/library';
import { useLibrary } from '../../data/libraryContext';

interface StoryViewContainerProps {
    story: Story;
    refreshGrid: () => void;
    onDelete: () => void;
}

const StoryViewContainer: React.FC<StoryViewContainerProps> = ({
    story,
    refreshGrid,
    onDelete,
}) => {
    const [currentView, setCurrentView] = useState<'detail' | 'edit'>('detail');
    const { library, updateLibrary } = useLibrary();

    const handleSave = (_: Story) => {
        updateLibrary();
        refreshGrid();
        setCurrentView('detail');
    };

    return (
        <div className="story-view-container">
            {currentView === 'detail' ? (
                <DetailStoryPanel
                    story={story}
                    onEdit={() => setCurrentView('edit')}
                    refreshGrid={refreshGrid}
                />
            ) : currentView === 'edit' ? (
                <EditStoryPanel
                    story={story}
                    onSave={handleSave}
                    onCancel={() => setCurrentView('detail')}
                    onDelete={onDelete}
                />
            ) : (
                <h1> Story Deleted </h1>
            )}
        </div>
    );
};

export default StoryViewContainer;