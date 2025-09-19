import { DockerContainer, MCPServerStatus } from './docker';

// 全局Window接口定义
declare global {
  interface Window {
    // Docker API
    dockerAPI: {
      pingDocker: () => Promise<{ success: boolean; isRunning?: boolean; error?: string }>;
      startContainer: (name: string, image: string) => Promise<{ success: boolean; container?: DockerContainer; error?: string }>;
      stopContainer: (name: string) => Promise<{ success: boolean; error?: string }>;
      getContainers: () => Promise<{ success: boolean; containers?: DockerContainer[]; error?: string }>;
      checkImage: (imageName: string) => Promise<{ success: boolean; hasImage?: boolean; error?: string }>;
      loadBundledImage: () => Promise<{ success: boolean; error?: string }>;
    };

    // Settings API
    settingsAPI: {
      getSettings: () => Promise<{ success: boolean; settings?: any; error?: string }>;
      updateSettings: (updates: any) => Promise<{ success: boolean; error?: string }>;
      resetToDefaults: () => Promise<{ success: boolean; error?: string }>;
    };

    // MCP API
    mcpAPI: {
      getStatus: () => Promise<{ success: boolean; status?: MCPServerStatus; error?: string }>;
      startServer: () => Promise<{ success: boolean; status?: MCPServerStatus; error?: string }>;
      restartServer: () => Promise<{ success: boolean; status?: MCPServerStatus; error?: string }>;
    };

    // TCP API
    tcpAPI: {
      getStatus: () => Promise<{ success: boolean; status?: { port: number; isRunning: boolean }[]; areRunning?: boolean; error?: string }>;
    };

    // Sandbox Manager API
    sandboxManagerAPI: {
      getStatus: () => Promise<{ success: boolean; status?: { activeSessions: number; sessions: any[]; containers: number; containerList: DockerContainer[] }; error?: string }>;
      deleteSandbox: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
      startVNC: (containerName: string, options?: { viewOnly?: boolean }) => Promise<{ success: boolean; result?: { isRunning: boolean; streamUrl: string; windowId: string }; error?: string }>;
      stopVNC: (containerName: string) => Promise<{ success: boolean; error?: string }>;
      getVNCStatus: (containerName: string) => Promise<{ success: boolean; result?: { isRunning: boolean; streamUrl?: string }; error?: string }>;
    };

    // TCP Forwarder API
    tcpForwarderAPI: {
      getStatus: () => Promise<{ success: boolean; areRunning?: boolean; status?: { port: number; isRunning: boolean }[]; error?: string }>;
      start: () => Promise<{ success: boolean; error?: string }>;
      stop: () => Promise<{ success: boolean; error?: string }>;
    };

    // Electron API (窗口控制和子窗口创建)
    electronAPI: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      unmaximize: () => Promise<void>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      createChildWindow: (options: {
        route: string;
        title?: string;
        width?: number;
        height?: number;
      }) => Promise<{ success: boolean; windowId?: number; error?: string }>;
    };

    // Debug mode flag
    DEBUG_MODE_ENABLED: boolean;
  }
}

export {};