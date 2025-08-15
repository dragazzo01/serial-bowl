// main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadLibrary: () => ipcRenderer.invoke('load-library'),
  saveLibrary: (data: unknown) => ipcRenderer.invoke('save-library', data)
});

//export type ElectronAPI = typeof window.electronAPI;