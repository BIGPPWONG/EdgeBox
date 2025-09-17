import { SandboxConfig, SandboxSession, SandboxPortConfig } from '../types/sandbox';
import { DockerContainer } from '../types/docker';
import { DEFAULT_CONTAINER_PORTS, PORT_DESCRIPTIONS } from '../constants/ports';
import { IPCDockerManager } from './ipc-docker-manager';


// Interface for Docker operations
interface IDockerManager {
  startContainer(config: SandboxConfig): Promise<DockerContainer>;
  stopContainer(containerId: string): Promise<boolean>;
  getContainer(containerId: string): DockerContainer | null;
  getAllContainers(): DockerContainer[];
  refreshContainers(): Promise<void>;
  cleanup(): Promise<void>;
}

export class SandboxManager {
  private dockerManager: IDockerManager;
  private configs: Map<string, SandboxConfig> = new Map();
  private sessions: Map<string, SandboxSession> = new Map();
  private sessionToSandbox: Map<string, string> = new Map();
  private timeoutHandles: Map<string, NodeJS.Timeout> = new Map();
  private settingsManager: any = null;

  constructor(dockerManager?: IDockerManager, settingsManager?: any) {
    // Use provided docker manager or create default one
    console.log('Initializing SandboxManager with:', dockerManager ? 'custom DockerManager' : 'default DockerManager');
    this.dockerManager = dockerManager || this.createDefaultDockerManager();
    this.settingsManager = settingsManager;
  }

  setSettingsManager(settingsManager: any): void {
    this.settingsManager = settingsManager;
  }

  private getDefaultImage(): string {
    const settings = this.settingsManager?.getSettings();
    return settings?.defaultDockerImage || 'e2b-sandbox:latest';
  }

  private createDefaultDockerManager(): IDockerManager {
    // This will only work in renderer process
    return new IPCDockerManager();
  }

  // Default port configuration for E2B sandboxes
  private defaultPorts: SandboxPortConfig[] = DEFAULT_CONTAINER_PORTS.map(port => {
    const portNames: Record<number, string> = {
      49999: 'main',
      8888: 'jupyter',
      3000: 'web',
      5000: 'api',
      8080: 'http'
    };

    return {
      containerPort: port,
      name: portNames[port] || 'unknown',
      description: PORT_DESCRIPTIONS[port as keyof typeof PORT_DESCRIPTIONS] || 'Unknown port'
    };
  });

  async createSandboxForSession(sessionId: string): Promise<string> {
    // Get default image from settings if available
    const defaultImage = this.getDefaultImage();

    // Create a sandbox config for this session
    const config = await this.createSandbox(
      `Session_Sandbox_${sessionId.slice(-8)}`,
      defaultImage,
      30, // 30 minute timeout
      this.defaultPorts
    );

    // Start the sandbox immediately
    await this.startSandbox(config.id);

    // Create session mapping
    const session: SandboxSession = {
      sessionId,
      sandboxId: config.id,
      createdAt: new Date(),
      lastActivity: new Date(),
      clientInfo: `MCP Session ${sessionId}`,
    };

    this.sessions.set(sessionId, session);
    this.sessionToSandbox.set(sessionId, config.id);

    return config.id;
  }

  async getSandboxForSession(sessionId: string): Promise<DockerContainer | null> {
    const sandboxId = this.sessionToSandbox.get(sessionId);
    if (!sandboxId) return null;

    // Update session activity
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
    }

    // Update sandbox last used time
    const config = this.configs.get(sandboxId);
    if (config) {
      config.lastUsed = new Date();
      this.configs.set(sandboxId, config);
    }

    // Reset timeout
    this.scheduleTimeout(sandboxId);

