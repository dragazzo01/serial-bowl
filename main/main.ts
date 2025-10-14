// Polyfill browser-like globals for undici (Node fetch)
import { Blob } from "buffer";

if (!(global as any).File) {
  class File extends Blob {
    name: string;
    lastModified: number;

    constructor(chunks: any[], name: string, options: any = {}) {
      super(chunks, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  }
  (global as any).File = File;
}

import { app, BrowserWindow, ipcMain, shell, protocol } from 'electron';
import { getStoryUpdateHTML, parseStoryUpdateHTML } from './tracker';
import { Story } from './lib';
import path from 'path';
import fs from 'fs/promises';
import { exec } from "child_process";


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

      const actualPath = path.join(ASSETSDIR, 'images', relativePath);

      const buffer = await fs.readFile(actualPath);

      // Convert Buffer into Uint8Array
      const uint8 = new Uint8Array(buffer);

      return new Response(uint8, {
        headers: {
          "Content-Type": getMimeType(actualPath),
        },
      });
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
const DEV_LIBRARY_PATH = path.join(PUBLIC_PATH, 'library.json');
const ASSETSDIR = "C:\\Users\\draga\\Documents\\serial-bowl-assets";
const LIBRARY_PATH = path.join(ASSETSDIR, 'library.json');

async function initializeLibrary() {
  try {
    await fs.access(LIBRARY_PATH);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.error('Error initializing library:', error);
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
    const data = await fs.readFile(isDev ? DEV_LIBRARY_PATH :  LIBRARY_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading library:', error);
    return [];
  }
});

// Handle saving the library
ipcMain.handle('saveLibrary', async (_, data) => {
  try {
    if (!isDev) 
      await fs.writeFile(isDev ? DEV_LIBRARY_PATH : LIBRARY_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error saving library:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('getUpdateHTML', async (_, storydata) => {
    const story = new Story(storydata);
    const response = getStoryUpdateHTML(story);
    return response
});

ipcMain.handle('parseUpdateHTML', async (_, storydata, response) => {
  const story = new Story(storydata);
  const newChapters = await parseStoryUpdateHTML(story, response);
  return newChapters.map(chapter => chapter.serialize());
});

// Add this IPC handler in main.ts (place it with the other handlers)
ipcMain.handle('openExternal', async (_, url) => {
  shell.openExternal(url);
});

// getImageURL is app.whenReady().then(()=> ...)

function runGitCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: ASSETSDIR }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

ipcMain.handle("saveToCloud", async (_data) => {
  if (isDev) return { success: true, message: "Did not actually save as this is Dev Mode"}
  try {
    await runGitCommand("git add .");
    await runGitCommand(`git commit -m "desktop saved"`);
    await runGitCommand("git push");
    return { success: true, message: "Changes pushed to cloud" };
  } catch (err) {
    return { success: false, message: String(err) };
  }
});