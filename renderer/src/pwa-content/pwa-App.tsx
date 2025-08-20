import { useEffect } from 'react';
import MobileView from './MobileView';
import { LibraryProvider } from '../data/libraryContext';
import MainView from '../components/MainView';

function App() {

    // useEffect(() => {
    //     // Ensure viewport meta tag exists
    //     if (!document.querySelector('meta[name="viewport"]')) {
    //         const meta = document.createElement('meta');
    //         meta.name = 'viewport';
    //         meta.content = 'width=device-width, initial-scale=1';
    //         document.head.appendChild(meta);
    //     }
    // }, []);

    return (
        <LibraryProvider>
            <MobileView />
        </LibraryProvider>
    );
}


export default App;