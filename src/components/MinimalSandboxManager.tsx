import React, { useState, useEffect, useRef } from 'react';
import { DockerContainer } from '../types/docker';
import { Card } from './ui/card';
import { Monitor, Trash2, Cpu, HardDrive } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';

type SandboxStatusResponse = {
  activeSessions: number;
  sessions: any[];
  containers: number;
  containerList: DockerContainer[];
};


export const MinimalSandboxManager: React.FC = () => {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refreshContainers = async (isManual = false) => {
    if (isManual) {
      setIsLoading(true);
    }
    setRefreshError(null);

    try {
      const result = await (window as any).sandboxManagerAPI.getStatus();
      if (result.success) {
        const status = result.status as SandboxStatusResponse;
        setContainers(status.containerList);
        setLastRefresh(new Date());
      } else {
        const errorMsg = result.error || 'Unknown error';
        console.error('Error getting containers:', errorMsg);
        setRefreshError(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error getting containers:', errorMsg);
      setRefreshError(errorMsg);
    } finally {
      if (isManual) {
        setIsLoading(false);
      }
    }
  };


  useEffect(() => {
    refreshContainers();
    const interval = setInterval(() => refreshContainers(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStopContainer = async (containerName: string) => {
    if (confirm(`Stop container "${containerName}"?`)) {
      // Show loading toast that persists until deletion is complete
      const loadingToastId = toast.loading(`Deleting sandbox "${containerName}"...`);

      try {
        // Find the session for this container and end it
        const result = await (window as any).sandboxManagerAPI.getStatus();
        if (result.success) {
          const status = result.status as SandboxStatusResponse;
          const session = status.sessions.find((s: any) => {
            const container = status.containerList.find((c: DockerContainer) => c.id === s.sandboxId);
            return container?.name === containerName;
          });

          if (session) {
            await (window as any).sandboxManagerAPI.deleteSandbox(session.sessionId);
            await refreshContainers();
            console.log(`Stopped container: ${containerName}`);

            // Dismiss loading toast and show success toast
            toast.dismiss(loadingToastId);
            toast.success(`Sandbox "${containerName}" deleted successfully`);
          } else {
            toast.dismiss(loadingToastId);
            toast.error('Could not find session for this container');
          }
        } else {
          toast.dismiss(loadingToastId);
          toast.error('Failed to get sandbox status');
        }
      } catch (error) {
        console.error('Failed to stop container:', error);
        toast.dismiss(loadingToastId);
        toast.error(`Failed to delete sandbox "${containerName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleOpenVNC = async (containerName: string) => {
    try {
      // 使用IPC创建子窗口
      const result = await window.electronAPI.createChildWindow({
        route: `/vnc/${encodeURIComponent(containerName)}`,
        title: `VNC - ${containerName}`,
        width: 1200,
        height: 800
      });

      if (!result.success) {
        console.error('Failed to create VNC window:', result.error);
        alert(`Failed to open VNC window: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create VNC window:', error);
      alert(`Failed to open VNC window: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Running Sandboxes List */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/50">
        <div className="px-6 py-4 border-b border-slate-200/60 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-1">
              Running Sandboxes ({containers.length})
            </h2>
            {lastRefresh && (
              <div className="text-sm text-slate-500">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {refreshError && (
              <div className="text-xs text-red-600 px-3 py-2 bg-red-50/80 backdrop-blur-sm rounded-lg border border-red-200/50">
                {refreshError}
              </div>
            )}
            <Button
              onClick={() => refreshContainers(true)}
              disabled={isLoading}
              variant="default"
              size="sm"
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <span>↻</span>
                  Refreshing...
                </>
              ) : (
                <>
                  <span>↻</span>
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        {containers.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-slate-400 text-lg font-medium">No running sandboxes</div>
            <div className="text-slate-500 text-sm mt-2">Create a new sandbox to get started</div>
          </div>
        ) : (
          <div>
            {containers.map((container) => (
              <div key={container.id} className="p-6 border-b border-slate-200/40 last:border-b-0 flex items-center justify-between hover:bg-slate-50/50 transition-all duration-100">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-semibold text-slate-900 text-lg">
                      {container.name}
                    </div>
                    <span className={`
                      px-3 py-1 text-xs font-medium rounded-full backdrop-blur-sm
                      ${container.status === 'running'
                        ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/50'
                        : container.status === 'starting'
                          ? 'bg-amber-100/80 text-amber-700 border border-amber-200/50'
                          : 'bg-slate-100/80 text-slate-600 border border-slate-200/50'
                      }
                    `}>
                      {container.status}
                    </span>
                  </div>
                  <div className="text-slate-600 mb-1">
                    <span className="font-medium">Domain:</span> {container.domain}
                  </div>
                  <div className="text-sm text-slate-500">
                    <span className="font-medium">Ports:</span> {Object.entries(container.ports).map(([containerPort, hostPort]) =>
                      `${containerPort}→${hostPort}`
                    ).join(', ')}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* VNC Button */}
                  {container.status === 'running' && (
                    <Button
                      onClick={() => handleOpenVNC(container.name)}
                      variant="default"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                    >
                      VNC
                    </Button>
                  )}

                  <Button
                    onClick={() => handleStopContainer(container.name)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 size={16} className="text-white" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const SandboxCountCard: React.FC = () => {
  const [runningCount, setRunningCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refreshCount = async () => {
    setIsLoading(true);
    try {
      const result = await (window as any).sandboxManagerAPI.getStatus();
      if (result.success) {
        const status = result.status as SandboxStatusResponse;
        const runningContainers = status.containerList.filter(
          container => container.status === 'running'
        );
        setRunningCount(runningContainers.length);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error getting sandbox count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-4 h-full bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Monitor size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Active Sandboxes</h3>
            <p className="text-slate-600 text-xs">Running Containers</p>
          </div>
        </div>
        <Badge className="bg-green-500 text-white text-xs">Live</Badge>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-5xl font-bold text-slate-800 mb-2">
            {isLoading ? <Loader2 className="animate-spin mx-auto" size={32} /> : runningCount}
          </div>
          {lastRefresh && (
            <div className="text-xs text-slate-500">
              Last update: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export const DockerResourceConfigCard: React.FC = () => {
  const [cpuCores, setCpuCores] = useState<number>(1);
  const [memoryGB, setMemoryGB] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDockerSettings();
  }, []);

  // Auto-save when values change
  useEffect(() => {
    if (isLoading) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDockerSettings();
    }, 1000); // Auto-save after 1 second of no changes

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [cpuCores, memoryGB]);

  const loadDockerSettings = async () => {
    try {
      setIsLoading(true);
      const result = await (window as any).settingsAPI.getSettings();
      if (result.success && result.settings) {
        setCpuCores(result.settings.dockerCpuCores || 1);
        setMemoryGB(result.settings.dockerMemoryGB || 1);
      }
    } catch (error) {
      console.error('Failed to load Docker resource settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDockerSettings = async () => {
    try {
      const result = await (window as any).settingsAPI.updateSettings({
        dockerCpuCores: cpuCores,
        dockerMemoryGB: memoryGB
      });

      if (result.success) {
        toast.success('Docker resource settings saved', {
          duration: 1000
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to save Docker resource settings:', error);
      toast.error(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCpuChange = (value: string) => {
    const numValue = parseInt(value) || 1;
    setCpuCores(Math.max(1, Math.min(8, numValue)));
  };

  const handleMemoryChange = (value: string) => {
    const numValue = parseInt(value) || 1;
    setMemoryGB(Math.max(1, Math.min(16, numValue)));
  };

  const handleReset = () => {
    setCpuCores(1);
    setMemoryGB(1);
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Cpu size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Resources</h3>
            <p className="text-slate-600 text-xs">Container Configuration</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
          Config
        </Badge>
      </div>

      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-2 flex-1">
            <div className="p-1.5 bg-white/60 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu size={12} />
                  <span className="text-xs font-medium">CPU Cores</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    id="cpu-cores"
                    type="number"
                    min="1"
                    max="8"
                    value={cpuCores}
                    onChange={(e) => handleCpuChange(e.target.value)}
                    className="w-16 h-6 text-xs px-2 py-1"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="p-1.5 bg-white/60 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive size={12} />
                  <span className="text-xs font-medium">Memory「GB」</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    id="memory-gb"
                    type="number"
                    min="1"
                    max="16"
                    value={memoryGB}
                    onChange={(e) => handleMemoryChange(e.target.value)}
                    className="w-16 h-6 text-xs px-2 py-1"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto space-y-2 pt-2">
          <div className="pt-1 text-center">
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center space-x-1 mx-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isLoading ? 'animate-spin' : ''}>
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                <path d="M21 21v-5h-5"/>
              </svg>
              <span>Reset</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 text-center">
            Changes will apply to new containers only
          </div>
        </div>
      </div>
    </Card>
  );
};