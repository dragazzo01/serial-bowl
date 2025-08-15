import { app, BrowserWindow, ipcMain } from 'electron';
import { checkStoryUpdate } from './tracker';
import { Story } from './library-shared';
import * as path from 'path';
import fs from 'fs/promises';

const isDev = !app.isPackaged; // true when running `npm run dev`

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
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
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const LIBRARY_PATH = path.join(__dirname, 'library.json');
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

// Add this IPC handler in main.ts (place it with the other handlers)
ipcMain.handle('tracker:check-update', async (_, storydata) => {
  try {
    const story = new Story(storydata)
    const newChapters = await checkStoryUpdate(story);
    const chapterdata = newChapters.map(chapter => chapter.serialize())
    return chapterdata;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return error instanceof Error ? error.message : String(error);
  }
});