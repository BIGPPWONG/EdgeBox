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
    };
    mcpAPI: {
      getStatus: () => Promise<{ success: boolean; status?: MCPServerStatus; error?: string }>;
      startServer: () => Promise<{ success: boolean; status?: MCPServerStatus; error?: string }>;
      restartServer: () => Promise<{ success: boolean; status?: MCPServerStatus; error?: string }>;
    };
    tcpAPI: {
      startForwarders: () => Promise<{ success: boolean; error?: string }>;
      stopForwarders: () => Promise<{ success: boolean; error?: string }>;
      getStatus: () => Promise<{ success: boolean; status?: { port: number; isRunning: boolean }[]; areRunning?: boolean; error?: string }>;
      getSessionDomain: (sessionId: string, port?: number) => Promise<{ success: boolean; domain?: string; error?: string }>;
    };
  }
}