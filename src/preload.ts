import { contextBridge, ipcRenderer } from 'electron';

// Global debug mode setting
const DEBUG_MODE_ENABLED = false; // Set to false to disable debug mode globally

// Expose Docker API to renderer process
contextBridge.exposeInMainWorld('dockerAPI', {
  pingDocker: () => ipcRenderer.invoke('ping-docker'),
  startContainer: (name: string, image: string) => ipcRenderer.invoke('start-container', name, image),
  stopContainer: (name: string) => ipcRenderer.invoke('stop-container', name),
  getContainers: () => ipcRenderer.invoke('get-containers'),
  checkImage: (imageName: string) => ipcRenderer.invoke('check-docker-image', imageName),
});

// Expose MCP Server API to renderer process
contextBridge.exposeInMainWorld('mcpAPI', {
  getStatus: () => ipcRenderer.invoke('mcp-get-status'),
  startServer: () => ipcRenderer.invoke('mcp-start-server'),
  restartServer: () => ipcRenderer.invoke('mcp-restart-server'),
});

// Expose TCP Forwarder API to renderer process (status only - managed by MCP server)
contextBridge.exposeInMainWorld('tcpAPI', {
  getStatus: () => ipcRenderer.invoke('tcp-get-status'),
});

// Expose Sandbox Manager API to renderer process
contextBridge.exposeInMainWorld('sandboxManagerAPI', {
  getStatus: () => ipcRenderer.invoke('sandbox-manager-get-status'),
  deleteSandbox: (sessionId: string) => ipcRenderer.invoke('sandbox-manager-delete-sandbox', sessionId),
  startVNC: (containerName: string, options?: { viewOnly?: boolean }) =>
    ipcRenderer.invoke('sandbox-manager-start-vnc', containerName, options),
  stopVNC: (containerName: string) =>
    ipcRenderer.invoke('sandbox-manager-stop-vnc', containerName),
  getVNCStatus: (containerName: string) =>
    ipcRenderer.invoke('sandbox-manager-get-vnc-status', containerName),
});

// Expose TCP Forwarder Direct API to renderer process
contextBridge.exposeInMainWorld('tcpForwarderAPI', {
  getStatus: () => ipcRenderer.invoke('tcp-forwarder-get-status'),
  start: () => ipcRenderer.invoke('tcp-forwarder-start'),
  stop: () => ipcRenderer.invoke('tcp-forwarder-stop'),
});

// Expose Electron API for window controls
contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  unmaximize: () => ipcRenderer.invoke('window-unmaximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
});

// Expose Settings API to renderer process
contextBridge.exposeInMainWorld('settingsAPI', {
  getSettings: () => ipcRenderer.invoke('settings-get'),
  updateSettings: (updates: any) => ipcRenderer.invoke('settings-update', updates),
  resetToDefaults: () => ipcRenderer.invoke('settings-reset'),
});

// Expose global debug mode setting
contextBridge.exposeInMainWorld('DEBUG_MODE_ENABLED', DEBUG_MODE_ENABLED);
