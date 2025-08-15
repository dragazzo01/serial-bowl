// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Library, Story } from './data/library';

const App: React.FC = () => {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const loadedLibrary = await Library.create();
        setLibrary(loadedLibrary);
      } catch (err) {
        setError('Failed to load library');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadLibrary();
  }, []);

  if (loading) {
    return <div>Loading library...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!library || library.stories.length === 0) {
    return <div>No stories found in the library</div>;
  }

  // Get first three stories
  const firstThreeStories = library.stories.slice(0, 3);

  return (
    <div className="app">
      <h1>My Reading Library</h1>
      <div className="stories-container">
        {firstThreeStories.map((story) => (
          <div key={story.title} className="story-card">
            <h2>{story.title}</h2>
            {story.cover && (
              <img 
                src={story.cover} 
                alt={`Cover for ${story.title}`} 
                className="cover-image"
              />
            )}
            <p>{story.summary}</p>
            
            <div className="chapters">
              <h3>First Chapter:</h3>
              {story.chapters.length > 0 ? (
                <div className="chapter">
                  <p>Title: {story.chapters[0].title}</p>
                  <p>Published: {story.chapters[0].date_published}</p>
                  <p>Status: {story.chapters[0].read ? 'Read' : 'Unread'}</p>
                </div>
              ) : (
                <p>No chapters available</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;