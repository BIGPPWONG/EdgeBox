import { SandboxConfig } from '../types/sandbox';
import { DockerContainer } from '../types/docker';

export class IPCDockerManager {
  private containers: Map<string, DockerContainer> = new Map();

  async startContainer(config: SandboxConfig): Promise<DockerContainer> {
    try {
      // Use the main process Docker API
      const result = await window.dockerAPI.startContainer(
        config.id,
        config.dockerImage
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to start container');
      }

      if (!result.container) {
        throw new Error('No container data returned');
      }

      const container: DockerContainer = result.container;

      this.containers.set(config.id, container);
      return container;
    } catch (error) {
      throw new Error(`Failed to start container: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stopContainer(containerId: string): Promise<boolean> {
    try {
      const result = await window.dockerAPI.stopContainer(containerId);

      if (result.success) {
        this.containers.delete(containerId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to stop container:', error);
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
      const result = await window.dockerAPI.getContainers();

      if (result.success && result.containers) {
        this.containers.clear();

        result.containers.forEach((container: DockerContainer) => {
          this.containers.set(container.id, container);
        });
      }
    } catch (error) {
      console.error('Failed to refresh containers:', error);
    }
  }

  async cleanup(): Promise<void> {
    // Stop all containers managed by this instance
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
}