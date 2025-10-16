import React from 'react';
import { Story } from '../data/library';
import './DeleteStory.css';
import ConfirmationDialogue from './ConfirmationDialogue';
import useConfirmation from '../hooks/useConfirmation'

interface DeleteStoryProps {
    stories: Story[];
    onDelete: (story: Story) => void;
}

const DeleteStory: React.FC<DeleteStoryProps> = ({ stories, onDelete }) => {
    const {
        isOpen,
        askConfirmation,
        handleConfirm,
        handleCancel,
        config,
    } = useConfirmation();

    const handleDelete = (story: Story) => {
        askConfirmation(
            `Are you sure you want to save delete to ${story.title}?`,
            () => onDelete(story),
            'Delete',
            'Cancel',
        )
    };



    return (
        <div className="delete-story-container">
            {isOpen && config && (
                <ConfirmationDialogue
                    message={config.message}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    confirmText={config.confirmText}
                    cancelText={config.cancelText}
                />
            )}
            <h2>Select Stories to Delete</h2>
            <div className="stories-list">
                {stories.length === 0 ? (
                    <p>No stories available</p>
                ) : (
                    <ul>
                        {stories.map((story) => (
                            <li key={story.title} className="story-item">
                                <div className="story-info">
                                    <h3>{story.title}</h3>
                                    {story.coverPath && (
                                        <img
                                            src={story.coverPath}
                                            alt={`Cover for ${story.title}`}
                                            className="story-cover"
                                        />
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(story)}
                                    className="delete-button"
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default DeleteStory;