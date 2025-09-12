export interface SandboxPortConfig {
  containerPort: number;
  hostPort?: number;
  name: string;
  description?: string;
}

export interface SandboxConfig {
  id: string;
  name: string;
  dockerImage: string;
  status: 'stopped' | 'starting' | 'running' | 'error';
  createdAt: Date;
  lastUsed: Date;
  timeout: number; // minutes
  ports: SandboxPortConfig[]; // Multiple ports that sandbox exposes
}

export interface SandboxSession {
  sessionId: string;
  sandboxId: string;
  createdAt: Date;
  lastActivity: Date;
  clientInfo?: string;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  port: number;
  status: 'stopped' | 'starting' | 'running' | 'error';
  maxSessions: number;
  sessionTimeout: number; // minutes
  activeSessions: number;
}

export interface SandboxStats {
  id: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
  activeConnections: number;
}