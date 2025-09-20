export interface AppSettings {
  debugMode: boolean;
  defaultDockerImage: string;
  mcpPort: number;
  enableGUITools: boolean;
  dockerCpuCores: number;
  dockerMemoryGB: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  debugMode: false,
  defaultDockerImage: 'e2b-sandbox:latest',
  mcpPort: 8888,
  enableGUITools: false,
  dockerCpuCores: 1,
  dockerMemoryGB: 1,
};