import React, { useState, useEffect } from 'react';
import { DockerContainer } from '../types/docker';

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
            const deleteResult = await (window as any).sandboxManagerAPI.deleteSandbox(session.sessionId);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Running Sandboxes List */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '500',
              margin: 0
            }}>
              Running Sandboxes ({containers.length})
            </h2>
            {lastRefresh && (
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px'
              }}>
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {refreshError && (
              <div style={{
                fontSize: '12px',
                color: '#ef4444',
                padding: '4px 8px',
                backgroundColor: '#fef2f2',
                borderRadius: '4px',
                border: '1px solid #fecaca'
              }}>
                {refreshError}
              </div>
            )}
            <button
              onClick={() => refreshContainers(true)}
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
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
            </button>
          </div>
        </div>

        {containers.length === 0 ? (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <p style={{ margin: 0 }}>No running sandboxes</p>
          </div>
        ) : (
          <div>
            {containers.map((container) => (
              <div key={container.id} style={{
                padding: '16px 24px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ fontWeight: '500', color: '#111827' }}>
                      {container.name}
                    </div>
                    <span style={{
                      padding: '2px 6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      borderRadius: '4px',
                      backgroundColor: container.status === 'running' ? '#d1fae5' : container.status === 'starting' ? '#fef3c7' : '#f3f4f6',
                      color: container.status === 'running' ? '#10b981' : container.status === 'starting' ? '#f59e0b' : '#6b7280'
                    }}>
                      {container.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Domain: {container.domain}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                    Ports: {Object.entries(container.ports).map(([containerPort, hostPort]) =>
                      `${containerPort}→${hostPort}`
                    ).join(', ')}
                  </div>
                </div>

                <button
                  onClick={() => handleStopContainer(container.name)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Stop
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};