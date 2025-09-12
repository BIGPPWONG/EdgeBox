// Docker container interface
export interface DockerContainer {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  ports: Record<number, number>;
  domain: string;
}

// Global dockerAPI interface
declare global {
  interface Window {
    dockerAPI: {
      pingDocker: () => Promise<{ success: boolean; isRunning?: boolean; error?: string }>;
      startContainer: (name: string, image: string) => Promise<{ success: boolean; container?: DockerContainer; error?: string }>;
      stopContainer: (name: string) => Promise<{ success: boolean; error?: string }>;
      getContainers: () => Promise<{ success: boolean; containers?: DockerContainer[]; error?: string }>;
    };
  }
}