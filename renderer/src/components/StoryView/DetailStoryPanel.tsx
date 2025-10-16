// renderer/src/components/DetailStoryPanel.tsx
import React, { useState } from 'react';
import { Story, Chapter } from '../../data/library';
import { useLibrary } from '../../data/libraryContext';
import AddChapterForm from './AddChapterForm'
import api from '../../api/api'
import './DetailStoryPanel.css';
import useConfirmation from '../../hooks/useConfirmation'
import ConfirmationDialogue from '../ConfirmationDialogue';

interface DetailStoryPanelProps {
    story: Story;
    onEdit: () => void;
    refreshGrid: () => void;
}

const DetailStoryPanel: React.FC<DetailStoryPanelProps> = ({
    story,
    onEdit,
    refreshGrid,
}) => {
    const [showChaptersState, setShowChaptersState] = useState(false);
    const [updateTrigger, setUpdateTrigger] = useState(false);
    const [deleteMode, setDeleteMode] = useState(false); 
    const [showAddChapterForm, setShowAddChapterForm] = useState(false);
    const { updateLibrary } = useLibrary();
    const {
        isOpen,
        askConfirmation,
        handleConfirm,
        handleCancel,
        config,
    } = useConfirmation();

    const saveChapterUpdate = () => {
        setUpdateTrigger(!updateTrigger);
        refreshGrid();
        updateLibrary();
    }

    const toggleChapter = (chapter: Chapter) => {
        chapter.toggle();
        saveChapterUpdate();
    };

    const openLink = (chapter: Chapter) => {
        chapter.openLink();
        saveChapterUpdate();
    };

    const addChapter = () => {
        setShowAddChapterForm(true);
    };

    const handleDeleteChapter = (chapter: Chapter) => {
        // Remove the chapter from the story's chapters array
        const chapterIndex = story.chapters.indexOf(chapter);
        if (chapterIndex !== -1) {
            story.chapters.splice(chapterIndex, 1);
            saveChapterUpdate();
        }
    };

    const toggleDeleteMode = () => {
        setDeleteMode(!deleteMode);
    };

    const setAllChapters = (read: boolean) => {
        if (deleteMode) return; // Don't allow read/unread all while in delete mode
        
        story.chapters.forEach(chapter => {
            if (chapter.read !== read) {
                chapter.toggle();
            }
        });
        saveChapterUpdate();
    };

    const handleSaveNewChapter = (chapter: Chapter, position: number) => {
        story.addChapter(chapter, position);
        saveChapterUpdate();
        setShowAddChapterForm(false);
    };

    const handleCancelAddChapter = () => {
        setShowAddChapterForm(false);
    };

    const handleCheckForUpdates = async () => {
        const newChaps = await story.getUpdates();
        console.log(newChaps)
        askConfirmation(
            `Would you like to add ${newChaps.length} chapters to your manga`,
            () => {
                story.newChapters(newChaps);
                setShowChaptersState(true);
            },
            'Yes',
            'No'
        );
    }

    const allRead = story.chapters.every(chapter => chapter.read);

    return (
        <div className="detail-story-panel">
            {/* Cover and buttons row */}
            <div className="cover-row">
                {story.coverPath ? (
                    <img
                        src={`${story.coverPath}`}
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
                            onClick={() => api.openExternal(story.homepageURL)}
                            className="action-button"
                        >
                            Homepage
                        </button>
                    )}
                    <button
                        onClick={handleCheckForUpdates}
                        className="action-button"
                    >
                        Check For Updates
                    </button>
                </div>
            </div>

            {/* Story details */}
            <div className="story-details">
                <h2 className="story-title">
                    {story.title}
                    {!story.checkForUpdates && <span className="not-updating"> (Not Updating)</span>}
                </h2>
                <p className="story-status">Status: {story.status.charAt(0).toUpperCase() + story.status.slice(1) }</p>
                <p className="story-summary">{story.summary}</p>
            </div>

            {/* Chapters section */}
            {showChaptersState && (
                <div className="chapters-section">
                    {showAddChapterForm ? (
                        <AddChapterForm
                            onSave={handleSaveNewChapter}
                            onCancel={handleCancelAddChapter}
                            totalChapters={story.chapters.length}
                        />
                    ) : (
                    <>
                        <div className="chapters-header">
                        <h3>Chapters:</h3>
                        {!deleteMode && (
                            <button
                                onClick={() => setAllChapters(!allRead)}
                                className="chapters-action-button"
                            >
                                {allRead ? 'UNREAD ALL' : 'READ ALL'}
                            </button>

                        )}
                        {!deleteMode && (
                            <button
                                onClick={addChapter}
                                className="chapters-action-button"
                            >
                                Add Chapter
                            </button>

                        )}
                        <button 
                            onClick={toggleDeleteMode}
                            className={`chapters-action-button ${deleteMode ? 'delete-mode-active' : ''}`}
                        >
                            {deleteMode ? 'Cancel Delete' : 'Delete Chapter'}
                        </button>
                    </div>

                    <div className="chapters-list">
                        {[...story.chapters].reverse().map((chapter, index) => (
                            <div key={index} className="chapter-item">
                                <button
                                    onClick={() => deleteMode ? handleDeleteChapter(chapter) : toggleChapter(chapter)}
                                    className={`chapter-toggle ${deleteMode ? 'delete-mode' : ''}`}
                                >
                                    {deleteMode ? '🗑️' : (chapter.read ? '✓' : '✗')}
                                </button>
                                <span
                                    className={`chapter-title ${chapter.url ? 'has-link' : ''}`}
                                    onClick={() => chapter.url && !deleteMode && openLink(chapter)}
                                >
                                    {chapter.title}
                                </span>
                                {chapter.read && chapter.dateRead && !deleteMode && (
                                    <span className="chapter-date">(Read: {chapter.dateRead})</span>
                                )}
                            </div>
                        ))}
                    </div>
                    {deleteMode && (
                        <div className="delete-mode-notice">
                            Click on the trash can icons to delete chapters
                        </div>
                    )}
                    </>
                    )}
                </div>
            )}
            {
                isOpen && config && (
                    <ConfirmationDialogue
                        message={config.message}
                        onConfirm={handleConfirm}
                        onCancel={handleCancel}
                        confirmText={config.confirmText}
                        cancelText={config.cancelText}
                    />
                )
            }
        </div>
    );
};

export default DetailStoryPanel;