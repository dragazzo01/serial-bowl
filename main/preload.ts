// main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadLibrary: () => ipcRenderer.invoke('loadLibrary'),
  updateStoryMeta: (storyId: string, meta: unknown) => ipcRenderer.invoke('updateStoryMeta', storyId, meta),
  upsertChapters: (storyId: string, chapters: unknown) => ipcRenderer.invoke('upsertChapters', storyId, chapters),
  replaceChapters: (storyId: string, chapters: unknown) => ipcRenderer.invoke('replaceChapters', storyId, chapters),
  deleteStoryRemote: (storyId: string) => ipcRenderer.invoke('deleteStory', storyId),
  getUpdateHTML: (story: unknown) => ipcRenderer.invoke('getUpdateHTML', story),
  parseUpdateHTML: (story: unknown, response: string) => ipcRenderer.invoke('parseUpdateHTML', story, response),
  openExternal: (url: string) => ipcRenderer.invoke('openExternal', url),
  getImageUrl: (relativePath: string) => `app-image:///${encodeURIComponent(relativePath)}`,
  saveLibraryToFile: (data: unknown) => ipcRenderer.invoke('saveLibraryToFile', data),
  loadLibraryFromFile: () => ipcRenderer.invoke('loadLibraryFromFile'),
});
