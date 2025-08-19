// StoryWidget.tsx
import React from 'react';
import { Story, Chapter } from '../../data/library';
import './StoryGridElem.css';

interface StoryGridElemProps {
    story: Story;
    onClick: (story: Story) => void;
    onToggleUpdates: (story: Story) => void;
    onChapterClick: (chapter: Chapter) => void;
}

const StoryGridElem: React.FC<StoryGridElemProps> = ({
    story,
    onClick,
    onToggleUpdates,
    onChapterClick
}) => {
    const lastRead = story.getLastReadChapter();
    const lastKnown = story.getLastKnownChapter();
    const firstUnread = story.getFirstUnread();

    // Determine widget color based on story status
    const getWidgetColor = () => {
        if (story.finished()) {
            return story.checkForUpdates ? 'finished-updates' : 'finished-no-updates';
        } else {
            return story.checkForUpdates ? 'unfinished-updates' : 'unfinished-no-updates';
        }
    };

    const handleReadClick = () => {
        if (firstUnread) {
            onChapterClick(firstUnread);
        }
    };

    const handleToggleUpdates = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleUpdates(story);
    };

    return (
        <div
            className={`story-widget ${getWidgetColor()}`}
            onClick={() => onClick(story)}
        >
            <div className="cover-container">
                {story.coverPath ? (
                    <img
                        src={`${story.coverPath}`}
                        alt={story.title}
                        className="cover-image"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="no-cover">[No Cover]</div>
                )}
            </div>

            <div className="info-container">
                <h3 className="story-title">{story.title}</h3>

                <button
                    className="updates-button"
                    onClick={handleToggleUpdates}
                >
                    {story.checkForUpdates ? 'Disable Updates' : 'Enable Updates'}
                </button>

                {lastRead && (
                    <div
                        className={`chapter-link ${lastRead.url ? 'clickable' : ''}`}
                        onClick={(e) => {
                            if (lastRead.url) {
                                e.stopPropagation();
                                onChapterClick(lastRead);
                            }
                        }}
                    >
                        Last Read: {lastRead.title}
                    </div>
                )}

                {lastKnown && (
                    <div
                        className={`chapter-link ${lastKnown.url ? 'clickable' : ''}`}
                        onClick={(e) => {
                            if (lastKnown.url) {
                                e.stopPropagation();
                                onChapterClick(lastKnown);
                            }
                        }}
                    >
                        Last Updated: {lastKnown.title}
                    </div>
                )}

                <button
                    className="read-button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleReadClick();
                    }}
                    disabled={!firstUnread}
                >
                    {firstUnread ? 'Read Next' : 'All Read'}
                </button>
            </div>
        </div>
    );
};

export default StoryGridElem;