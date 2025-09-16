import { spawn, ChildProcess } from 'child_process';
import { SandboxConfig } from '../types/sandbox';
import { DockerContainer } from '../types/docker';
import { DEFAULT_CONTAINER_PORTS } from '../constants/ports';

export class DockerManager {
  private containers: Map<string, DockerContainer & { process?: ChildProcess }> = new Map();
  private portCounter = 49999;

  private getNextPort(): number {
    return ++this.portCounter;
  }

  async pingDocker(): Promise<boolean> {
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

  async startContainer(config: SandboxConfig): Promise<DockerContainer> {
    const ports: Record<number, number> = {};
    const portMappings: string[] = [];

    // Map each default port to a unique host port
    for (const containerPort of DEFAULT_CONTAINER_PORTS) {
      const hostPort = this.getNextPort();
      ports[containerPort] = hostPort;
      portMappings.push('-p', `${hostPort}:${containerPort}`);
    }

    const domain = `http://localhost:${ports[49999]}`; // Main port

    const container: DockerContainer & { process?: ChildProcess } = {
      id: config.id,
      name: config.id,
      status: 'starting',
      ports,
      domain
    };

    this.containers.set(config.id, container);

    return new Promise((resolve, reject) => {
      const dockerProcess = spawn('docker', [
        'run', '--rm', '--name', config.id,
        ...portMappings,
        config.dockerImage
      ]);

      container.process = dockerProcess;

      let stderr = '';
      let hasResolved = false;

      // dockerProcess.stdout?.on('data', (data) => {
      //   console.log(`Container ${config.id} stdout:`, data.toString());
      // });

      // dockerProcess.stderr?.on('data', (data) => {
      //   const errorMsg = data.toString();
      //   stderr += errorMsg;
      //   console.error(`Container ${config.id} stderr:`, errorMsg);
      // });

      dockerProcess.on('close', (code) => {
        console.log(`Container ${config.id} exited with code ${code}`);
        container.status = code === 0 ? 'stopped' : 'error';
        this.containers.delete(config.id);

        if (!hasResolved) {
          hasResolved = true;
          if (code !== 0) {
            reject(new Error(`Container failed with exit code ${code}. Error: ${stderr}`));
          } else {
            reject(new Error('Container stopped unexpectedly'));
          }
        }
      });

      dockerProcess.on('error', (error) => {
        console.error(`Container ${config.id} spawn error:`, error);
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
          this.containers.set(config.id, container);

          // Return safe container object without process
          const safeContainer: DockerContainer = {
            id: container.id,
            name: container.name,
            status: container.status,
            ports: JSON.parse(JSON.stringify(container.ports)),
            domain: container.domain
          };
          resolve(safeContainer);
        }
      }, 6000);
    });
  }

  async stopContainer(containerId: string): Promise<boolean> {
    const container = this.containers.get(containerId);
    if (!container) return false;

    return new Promise((resolve) => {
      if (container.process) {
        container.process.kill('SIGKILL');
      }

      // Force kill container via docker command
      const killProcess = spawn('docker', ['kill', containerId]);
      killProcess.on('close', () => {
        container.status = 'stopped';
        this.containers.delete(containerId);
        resolve(true);
      });
      killProcess.on('error', () => resolve(false));
    });
  }

  getContainer(containerId: string): DockerContainer | null {
    const container = this.containers.get(containerId);
    if (!container) return null;

    return {
      id: container.id,
      name: container.name,
      status: container.status,
      ports: JSON.parse(JSON.stringify(container.ports)),
      domain: container.domain
    };
  }

  getAllContainers(): DockerContainer[] {
    return Array.from(this.containers.values()).map(container => ({
      id: container.id,
      name: container.name,
      status: container.status,
      ports: JSON.parse(JSON.stringify(container.ports)),
      domain: container.domain
    }));
  }

  async refreshContainers(): Promise<void> {
    // For direct Docker manager, we could potentially query docker ps
    // But for now, we rely on our internal state
    console.log('Refresh containers called - using internal state');
  }

  async cleanup(): Promise<void> {
    const containerIds = Array.from(this.containers.keys());

    for (const containerId of containerIds) {
      try {
        await this.stopContainer(containerId);
      } catch (error) {
        console.error(`Failed to stop container ${containerId}:`, error);
      }
    }

    this.containers.clear();
  }

  // Additional utility methods for direct use
  async listRunningContainers(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const dockerProcess = spawn('docker', ['ps', '--format', '{{.Names}}']);
      let stdout = '';

      dockerProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      dockerProcess.on('close', (code) => {
        if (code === 0) {
          const containers = stdout.trim().split('\n').filter(name => name.length > 0);
          resolve(containers);
        } else {
          reject(new Error(`Docker ps failed with exit code ${code}`));
        }
      });

      dockerProcess.on('error', (error) => {
        reject(new Error(`Failed to list containers: ${error.message}`));
      });
    });
  }

  async removeContainer(containerId: string, force: boolean = false): Promise<boolean> {
    const args = ['rm'];
    if (force) args.push('-f');
    args.push(containerId);

    return new Promise((resolve) => {
      const removeProcess = spawn('docker', args);
      removeProcess.on('close', (code) => {
        resolve(code === 0);
      });
      removeProcess.on('error', () => resolve(false));
    });
  }

  async pullImage(image: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const pullProcess = spawn('docker', ['pull', image]);

      pullProcess.stdout?.on('data', (data) => {
        console.log(`Docker pull ${image}:`, data.toString());
      });

      pullProcess.stderr?.on('data', (data) => {
        console.error(`Docker pull ${image} error:`, data.toString());
      });

      pullProcess.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`Failed to pull image ${image}: exit code ${code}`));
        }
      });

      pullProcess.on('error', (error) => {
        reject(new Error(`Failed to pull image ${image}: ${error.message}`));
      });
    });
  }
}