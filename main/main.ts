import { app, BrowserWindow, ipcMain, shell, protocol } from 'electron';
import { checkStoryUpdate } from './tracker';
import { Story } from './library-symlink';
import path from 'path';
import fs from 'fs/promises';

const isDev = !app.isPackaged; // true when running `npm run dev`

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(PUBLIC_PATH, 'icon.ico')
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  protocol.handle('app-image', async (request) => {
    try {
      const relativePath = path.normalize(
        decodeURIComponent(request.url.replace('app-image:///', ''))
      );
      

      // Security check
      const actualPath = path.join(app.getPath('appData'), 'serial-bowl', 'images', relativePath);

      // Read file and properly convert to Blob
      const buffer = await fs.readFile(actualPath);
      const blob = new Blob([new Uint8Array(buffer)], {
        type: getMimeType(actualPath)
      });

      return new Response(blob);
    } catch (error) {
      console.error(`Error loading image:`, error);
      return new Response(null, { status: 404 });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const PUBLIC_PATH = path.join(__dirname, '../../public/');
const DEFAULT_LIBRARY_PATH = path.join(PUBLIC_PATH, 'library.json');
const LIBRARY_PATH = path.join(app.getPath('userData'), 'library.json');

async function initializeLibrary() {
  try {
    await fs.access(LIBRARY_PATH);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      try {
        const defaultData = await fs.readFile(DEFAULT_LIBRARY_PATH, 'utf-8');
        await fs.writeFile(LIBRARY_PATH, defaultData, 'utf-8');
      } catch (err) {
        console.error('Error initializing library:', err);
        // Fallback to empty array
        await fs.writeFile(LIBRARY_PATH, JSON.stringify([], null, 2), 'utf-8');
      }
    }
  }
}
initializeLibrary();

// Helper function to get MIME type
function getMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}


// Handle loading the library
ipcMain.handle('loadLibrary', async () => {
  try {
    const data = await fs.readFile(LIBRARY_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading library:', error);
    return [];
  }
});

// Handle saving the library
ipcMain.handle('saveLibrary', async (_, data) => {
  try {
    await fs.writeFile(LIBRARY_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error saving library:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('checkUpdate', async (_, storydata) => {
    const story = new Story(storydata);
    const newChapters = await checkStoryUpdate(story);
    return newChapters.map(chapter => chapter.serialize());
});

// Add this IPC handler in main.ts (place it with the other handlers)
ipcMain.handle('openExternal', async (_, url) => {
  shell.openExternal(url);
});