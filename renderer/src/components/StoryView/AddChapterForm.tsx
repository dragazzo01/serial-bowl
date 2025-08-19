// renderer/src/components/AddChapterForm.tsx
import React, { useState } from 'react';
import { Chapter } from '../../data/library';

interface AddChapterFormProps {
    onSave: (chapter: Chapter, position: number) => void;
    onCancel: () => void;
    totalChapters: number;
}

const AddChapterForm: React.FC<AddChapterFormProps> = ({ onSave, onCancel, totalChapters }) => {
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [position, setPosition] = useState<'first' | 'last' | 'custom'>('last');
    const [customPosition, setCustomPosition] = useState(totalChapters + 1);
    const [datePublished, setDatePublished] = useState('');

    const formatDateToMMDDYYYY = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const month = (date.getMonth() + 1).toString();
        const day = (date.getDate() + 1).toString();
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newChapter = Chapter.new(title, url || null, formatDateToMMDDYYYY(datePublished));

        onSave(newChapter, position === 'custom' ? customPosition - 1 : position === 'last' ? totalChapters : 0)
    };

    return (
        <div className="add-chapter-form">
            <h3>Add New Chapter</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Chapter Title*:</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>URL:</label>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Optional"
                    />
                </div>

                <div className="form-group">
                    <label>Position:</label>
                    <div className="position-options">
                        <label>
                            <input
                                type="radio"
                                checked={position === 'first'}
                                onChange={() => setPosition('first')}
                            />
                            First
                        </label>
                        <label>
                            <input
                                type="radio"
                                checked={position === 'last'}
                                onChange={() => setPosition('last')}
                            />
                            Last
                        </label>
                        <label>
                            <input
                                type="radio"
                                checked={position === 'custom'}
                                onChange={() => setPosition('custom')}
                            />
                            Custom:
                        </label>
                        {position === 'custom' && (
                            <input
                                type="number"
                                min="1"
                                max={totalChapters + 1}
                                value={customPosition}
                                onChange={(e) => setCustomPosition(parseInt(e.target.value))}
                                className="custom-position-input"
                            />
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label>Date Published:</label>
                    <input
                        type="date"
                        onChange={(e) => setDatePublished(e.target.value)}
                    />
                </div>

                <div className="form-buttons">
                    <button type="button" onClick={onCancel} className="cancel-button">
                        Cancel
                    </button>
                    <button type="submit" className="save-button">
                        Save Chapter
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddChapterForm;