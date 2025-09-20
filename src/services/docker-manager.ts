import Docker from 'dockerode';
import { SandboxConfig } from '../types/sandbox';
import { DockerContainer } from '../types/docker';
import { DEFAULT_CONTAINER_PORTS } from '../constants/ports';
import { getDockerImagePath } from '../utils/paths';
import { HostConfig } from 'dockerode';

export class DockerManager {
  private docker: Docker;
  private containers: Map<string, DockerContainer> = new Map();
  private portCounter = 49999;

  constructor() {
    this.docker = new Docker();
  }

  private getNextPort(): number {
    return ++this.portCounter;
  }

  private async waitForContainerReady(port: number, timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 1000; // 每秒检查一次

    while (Date.now() - startTime < timeoutMs) {
      try {
        const isReady = await this.checkPortConnectivity(port);
        if (isReady) {
          return true;
        }
      } catch (error) {
        // 忽略连接错误，继续重试
      }

      // 等待一段时间再重试
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    return false;
  }

  private async checkPortConnectivity(port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${port}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': '*/*',
          'accept-language': '*',
          'sec-fetch-mode': 'cors',
          'user-agent': 'node',
          'accept-encoding': 'gzip, deflate',
          'connection': 'keep-alive'
        },
        body: JSON.stringify({
          code: "print('hello world')",
          language: "python",
          env_vars: {
            "x-session-id": "default_session"
          }
        }),
        signal: AbortSignal.timeout(3000)
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async pingDocker(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      console.error('Docker ping failed:', error);
      return false;
    }
  }

  async startContainer(config: SandboxConfig): Promise<DockerContainer> {
    try {
      const ports: Record<number, number> = {};
      const portBindings: Record<string, Array<{ HostPort: string }>> = {};

      // Map each default port to a unique host port
      for (const containerPort of DEFAULT_CONTAINER_PORTS) {
        const hostPort = this.getNextPort();
        ports[containerPort] = hostPort;
        portBindings[`${containerPort}/tcp`] = [{ HostPort: hostPort.toString() }];
      }

      const domain = `http://localhost:${ports[49999]}`; // Main port

      // Build HostConfig with resource limits
      const hostConfig: HostConfig = {
        PortBindings: portBindings,
        AutoRemove: true
      };

      // Apply resource limits if provided
      if (config.resources) {
        // Memory limit in bytes
        const memoryBytes = config.resources.memoryGB * 1024 * 1024 * 1024;
        hostConfig.Memory = memoryBytes;
        hostConfig.MemorySwap = memoryBytes; // Set same as memory to disable swap

        // CPU limits (convert cores to quota/period)
        // Use 50ms period (20000 is 20ms period, 100000 is 100ms period)
        const cpuPeriod = 100000; // 100ms period
        const cpuQuota = config.resources.cpuCores * cpuPeriod; // X cores * period
        hostConfig.CpuQuota = cpuQuota;
        hostConfig.CpuPeriod = cpuPeriod;

        console.log(`Container ${config.id} resource limits: CPU=${config.resources.cpuCores} cores, Memory=${config.resources.memoryGB}GB`);
      }

      // Create and start container
      const dockerContainer = await this.docker.createContainer({
        Image: config.dockerImage,
        name: config.id,
        HostConfig: hostConfig,
        ExposedPorts: Object.fromEntries(
          DEFAULT_CONTAINER_PORTS.map(port => [`${port}/tcp`, {}])
        )
      });

      await dockerContainer.start();

      const container: DockerContainer = {
        id: config.id,
        name: config.id,
        status: 'starting',
        ports,
        domain
      };

      this.containers.set(config.id, container);

      // 探测 49999 端口确认容器启动成功
      const isReady = await this.waitForContainerReady(ports[49999], 30000);

      if (isReady) {
        container.status = 'running';
        console.log(`Container ${config.id} started successfully and is ready`);
      } else {
        container.status = 'error';
        throw new Error(`Container ${config.id} started but port ${ports[49983]} is not responding`);
      }

      return container;

    } catch (error) {
      console.error(`Failed to start container ${config.id}:`, error);
      throw new Error(`Failed to start container: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stopContainer(containerId: string): Promise<boolean> {
    try {
      const dockerContainer = this.docker.getContainer(containerId);
      await dockerContainer.stop();

      // Update our internal state
      const container = this.containers.get(containerId);
      if (container) {
        container.status = 'stopped';
        this.containers.delete(containerId);
      }

      console.log(`Container ${containerId} stopped successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to stop container ${containerId}:`, error);
      return false;
    }
  }

  getContainer(containerId: string): DockerContainer | null {
    return this.containers.get(containerId) || null;
  }

  getAllContainers(): DockerContainer[] {
    return Array.from(this.containers.values());
  }

  async refreshContainers(): Promise<void> {
    try {
      const dockerContainers = await this.docker.listContainers({ all: true });

      // Update status for our tracked containers
      for (const [id, container] of this.containers) {
        const dockerContainer = dockerContainers.find(dc => dc.Names.includes(`/${id}`));
        if (dockerContainer) {
          container.status = dockerContainer.State === 'running' ? 'running' : 'stopped';
        } else {
          // Container not found in Docker, mark as stopped
          container.status = 'stopped';
        }
      }
    } catch (error) {
      console.error('Failed to refresh containers:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Get all running containers from Docker
      const runningContainers = await this.docker.listContainers();

      // Filter only containers created by this project (starting with "container_")
      const projectContainers = runningContainers.filter(container => {
        const containerName = container.Names[0].replace('/', '');
        return containerName.startsWith('container_');
      });

      console.log(`Cleaning up ${projectContainers.length} containers...`);

      // Stop project containers
      for (const container of projectContainers) {
        try {
          const containerName = container.Names[0].replace('/', '');
          const dockerContainer = this.docker.getContainer(containerName);
          await dockerContainer.stop();
          console.log(`Stopped container: ${containerName}`);
        } catch (error) {
          console.error(`Failed to stop container ${container.Names[0]}:`, error);
        }
      }

      // Also clean up our internal tracking
      this.containers.clear();
    } catch (error) {
      console.error('Failed to cleanup containers:', error);
    }
  }

  // Additional utility methods for direct use
  async listRunningContainers(): Promise<string[]> {
    try {
      const containers = await this.docker.listContainers();
      return containers.map(container => container.Names[0].replace('/', ''));
    } catch (error) {
      console.error('Failed to list containers:', error);
      throw new Error(`Failed to list containers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async removeContainer(containerId: string, force: boolean = false): Promise<boolean> {
    try {
      const dockerContainer = this.docker.getContainer(containerId);
      await dockerContainer.remove({ force });
      return true;
    } catch (error) {
      console.error(`Failed to remove container ${containerId}:`, error);
      return false;
    }
  }

  async pullImage(image: string): Promise<boolean> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.docker.pull(image, (err: any, stream: any) => {
          if (err) {
            reject(err);
            return;
          }

          this.docker.modem.followProgress(stream, (err: any) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }, (event: any) => {
            console.log(`Docker pull ${image}:`, event.status);
          });
        });
      });
      return true;
    } catch (error) {
      console.error(`Failed to pull image ${image}:`, error);
      throw new Error(`Failed to pull image ${image}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async hasImage(imageName: string): Promise<boolean> {
    try {
      const image = this.docker.getImage(imageName);
      await image.inspect();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Load Docker image from tar.gz file
  async loadImageFromFile(imagePath: string): Promise<boolean> {
    try {
      const fs = await import('fs');
      const stream = fs.createReadStream(imagePath);
      await this.docker.loadImage(stream);
      console.log(`Successfully loaded image from ${imagePath}`);
      return true;
    } catch (error) {
      console.error(`Failed to load image from ${imagePath}:`, error);
      return false;
    }
  }

  // Load the bundled e2b sandbox image
  async loadBundledSandboxImage(): Promise<boolean> {
    try {
      const imagePath = getDockerImagePath('e2b-sandbox-latest.tar.gz');
      return await this.loadImageFromFile(imagePath);
    } catch (error) {
      console.error('Failed to load bundled sandbox image:', error);
      return false;
    }
  }
}