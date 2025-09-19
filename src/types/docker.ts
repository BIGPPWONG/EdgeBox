// Docker container interface
export interface DockerContainer {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  ports: Record<number, number>;
  domain: string;
}

// MCP Server status interface
export interface MCPServerStatus {
  status: 'starting' | 'running' | 'error' | 'stopped';
  port: number;
  activeSessions: number;
  startTime?: Date;
  error?: string;
}

// Global API interfaces
declare global {
  interface Window {
    dockerAPI: {
      pingDocker: () => Promise<{ success: boolean; isRunning?: boolean; error?: string }>;
      startContainer: (name: string, image: string) => Promise<{ success: boolean; container?: DockerContainer; error?: string }>;
      stopContainer: (name: string) => Promise<{ success: boolean; error?: string }>;
      getContainers: () => Promise<{ success: boolean; containers?: DockerContainer[]; error?: string }>;
      checkImage: (imageName: string) => Promise<{ success: boolean; hasImage?: boolean; error?: string }>;
    };
    settingsAPI: {
      getSettings: () => Promise<{ success: boolean; settings?: any; error?: string }>;
      updateSettings: (updates: any) => Promise<{ success: boolean; error?: string }>;
      resetToDefaults: () => Promise<{ success: boolean; error?: string }>;
    };
    mcpAPI: {
      getStatus: () => Promise<{ success: boolean; status?: MCPServerStatus; error?: string }>;
      startServer: () => Promise<{ success: boolean; status?: MCPServerStatus; error?: string }>;
      restartServer: () => Promise<{ success: boolean; status?: MCPServerStatus; error?: string }>;
    };
    tcpAPI: {
      getStatus: () => Promise<{ success: boolean; status?: { port: number; isRunning: boolean }[]; areRunning?: boolean; error?: string }>;
    };
    sandboxManagerAPI: {
      getStatus: () => Promise<{ success: boolean; status?: { activeSessions: number; sessions: any[]; containers: number; containerList: DockerContainer[] }; error?: string }>;
      deleteSandbox: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
      startVNC: (containerName: string, options?: { viewOnly?: boolean }) => Promise<{ success: boolean; result?: { isRunning: boolean; streamUrl: string; windowId: string }; error?: string }>;
      stopVNC: (containerName: string) => Promise<{ success: boolean; error?: string }>;
      getVNCStatus: (containerName: string) => Promise<{ success: boolean; result?: { isRunning: boolean; streamUrl?: string }; error?: string }>;
    };
    tcpForwarderAPI: {
      getStatus: () => Promise<{ success: boolean; areRunning?: boolean; status?: { port: number; isRunning: boolean }[]; error?: string }>;
      start: () => Promise<{ success: boolean; error?: string }>;
      stop: () => Promise<{ success: boolean; error?: string }>;
    };
    DEBUG_MODE_ENABLED: boolean;
  }
}