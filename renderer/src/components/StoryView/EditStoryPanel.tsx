// renderer/src/components/EditStoryPanel.tsx
import React, { useState } from 'react';
import { Story } from '../../data/library';
import './EditStoryPanel.css';
import ConfirmationDialogue from '../ConfirmationDialogue';
import useConfirmation from '../../hooks/useConfirmation'

interface EditStoryPanelProps {
    story: Story | null;
    onSave: (story: Story) => void;
    onCancel: () => void;
    onDelete: () => void;
}

const EditStoryPanel: React.FC<EditStoryPanelProps> = ({
    story,
    onSave,
    onCancel,
    onDelete
}) => {
    // Create a state object with default values
    const [editedStory, setEditedStory] = useState({
        title: story?.title || '',
        coverImage: story?.coverRelativePath || '',
        summary: story?.summary || '',
        homepageURL: story?.homepageURL || '',
        checkForUpdates: story?.checkForUpdates || false,
    });

    const {
        isOpen,
        askConfirmation,
        handleConfirm,
        handleCancel,
        config,
    } = useConfirmation();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedStory(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setEditedStory(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    const handleSave = () => {
        // Validate required fields
        if (!editedStory.title.trim()) {
            askConfirmation(
                'Title is required. Please enter a title before saving.',
                () => { },
                'OK',
                ''
            );
            return;
        }

        const action = story ? 'save edits to' : 'create new story';
        const title = story ? story.title : 'New Story';

        askConfirmation(
            `Are you sure you want to ${action} "${editedStory.title || title}"?`,
            () => {
                if (story) {
                    story.editStory({
                        ...editedStory,
                        coverImage: editedStory.coverImage,
                        homepageURL: editedStory.homepageURL,
                    });
                    onSave(story);
                } else {
                    const newStory = Story.empty()
                    newStory.editStory(editedStory)
                    onSave(newStory);
                }
                // If story is null, the parent component should handle the creation
                
            },
            story ? 'Save' : 'Create',
            'Cancel'
        )
    };

    const handleDelete = () => {
        if (!story) {
            // If there's no story, just cancel (shouldn't happen as Delete button won't show)
            onCancel();
            return;
        }

        askConfirmation(
            `Are you sure you want to delete ${story.title}?`,
            onDelete,
            'Delete',
            'Cancel'
        )
    }

    return (
        <div className="edit-story-panel">
            <h2>{story ? 'Edit Story' : 'Create New Story'}</h2>

            <div className="form-group">
                <label>Title:</label>
                <input
                    type="text"
                    name="title"
                    value={editedStory.title}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="form-group">
                <label>Cover Image Path:</label>
                <input
                    type="text"
                    name="coverImage"
                    value={editedStory.coverImage}
                    onChange={handleChange}
                />
            </div>

            <div className="form-group">
                <label>Summary:</label>
                <textarea
                    name="summary"
                    value={editedStory.summary}
                    onChange={handleChange}
                    rows={5}
                />
            </div>

            <div className="form-group">
                <label>Homepage URL:</label>
                <input
                    type="text"
                    name="homepageURL"
                    value={editedStory.homepageURL}
                    onChange={handleChange}
                />
            </div>

            <div className="form-group checkbox">
                <label>
                    <input
                        type="checkbox"
                        name="checkForUpdates"
                        checked={editedStory.checkForUpdates}
                        onChange={handleCheckboxChange}
                    />
                    Check for Updates
                </label>
            </div>

            <div className="button-group">
                <button onClick={handleSave} className="save-button">
                    {story ? 'Save' : 'Create'}
                </button>
                <button onClick={onCancel} className="cancel-button">
                    Cancel
                </button>
                {story && (
                    <button onClick={handleDelete} className="delete-button">
                        Delete Story
                    </button>
                )}
                {isOpen && config && (
                    <ConfirmationDialogue
                        message={config.message}
                        onConfirm={handleConfirm}
                        onCancel={handleCancel}
                        confirmText={config.confirmText}
                        cancelText={config.cancelText}
                    />
                )}
            </div>
        </div>
    );
};

export default EditStoryPanel;