// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Library, Chapter } from './data/library';

const App: React.FC = () => {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRunning = useRef(false); // Track if operation is in progress

  const loadAndUpdateLibrary = async () => {
    if (isRunning.current) return; // Prevent concurrent executions
    isRunning.current = true;
    setLoading(true);
    setError(null);

    try {
      const loadedLibrary = await Library.create();

      for (const story of loadedLibrary.stories) {
        try {
          const result = await window.electronAPI.tracker.checkStoryUpdate(story.serialize());
          console.log(`Found ${result.length} chapters`);
          if (result.length) {
            story.newChapters(result.map(c => new Chapter(c)));
          }
        } catch (err) {
          console.error(`Failed to check updates for ${story.title}:`, err);
        }
      }

      //await loadedLibrary.saveLibrary()
      setLibrary(loadedLibrary);
      setLoading(false);
    } catch (err) {
      setError('Failed to load library');
      console.error(err);
    } finally {
      isRunning.current = false;
    }
  };

  // Initial load
  useEffect(() => {
    loadAndUpdateLibrary();
  }, []);

  const handleRefresh = () => {
    if (!loading) { // Additional safeguard
      loadAndUpdateLibrary();
    }
  };

  if (loading) {
    return <div>Loading and checking for updates...</div>;
  }

  if (error) {
    return (
      <div>
        Error: {error}
        <button onClick={handleRefresh}>Try Again</button>
      </div>
    );
  }

  if (!library || library.stories.length === 0) {
    return (
      <div>
        No stories found in the library
        <button onClick={handleRefresh}>Refresh</button>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>My Reading Library</h1>
      <button
        onClick={handleRefresh}
        disabled={loading}
        style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Refreshing...' : 'Refresh Library'}
      </button>
      <div className="stories-list">
        {library.stories.map((story) => (
          <div key={story.title} className="story-item">
            <h2>{story.title}</h2>
            {story.chapters.length > 0 ? (
              <div>
                <p>Last: {story.getLastKnownChapter().title}</p>
                <p>Total chapters: {story.chapters.length}</p>
              </div>
            ) : (
              <p>No chapters available</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;