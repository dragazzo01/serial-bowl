// renderer/src/App.tsx
import { LibraryProvider } from './data/libraryContext';
import DetailStoryPanel from './components/DetailStoryPanel';
import MainView from './components/MainView';



function App() {
  return (
    <LibraryProvider>
      <MainView />
    </LibraryProvider>
  );
}

export default App;