    return this.dockerManager.getContainer(sandboxId);
  }

  getContainerForSession(sessionId: string): DockerContainer | null {
    const sandboxId = this.sessionToSandbox.get(sessionId);
    if (!sandboxId) return null;

    return this.dockerManager.getContainer(sandboxId);
  }

  async createSandbox(
    name: string,
    dockerImage: string,
    timeout: number = 30,
    ports: SandboxPortConfig[] = this.defaultPorts
  ): Promise<SandboxConfig> {
    const id = `container_${name}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const config: SandboxConfig = {
      id,
      name,
      dockerImage,
      status: 'stopped',
      createdAt: new Date(),
      lastUsed: new Date(),
      timeout,
      ports,
    };

    this.configs.set(id, config);
    return config;
  }

  async startSandbox(id: string): Promise<boolean> {
    const config = this.configs.get(id);
    if (!config) throw new Error(`Sandbox ${id} not found`);

    try {
      config.status = 'starting';
      this.configs.set(id, { ...config });

      await this.dockerManager.startContainer(config);

      config.status = 'running';
      config.lastUsed = new Date();
      this.configs.set(id, { ...config });

      // Set up timeout for sandbox cleanup
      this.scheduleTimeout(id);

      return true;
    } catch (error) {
      config.status = 'error';
      this.configs.set(id, { ...config });
      throw error;
    }
  }

  async stopSandbox(id: string): Promise<boolean> {
    const config = this.configs.get(id);

    await this.dockerManager.stopContainer(id);

    if (config) {
      config.status = 'stopped';
      this.configs.set(id, { ...config });
    }

    // Clear timeout
    this.clearTimeout(id);

    // Clean up sessions
    this.cleanupSandboxSessions(id);

    return true;
  }

  async deleteSandbox(id: string): Promise<boolean> {
    await this.stopSandbox(id);
    this.configs.delete(id);
    return true;
  }

  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.sessions.delete(sessionId);
    this.sessionToSandbox.delete(sessionId);

    // Check if sandbox should be stopped (no active sessions)
    const activeSessions = Array.from(this.sessions.values())
      .filter(s => s.sandboxId === session.sandboxId);

    if (activeSessions.length === 0) {
      // Schedule sandbox shutdown after grace period
      setTimeout(() => {
        const stillActive = Array.from(this.sessions.values())
          .some(s => s.sandboxId === session.sandboxId);
        if (!stillActive) {
          this.stopSandbox(session.sandboxId);
        }
      }, 3000); // 3 second grace period
    }
  }

  // Timeout management
  private scheduleTimeout(sandboxId: string): void {
    this.clearTimeout(sandboxId);

    const config = this.configs.get(sandboxId);
    if (!config) return;

    const timeoutMs = config.timeout * 60 * 1000; // Convert minutes to milliseconds

    const handle = setTimeout(() => {
      const activeSessions = Array.from(this.sessions.values())
        .filter(s => s.sandboxId === sandboxId);

      if (activeSessions.length === 0) {
        console.log(`Stopping sandbox ${sandboxId} due to timeout`);
        this.stopSandbox(sandboxId);
      } else {
        // Reschedule if there are active sessions
        this.scheduleTimeout(sandboxId);
      }
    }, timeoutMs);

    this.timeoutHandles.set(sandboxId, handle);
  }

  private clearTimeout(sandboxId: string): void {
    const handle = this.timeoutHandles.get(sandboxId);
    if (handle) {
      clearTimeout(handle);
      this.timeoutHandles.delete(sandboxId);
    }
  }

  private cleanupSandboxSessions(sandboxId: string): void {
    const sessionsToDelete = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.sandboxId === sandboxId)
      .map(([sessionId]) => sessionId);

    sessionsToDelete.forEach(sessionId => {
      this.sessions.delete(sessionId);
      this.sessionToSandbox.delete(sessionId);
    });
  }

  // Getters
  getAllSandboxes(): SandboxConfig[] {
    return Array.from(this.configs.values());
  }

  getSandboxConfig(id: string): SandboxConfig | undefined {
    return this.configs.get(id);
  }

  getAllSessions(): SandboxSession[] {
    return Array.from(this.sessions.values());
  }

  getAllContainers(): DockerContainer[] {
    return this.dockerManager.getAllContainers();
  }

  async cleanup(): Promise<void> {
    // Stop all containers
    await this.dockerManager.cleanup();

    // Clear all sessions
    this.sessions.clear();
    this.sessionToSandbox.clear();

    // Clear all timeouts
    this.timeoutHandles.forEach(handle => clearTimeout(handle));
    this.timeoutHandles.clear();

    // Update all configs to stopped
    for (const [id, config] of this.configs) {
      config.status = 'stopped';
      this.configs.set(id, config);
    }
  }
}

// Export a default instance for renderer process use
export const sandboxManagerForRender = new SandboxManager();
// export const sandboxManagerForMain = new SandboxManager(new DockerManager());