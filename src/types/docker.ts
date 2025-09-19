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