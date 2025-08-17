// renderer/src/components/EditStoryPanel.tsx
import React, { useState } from 'react';
import { Story } from '../data/library';
import './EditStoryPanel.css';

interface EditStoryPanelProps {
    story: Story;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
}

const EditStoryPanel: React.FC<EditStoryPanelProps> = ({
    story,
    onSave,
    onCancel,
    onDelete
}) => {
    // Create a state object that matches the StoryData interface
    const [editedStory, setEditedStory] = useState({
        title: story.title,
        coverImage: story.cover,
        summary: story.summary,
        homepageURL: story.homepageURL,
        checkForUpdates: story.checkForUpdates,
        chapters: story.chapters.map(chap => chap.serialize())
    });

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
        // Create a new Story instance with the edited data
        story.editStory({
            ...editedStory,
            coverImage: editedStory.coverImage,
            homepageURL: editedStory.homepageURL,
            //chapters: story.chapters.map(c => c.serialize()) // Preserve the original Chapter instances
        });
        onSave();
    };

    return (
        <div className="edit-story-panel">
            <h2>Edit Story</h2>

            <div className="form-group">
                <label>Title:</label>
                <input
                    type="text"
                    name="title"
                    value={editedStory.title}
                    onChange={handleChange}
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
                    Save
                </button>
                <button onClick={onCancel} className="cancel-button">
                    Cancel
                </button>
                <button onClick={onDelete} className="delete-button">
                    Delete Story
                </button>
            </div>
        </div>
    );
};

export default EditStoryPanel;