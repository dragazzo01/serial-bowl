// main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadLibrary: () => ipcRenderer.invoke('loadLibrary'),
  saveLibrary: (data: unknown) => ipcRenderer.invoke('saveLibrary', data),
  getUpdateHTML: (story: unknown) => ipcRenderer.invoke('getUpdateHTML', story),
  parseUpdateHTML: (story: unknown, response: string) => ipcRenderer.invoke('parseUpdateHTML', story, response),
  openExternal: (url: string) => ipcRenderer.invoke('openExternal', url),
  getImageUrl: (relativePath: string) => `app-image:///${encodeURIComponent(relativePath)}`,
  saveToCloud: (data: unknown) => ipcRenderer.invoke('saveToCloud', data),
});
