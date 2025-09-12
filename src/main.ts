import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { spawn, ChildProcess } from 'child_process';

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
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Docker functionality in main process
interface DockerContainer {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  ports: Record<number, number>; // container port -> host port mapping
  domain: string;
  process?: ChildProcess;
}

class MainDockerManager {
  private containers: Map<string, DockerContainer> = new Map();
  private portCounter = 49999;

  private getNextPort(): number {
    return ++this.portCounter;
  }

  async startContainer(containerName: string, image: string): Promise<Omit<DockerContainer, 'process'>> {
    // Default ports to map for E2B sandboxes
    const defaultPorts = [49999, 8888, 3000, 5000, 8080];
    const ports: Record<number, number> = {};
    const portMappings: string[] = [];
    
    // Map each default port to a unique host port
    for (const containerPort of defaultPorts) {
      const hostPort = this.getNextPort();
      ports[containerPort] = hostPort;
      portMappings.push('-p', `${hostPort}:${containerPort}`);
    }
    
    const domain = `http://localhost:${ports[49999]}`; // Main port
    
    const container: DockerContainer = {
      id: containerName,
      name: containerName,
      status: 'starting',
      ports,
      domain
    };

    this.containers.set(containerName, container);

    return new Promise((resolve, reject) => {
      const dockerProcess = spawn('docker', [
        'run', '--rm', '--name', containerName,
        ...portMappings,
        image
      ]);

      container.process = dockerProcess;
      
      let stderr = '';
      let hasResolved = false;

      dockerProcess.stdout?.on('data', (data) => {
        console.log(`Container ${containerName} stdout:`, data.toString());
      });

      dockerProcess.stderr?.on('data', (data) => {
        const errorMsg = data.toString();
        stderr += errorMsg;
        console.error(`Container ${containerName} stderr:`, errorMsg);
      });

      dockerProcess.on('close', (code) => {
        console.log(`Container ${containerName} exited with code ${code}`);
        container.status = code === 0 ? 'stopped' : 'error';
        this.containers.delete(containerName);
        
        if (!hasResolved) {
          hasResolved = true;
          if (code !== 0) {
            reject(new Error(`Container failed with exit code ${code}. Error: ${stderr}`));
          } else {
            // Container stopped normally (shouldn't happen immediately)
            reject(new Error('Container stopped unexpectedly'));
          }
        }
      });

      dockerProcess.on('error', (error) => {
        console.error(`Container ${containerName} spawn error:`, error);
        container.status = 'error';
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error(`Failed to start container: ${error.message}`));
        }
      });

      // Wait a bit then mark as running if no errors occurred
      setTimeout(() => {
        if (!hasResolved && container.status === 'starting') {
          hasResolved = true;
          container.status = 'running';
          this.containers.set(containerName, container);
          // Return safe container object without process
          const safeContainer = {
            id: container.id,
            name: container.name,
            status: container.status,
            ports: JSON.parse(JSON.stringify(container.ports)), // Ensure serializable
            domain: container.domain
          };
          resolve(safeContainer);
        }
      }, 2000);
    });
  }

  async stopContainer(containerName: string): Promise<boolean> {
    const container = this.containers.get(containerName);
    if (!container) return false;

    return new Promise((resolve) => {
      if (container.process) {
        container.process.kill('SIGTERM');
      }

      // Also try to stop via docker command
      const stopProcess = spawn('docker', ['stop', containerName]);
      stopProcess.on('close', () => {
        container.status = 'stopped';
        this.containers.delete(containerName);
        resolve(true);
      });
      stopProcess.on('error', () => resolve(false));
    });
  }

  getContainers(): Omit<DockerContainer, 'process'>[] {
    return Array.from(this.containers.values()).map(container => ({
      id: container.id,
      name: container.name,
      status: container.status,
      ports: JSON.parse(JSON.stringify(container.ports)), // Ensure serializable
      domain: container.domain
    }));
  }
}

const dockerManager = new MainDockerManager();

async function pingDocker(): Promise<boolean> {
  return new Promise((resolve) => {
    const dockerProcess = spawn('docker', ['info']);
    
    dockerProcess.on('close', (code) => {
      resolve(code === 0);
    });
    
    dockerProcess.on('error', () => {
      resolve(false);
    });
  });
}

// IPC handlers
ipcMain.handle('ping-docker', async () => {
  try {
    const isRunning = await pingDocker();
    return { success: true, isRunning };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('start-container', async (_, containerName: string, image: string) => {
  try {
    const container = await dockerManager.startContainer(containerName, image);
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
    const containers = dockerManager.getContainers();
    return { success: true, containers };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});
