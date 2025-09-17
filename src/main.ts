import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { spawn, ChildProcess } from 'child_process';
import { DEFAULT_CONTAINER_PORTS } from './constants/ports';
import { SandboxManager } from './services/sandbox-manager';
import { DockerManager } from './services/docker-manager';
import { SettingsManager } from './services/settings-manager';
import mcpServer, { getActiveSessions, sandboxManagerForMain, tcpForwarder, setSettingsManager } from './services/mcp/server';
// Initialize global sandbox manager as early as possible
// We'll set up the actual instance after creating dockerManager

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'E2B Desktop',
    icon: process.platform === 'darwin' ? undefined : path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// (Moved to the bottom with MCP server startup)

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up all containers when the app is quitting
const cleanupContainers = async () => {
  try {
    console.log('Cleaning up containers...');
    const containers = dockerManager.getAllContainers();

    for (const container of containers) {
      try {
        await dockerManager.stopContainer(container.id);
        console.log(`Stopped container: ${container.id}`);
      } catch (error) {
        console.error(`Failed to stop container ${container.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error during container cleanup:', error);
  }
};

// Handle app quit events
app.on('before-quit', async (event) => {
  event.preventDefault();
  await cleanupContainers();
  app.exit();
});

// Handle process termination signals
process.on('SIGINT', async () => {
  console.log('Received SIGINT, cleaning up...');
  await cleanupContainers();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, cleaning up...');
  await cleanupContainers();
  process.exit(0);
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Create DockerManager instance for main process
const dockerManager = new DockerManager();
console.log('Creating SandboxManager with DockerManager');

// Create SettingsManager instance for main process
const settingsManager = new SettingsManager();

// Inject settings manager into MCP server and sandbox manager
setSettingsManager(settingsManager);
sandboxManagerForMain.setSettingsManager(settingsManager);

// IPC handlers
ipcMain.handle('ping-docker', async () => {
  try {
    const isRunning = await dockerManager.pingDocker();
    return { success: true, isRunning };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('start-container', async (_, containerName: string, image: string) => {
  try {
    const config = { id: containerName, dockerImage: image };
    const container = await dockerManager.startContainer(config as any);
    return { success: true, container };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('stop-container', async (_, containerName: string) => {
  try {
    const result = await dockerManager.stopContainer(containerName);
    return { success: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('get-containers', async () => {
  try {
    const containers = dockerManager.getAllContainers();
    return { success: true, containers };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('check-docker-image', async (_, imageName: string) => {
  try {
    const hasImage = await dockerManager.hasImage(imageName);
    return { success: true, hasImage };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// MCP Server Management
interface MCPServerStatus {
  status: 'starting' | 'running' | 'error' | 'stopped';
  port: number;
  activeSessions: number;
  startTime?: Date;
  error?: string;
}

class MCPServerManager {
  private status: MCPServerStatus = {
    status: 'stopped',
    port: 8888,
    activeSessions: 0,
  };

  async startServer(): Promise<MCPServerStatus> {
    // Return current status if already running
    if (this.status.status === 'running') {
      console.log('MCP Server already running');
      return this.status;
    }

    // Reset status if in error state
    if (this.status.status === 'error') {
      this.status.status = 'stopped';
    }

    try {
      this.status.status = 'starting';
      console.log('Starting MCP Server...');

      // Get port from settings
      const settings = settingsManager.getSettings();
      const mcpPort = settings.mcpPort || 8888;

      // Start the MCP server with configuration
      await mcpServer.start({
        transportType: "httpStream",
        httpStream: {
          port: mcpPort,
        },
      });

      this.status = {
        status: 'running',
        port: mcpPort,
        activeSessions: 0,
        startTime: new Date(),
      };

      console.log(`MCP Server started successfully on port ${mcpPort}`);
      return this.status;
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      this.status = {
        status: 'error',
        port: 8888,
        activeSessions: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      return this.status;
    }
  }

  async stopServer(): Promise<MCPServerStatus> {
    // Return current status if already stopped
    if (this.status.status === 'stopped') {
      console.log('MCP Server already stopped');
      return this.status;
    }

    try {
      const previousStatus = this.status.status;
      this.status.status = 'starting';
      console.log('Stopping MCP Server...');

      // Stop the current server if running
      if (previousStatus === 'running') {
        try {
          await mcpServer.stop();
          console.log('MCP Server stopped successfully');
        } catch (stopError) {
          console.warn('Failed to stop server gracefully:', stopError);
        }
      }

      this.status = {
        status: 'stopped',
        port: 8888,
        activeSessions: 0,
      };

      return this.status;
    } catch (error) {
      console.error('Failed to stop MCP server:', error);
      this.status = {
        status: 'error',
        port: 8888,
        activeSessions: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      return this.status;
    }
  }

  async restartServer(): Promise<MCPServerStatus> {
    try {
      this.status.status = 'starting';
      console.log('Restarting MCP Server...');

      // Stop the current server if running
      try {
        await mcpServer.stop();
      } catch (stopError) {
        console.warn('Failed to stop current server, continuing anyway:', stopError);
      }

      // Get port from settings
      const settings = settingsManager.getSettings();
      const mcpPort = settings.mcpPort || 8888;

      // Start the server with fresh configuration
      await mcpServer.start({
        transportType: "httpStream",
        httpStream: {
          port: mcpPort,
        },
      });

      this.status = {
        status: 'running',
        port: mcpPort,
        activeSessions: 0,
        startTime: new Date(),
      };

      console.log(`MCP Server restarted successfully on port ${mcpPort}`);
      return this.status;
    } catch (error) {
      console.error('Failed to restart MCP server:', error);
      this.status = {
        status: 'error',
        port: 8888,
        activeSessions: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      return this.status;
    }
  }

  getStatus(): MCPServerStatus {
    if (this.status.status === 'running') {
      try {
        // Try to get active sessions count
        const sessions = getActiveSessions();
        this.status.activeSessions = sessions.length;
      } catch (error) {
        console.error('Error getting active sessions:', error);
      }
    }
    return this.status;
  }
}

// Removed duplicate code - using the instance created earlier

const mcpServerManager = new MCPServerManager();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// MCP Server IPC handlers
ipcMain.handle('mcp-get-status', async () => {
  try {
    const status = mcpServerManager.getStatus();
    return { success: true, status };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('mcp-start-server', async () => {
  try {
    const status = await mcpServerManager.startServer();
    return { success: true, status };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('mcp-restart-server', async () => {
  try {
    const status = await mcpServerManager.restartServer();
    return { success: true, status };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('mcp-stop-server', async () => {
  try {
    const status = await mcpServerManager.stopServer();
    return { success: true, status };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// TCP Forwarder IPC handlers - Status only (managed by MCP server)
ipcMain.handle('tcp-get-status', async () => {
  try {
    // Since TCP forwarder is managed by MCP server, we return the configured ports
    // The actual forwarder status is handled within the MCP server context
    const configuredPorts = DEFAULT_CONTAINER_PORTS.map(port => ({
      port,
      isRunning: mcpServerManager.getStatus().status === 'running'
    }));

    const areRunning = mcpServerManager.getStatus().status === 'running';

    return {
      success: true,
      status: configuredPorts,
      areRunning
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Sandbox Manager IPC handlers
ipcMain.handle('sandbox-manager-get-status', async () => {
  try {
    const activeSessions = sandboxManagerForMain.getAllSessions();
    const containers = sandboxManagerForMain.getAllContainers();

    return {
      success: true,
      status: {
        activeSessions: activeSessions.length,
        sessions: activeSessions,
        containers: containers.length,
        containerList: containers
      }
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('sandbox-manager-delete-sandbox', async (_, sessionId: string) => {
  try {
    const success = sandboxManagerForMain.endSession(sessionId);
    return { success };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// TCP Forwarder IPC handlers - Direct access to forwarder
ipcMain.handle('tcp-forwarder-get-status', async () => {
  try {
    const areRunning = tcpForwarder.areForwardersRunning();
    const forwarderStatus = DEFAULT_CONTAINER_PORTS.map(port => ({
      port,
      isRunning: areRunning
    }));

    return {
      success: true,
      areRunning,
      status: forwarderStatus
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('tcp-forwarder-start', async () => {
  try {
    await tcpForwarder.startAllForwarders();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('tcp-forwarder-stop', async () => {
  try {
    await tcpForwarder.stopAllForwarders();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Window control IPC handlers
ipcMain.handle('window-minimize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.maximize();
  }
});

ipcMain.handle('window-unmaximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.unmaximize();
  }
});

ipcMain.handle('window-close', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.close();
  }
});

ipcMain.handle('window-is-maximized', () => {
  const win = BrowserWindow.getFocusedWindow();
  return win ? win.isMaximized() : false;
});

// Settings IPC handlers
ipcMain.handle('settings-get', async () => {
  try {
    const settings = settingsManager.getSettings();
    return { success: true, settings };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('settings-update', async (_, updates: any) => {
  try {
    settingsManager.updateSettings(updates);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('settings-reset', async () => {
  try {
    settingsManager.resetToDefaults();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});
