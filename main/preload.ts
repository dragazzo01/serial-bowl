// main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadLibrary: () => ipcRenderer.invoke('loadLibrary'),
  saveLibrary: (data: unknown) => ipcRenderer.invoke('saveLibrary', data),
  checkStoryUpdate: (story: unknown) => ipcRenderer.invoke('checkUpdate', story),
  openExternal: (url: string) => ipcRenderer.invoke('openExternal', url),
});
