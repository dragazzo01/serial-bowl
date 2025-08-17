// renderer/src/components/MainView.tsx
import React, { useEffect, useState } from 'react';
import { useLibrary } from '../data/libraryContext';
import StoryViewContainer from './StoryViewContainer';
import { Library, Story } from '../data/library';

const MainView: React.FC = () => {
    const { library, loadLibrary, updateLibrary } = useLibrary();
    const [isLoading, setIsLoading] = useState(true);
    const [firstStory, setFirstStory] = useState<Story | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const loadedLibrary = await loadLibrary();
                if (loadedLibrary.stories.length > 0) {
                    setFirstStory(loadedLibrary.stories[0]);
                }
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

    if (!firstStory) {
        return <div>No stories found in the library</div>;
    }

    return (
        <div className="main-view">
            <StoryViewContainer story={firstStory} />
        </div>
    );
};

export default MainView;