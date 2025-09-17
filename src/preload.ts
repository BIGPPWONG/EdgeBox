import { contextBridge, ipcRenderer } from 'electron';

// Global debug mode setting
const DEBUG_MODE_ENABLED = false; // Set to false to disable debug mode globally

// Expose Docker API to renderer process
contextBridge.exposeInMainWorld('dockerAPI', {
  pingDocker: () => ipcRenderer.invoke('ping-docker'),
  startContainer: (name: string, image: string) => ipcRenderer.invoke('start-container', name, image),
  stopContainer: (name: string) => ipcRenderer.invoke('stop-container', name),
  getContainers: () => ipcRenderer.invoke('get-containers'),
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
});

// Expose TCP Forwarder Direct API to renderer process
contextBridge.exposeInMainWorld('tcpForwarderAPI', {
  getStatus: () => ipcRenderer.invoke('tcp-forwarder-get-status'),
  start: () => ipcRenderer.invoke('tcp-forwarder-start'),
  stop: () => ipcRenderer.invoke('tcp-forwarder-stop'),
});

// Expose global debug mode setting
contextBridge.exposeInMainWorld('DEBUG_MODE_ENABLED', DEBUG_MODE_ENABLED);
