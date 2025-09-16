import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { spawn, ChildProcess } from 'child_process';
import { DEFAULT_CONTAINER_PORTS } from './constants/ports';
import { SandboxManager } from './services/sandbox-manager';
import { DockerManager } from './services/docker-manager';
import mcpServer, { getActiveSessions } from './services/mcp/server';
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
    try {
      this.status.status = 'starting';
      console.log('Starting MCP Server...');

      // Start the MCP server with configuration
      await mcpServer.start({
        transportType: "httpStream",
        httpStream: {
          port: 8888,
        },
      });

      this.status = {
        status: 'running',
        port: 8888,
        activeSessions: 0,
        startTime: new Date(),
      };

      console.log('MCP Server started successfully on port 8888');
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

      // Start the server with fresh configuration
      await mcpServer.start({
        transportType: "httpStream",
        httpStream: {
          port: 8888,
        },
      });

      this.status = {
        status: 'running',
        port: 8888,
        activeSessions: 0,
        startTime: new Date(),
      };

      console.log('MCP Server restarted successfully on port 8888');
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

// // TCP Forwarder IPC handlers
// ipcMain.handle('tcp-start-forwarders', async () => {
//   try {
//     await tcpForwarder.startAllForwarders();
//     return { success: true };
//   } catch (error) {
//     return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
//   }
// });

// ipcMain.handle('tcp-stop-forwarders', async () => {
//   try {
//     await tcpForwarder.stopAllForwarders();
//     return { success: true };
//   } catch (error) {
//     return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
//   }
// });

// ipcMain.handle('tcp-get-status', async () => {
//   try {
//     const status = tcpForwarder.getForwarderStatus();
//     const areRunning = tcpForwarder.areForwardersRunning();
//     return { success: true, status, areRunning };
//   } catch (error) {
//     return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
//   }
// });

// ipcMain.handle('tcp-get-session-domain', async (_, sessionId: string, port?: number) => {
//   try {
//     const domain = tcpForwarder.getSessionDomain(sessionId, port);
//     return { success: true, domain };
//   } catch (error) {
//     return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
//   }
// });
