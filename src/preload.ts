import { contextBridge, ipcRenderer } from 'electron';

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

// Expose TCP Forwarder API to renderer process
contextBridge.exposeInMainWorld('tcpAPI', {
  startForwarders: () => ipcRenderer.invoke('tcp-start-forwarders'),
  stopForwarders: () => ipcRenderer.invoke('tcp-stop-forwarders'),
  getStatus: () => ipcRenderer.invoke('tcp-get-status'),
  getSessionDomain: (sessionId: string, port?: number) => ipcRenderer.invoke('tcp-get-session-domain', sessionId, port),
});
