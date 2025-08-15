// main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { Story } from './library-shared';

contextBridge.exposeInMainWorld('electronAPI', {
  loadLibrary: () => ipcRenderer.invoke('loadLibrary'),
  saveLibrary: (data: unknown) => ipcRenderer.invoke('saveLibrary', data),
  tracker: {
    checkStoryUpdate: (story: unknown) => ipcRenderer.invoke('tracker:check-update', story)
  }
});
