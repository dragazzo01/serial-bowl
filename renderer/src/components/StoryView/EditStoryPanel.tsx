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
        status: story?.status || 'reading',
        additionalInfo: story?.additionalInfo
        ? Object.entries(story.additionalInfo).map(([key, value]) => ({ key, value: String(value ?? '') }))
        : [],
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
    
    const handleAdditionalInfoChange = (index: number, field: 'key' | 'value', newValue: string) => {
        setEditedStory(prev => {
            const updated = [...prev.additionalInfo];
            updated[index] = { ...updated[index], [field]: newValue };
            return { ...prev, additionalInfo: updated };
        });
    };

    const handleAddAdditionalInfo = () => {
        setEditedStory(prev => ({
            ...prev,
            additionalInfo: [...prev.additionalInfo, { key: '', value: '' }]
        }));
    };

    const handleDeleteAdditionalInfo = (index: number) => {
        setEditedStory(prev => {
            const updated = prev.additionalInfo.filter((_, i) => i !== index);
            return { ...prev, additionalInfo: updated };
        });
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
                const fixedStory = {
                    ...editedStory, 
                    additionalInfo: Object.fromEntries(
                        editedStory.additionalInfo
                            .filter(pair => pair.key.trim() !== '') // skip empty keys
                            .map(pair => [pair.key, pair.value])     // [key, value] tuples
                    )
                }
                if (story) {
                    story.editStory(fixedStory);
                    onSave(story);
                } else {
                    const newStory = Story.empty()
                    newStory.editStory(fixedStory)
                    onSave(newStory);
                }                
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

            <div className="form-group">
                <label>Status:</label>
                <select
                    name="status"
                    value={editedStory.status}
                    onChange={(e) => {
                        console.log(e.target.value);
                        setEditedStory(prev => ({
                            ...prev,
                            status: e.target.value as 'reading' | 'complete' | 'broken' | 'hidden' | 'hiatus' | 'dropped'
                            
                        }))}
                    }
                >
                    <option value="reading">Reading</option>
                    <option value="complete">Complete</option>
                    <option value="broken">Broken</option>
                    <option value="hidden">Hidden</option>
                    <option value="hiatus">Hiatus</option>
                    <option value="dropped">Dropped</option>
                </select>
            </div>

            <div className="form-group">
                <label>Additional Info:</label>
                <div className="additional-info-list">
                    {editedStory.additionalInfo.map((pair, index) => (
                        <div key={index} className="additional-info-item">
                            <input
                                type="text"
                                placeholder="Key"
                                value={pair.key}
                                onChange={(e) => handleAdditionalInfoChange(index, 'key', e.target.value)}
                                className="key-input"
                            />
                            <input
                                type="text"
                                placeholder="Value"
                                value={pair.value}
                                onChange={(e) => handleAdditionalInfoChange(index, 'value', e.target.value)}
                                className="value-input"
                            />
                            <button
                                type="button"
                                className="delete-additional-button"
                                onClick={() => handleDeleteAdditionalInfo(index)}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAddAdditionalInfo}
                        className="add-additional-button"
                    >
                        + Add Field
                    </button>
                </div>
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