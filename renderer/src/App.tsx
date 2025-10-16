// renderer/src/App.tsx
import { LibraryProvider } from './data/libraryContext';
import MainView from './components/MainView';
import WebsiteView from './pwa-content/WebsiteView'
import api from './api/api'
import './style/theme.css';



function App() {
  if (api.isElectron) {
    console.log("in electron");
    return (
      <LibraryProvider>
        <MainView />
      </LibraryProvider>
    );
  } else {
    console.log("in website");
    return (
      <LibraryProvider>
        <MainView />
      </LibraryProvider>
    )
  }
  
}

export default App;