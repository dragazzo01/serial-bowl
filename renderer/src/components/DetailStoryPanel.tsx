// renderer/src/components/DetailStoryPanel.tsx
import React, { useState } from 'react';
import { Story, Chapter } from '../data/library';
import { useLibrary } from '../data/libraryContext';
import './DetailStoryPanel.css';

interface DetailStoryPanelProps {
    story: Story;
    onEdit: () => void;
}

const DetailStoryPanel: React.FC<DetailStoryPanelProps> = ({
    story,
    onEdit,
}) => {
    const [showChaptersState, setShowChaptersState] = useState(false);
    const [updateTrigger, setUpdateTrigger] = useState(false); // Add this line
    const { library, loadLibrary, updateLibrary } = useLibrary();


    const toggleChapter = (chapter: Chapter) => {
        chapter.toggle()
        setUpdateTrigger(!updateTrigger);
        updateLibrary();
        console.log(`toggleChapter pressed for ${chapter.title}`);
    };

    const openLink = (chapter: Chapter) => {
        chapter.openLink()
        setUpdateTrigger(!updateTrigger);
        updateLibrary();
        console.log(`openLink pressed`);
    };

    const addChapter = () => {
        console.log(`addChapter pressed`);
    };

    const deleteChapter = () => {
        console.log(`deleteChapter pressed`);
    };

    const setAllChapters = (read: boolean) => {
        story.chapters.forEach(chapter => {
            if (chapter.read !== read) {
                chapter.toggle();
            }
        });
        setUpdateTrigger(!updateTrigger);
        updateLibrary();
        console.log(`setAllChapters pressed to ${read}`);
    };

    const allRead = story.chapters.every(chapter => chapter.read);

    return (
        <div className="detail-story-panel">
            {/* Cover and buttons row */}
            <div className="cover-row">
                {story.cover ? (
                    <img
                        src={`/${story.cover}`}
                        alt="Cover"
                        className="cover-image"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = '';
                            target.className = 'cover-placeholder';
                        }}
                    />
                ) : (
                    <div className="cover-placeholder">[Cover not found]</div>
                )}

                <div className="button-group">
                    <button onClick={() => onEdit()} className="action-button">
                        ✏️ Edit
                    </button>
                    <button
                        onClick={() => setShowChaptersState(!showChaptersState)}
                        className="action-button"
                    >
                        📖 Chapters
                    </button>
                    {story.homepageURL && (
                        <button
                            onClick={() => window.electronAPI.openExternal(story.homepageURL)}
                            className="action-button"
                        >
                            Homepage
                        </button>
                    )}
                </div>
            </div>

            {/* Story details */}
            <div className="story-details">
                <h2 className="story-title">
                    {story.title}
                    {!story.checkForUpdates && <span className="not-updating"> (Not Updating)</span>}
                </h2>
                <p className="story-summary">{story.summary}</p>
            </div>

            {/* Chapters section */}
            {showChaptersState && (
                <div className="chapters-section">
                    <div className="chapters-header">
                        <h3>Chapters:</h3>
                        <button
                            onClick={() => setAllChapters(!allRead)}
                            className="chapters-action-button"
                        >
                            {allRead ? 'UNREAD ALL' : 'READ ALL'}
                        </button>
                        <button 
                            onClick={addChapter}
                            className="chapters-action-button"
                        >
                            Add Chapter
                        </button>
                        <button 
                            onClick={deleteChapter}
                            className="chapters-action-button"
                        >
                            Delete Chapter
                        </button>
                    </div>

                    <div className="chapters-list">
                        {[...story.chapters].reverse().map((chapter, index) => (
                            <div key={index} className="chapter-item">
                                <button
                                    onClick={() => toggleChapter(chapter)}
                                    className="chapter-toggle"
                                >
                                    {chapter.read ? '✓' : '✗'}
                                </button>
                                <span
                                    className={`chapter-title ${chapter.url ? 'has-link' : ''}`}
                                    onClick={() => chapter.url && openLink(chapter)}
                                >
                                    {chapter.title}
                                </span>
                                {chapter.read && chapter.dateRead && (
                                    <span className="chapter-date">(Read: {chapter.dateRead})</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DetailStoryPanel;