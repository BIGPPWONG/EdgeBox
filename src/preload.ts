import { contextBridge, ipcRenderer } from 'electron';

// Expose Docker API to renderer process
contextBridge.exposeInMainWorld('dockerAPI', {
  pingDocker: () => ipcRenderer.invoke('ping-docker'),
  startContainer: (name: string, image: string) => ipcRenderer.invoke('start-container', name, image),
  stopContainer: (name: string) => ipcRenderer.invoke('stop-container', name),
  getContainers: () => ipcRenderer.invoke('get-containers'),
});
