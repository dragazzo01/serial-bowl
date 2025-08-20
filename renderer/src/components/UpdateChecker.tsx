import React, { useEffect, useState } from "react";
import "./UpdateChecker.css";
import { Story, Chapter } from "../data/library";
import ConfirmationDialogue from './ConfirmationDialogue';
import useConfirmation from '../hooks/useConfirmation';
import api from '../api/api'

//import { checkStoryUpdateNew } from "../data/tracker";

interface UpdateCheckerProps {
    stories: Story[];
    onFinish: (updated: { story: Story; chapters: Chapter[] }[]) => void;
    onCancel: () => void;
}

const UpdateChecker: React.FC<UpdateCheckerProps> = ({ stories, onFinish, onCancel }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [status, setStatus] = useState("Starting...");
    const [results, setResults] = useState<
        ({ type: "success"; story: Story; chapters: Chapter[] } | { type: "error"; story: Story; error: string })[]
    >([]);
    const [finished, setFinished] = useState(false);

    const {
        isOpen,
        askConfirmation,
        handleConfirm,
        handleCancel,
        config,
    } = useConfirmation();

    useEffect(() => {
        if (finished || currentIndex >= stories.length) return;

        const checkNext = async () => {
            const story = stories[currentIndex];
            setStatus(`Checking: ${story.title}`);

            if (!story.checkForUpdates) {
                setCurrentIndex((prev) => prev + 1);
                return;
            }

            try {
                const newChaptersData = await api.checkStoryUpdate(story.serialize());
                const newChapters = newChaptersData.map((c) => new Chapter(c));


                if (newChapters.length > 0) {
                    setResults((prev) => [...prev, { type: "success", story, chapters: newChapters }]);
                }
            } catch (err: any) {
                let msg = "";
                if (err?.message) {
                    // Strip the Electron IPC wrapper if present
                    const match = err.message.match(/Error:\s*(.*)$/);
                    msg = match ? match[1] : err.message;
                } else {
                    msg = String(err);
                }

                setResults((prev) => [...prev, { type: "error", story, error: msg }]);
            } finally {
                setCurrentIndex((prev) => prev + 1);
            }
        };

        // Delay slightly to keep UI responsive
        const timer = setTimeout(checkNext, 200);
        return () => clearTimeout(timer);
    }, [currentIndex, stories, finished]);

    useEffect(() => {
        if (currentIndex >= stories.length && !finished) {
            setFinished(true);
            if (results.length === 0) setStatus("No updates found");
            else {
                const totalChapters = results
                    .filter((r) => r.type === "success")
                    .reduce((sum, r: any) => sum + r.chapters.length, 0);
                setStatus(`Found ${totalChapters} new chapters in ${results.length} stories`);
            }
        }
    }, [currentIndex, stories.length, finished, results]);

    const handleSave = () => {
        askConfirmation(
            `Are you sure you want to add the new chapters?`,
            () => {
                onFinish(
                    results
                        .filter((r): r is { type: "success"; story: Story; chapters: Chapter[] } => r.type === "success")
                        .map((r) => ({ story: r.story, chapters: r.chapters }))
                )},
            'Add Chapters',
            'Cancel',
        )
    }

    return (
        <div className="update-panel">
            {isOpen && config && (
                <ConfirmationDialogue
                    message={config.message}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    confirmText={config.confirmText}
                    cancelText={config.cancelText}
                />
            )}
            <h3>Checking for Updates</h3>
            <div className="progress-container">
                <progress value={currentIndex} max={stories.length}></progress> 
            </div>
            <span>{status}</span>

            <div className="results">
                {results.map((res, idx) =>
                    res.type === "success" ? (
                        <div key={idx} className="result success">
                            <strong>
                                {res.story.title} - {res.chapters.length} new chapter(s)
                            </strong>
                            <ul>
                                {res.chapters.map((ch, i) => (
                                    <li key={i}>{ch.title}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div key={idx} className="result error">
                            <strong>{res.story.title} - Error</strong>
                            <p>{res.error}</p>
                        </div>
                    )
                )}
            </div>

            {finished && (
                <div className="update-buttons">
                    <button className="save-updates"
                        onClick={handleSave}
                    >
                        Save
                    </button>
                    <button className="cancel-updates" onClick={onCancel}>Cancel</button>
                </div>
            )}
        </div>
    );
};

export default UpdateChecker;
