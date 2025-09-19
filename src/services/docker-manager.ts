import Docker from 'dockerode';
import { SandboxConfig } from '../types/sandbox';
import { DockerContainer } from '../types/docker';
import { DEFAULT_CONTAINER_PORTS } from '../constants/ports';
import { getDockerImagePath } from '../utils/paths';

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
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();

      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 3000);

      socket.connect(port, 'localhost', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
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

      // Create and start container
      const dockerContainer = await this.docker.createContainer({
        Image: config.dockerImage,
        name: config.id,
        HostConfig: {
          PortBindings: portBindings,
          AutoRemove: true
        },
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
      const isReady = await this.waitForContainerReady(ports[49983], 30000);

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