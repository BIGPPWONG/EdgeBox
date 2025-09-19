import React, { useState, useEffect } from 'react';
import { DockerContainer } from '../types/docker';
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';

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
          } else {
            alert('Could not find session for this container');
          }
        } else {
          alert('Failed to get sandbox status');
        }
      } catch (error) {
        console.error('Failed to stop container:', error);
        alert(`Failed to stop container: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50">
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