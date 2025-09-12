import React, { useState, useEffect } from 'react';
import { DockerContainer } from '../types/docker';

export const MinimalSandboxManager: React.FC = () => {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newContainerName, setNewContainerName] = useState('');

  const refreshContainers = async () => {
    try {
      const result = await window.dockerAPI.getContainers();
      if (result.success) {
        setContainers(result.containers || []);
      } else {
        console.error('Failed to get containers:', result.error);
      }
    } catch (error) {
      console.error('Error getting containers:', error);
    }
  };

  const handleCreateContainer = async () => {
    if (!newContainerName.trim()) return;
    
    setIsCreating(true);
    try {
      const result = await window.dockerAPI.startContainer(
        newContainerName.trim(),
        'e2b-sandbox:latest'
      );
      
      if (result.success) {
        setNewContainerName('');
        await refreshContainers();
        console.log(`Created and started container: ${result.container?.name}`);
      } else {
        alert(`Failed to start container: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create container:', error);
      alert(`Failed to create container: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    refreshContainers();
    const interval = setInterval(refreshContainers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStopContainer = async (containerName: string) => {
    if (confirm(`Stop container "${containerName}"?`)) {
      try {
        const result = await window.dockerAPI.stopContainer(containerName);
        if (result.success) {
          await refreshContainers();
          console.log(`Stopped container: ${containerName}`);
        } else {
          alert(`Failed to stop container: ${result.error}`);
        }
      } catch (error) {
        console.error('Failed to stop container:', error);
        alert(`Failed to stop container: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Create Sandbox Form */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '500', 
          margin: '0 0 16px 0' 
        }}>
          Create Test Container
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '4px' 
            }}>
              Container Name
            </label>
            <input
              type="text"
              value={newContainerName}
              onChange={(e) => setNewContainerName(e.target.value)}
              placeholder="sandbox-test-1"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <button
            onClick={handleCreateContainer}
            disabled={isCreating || !newContainerName.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: isCreating || !newContainerName.trim() ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isCreating || !newContainerName.trim() ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {isCreating ? 'Starting...' : 'Start Container'}
          </button>
        </div>
      </div>

      {/* Running Sandboxes List */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid #e5e7eb' 
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '500', 
          margin: 0 
        }}>
          Running Containers ({containers.length})
        </h2>
      </div>
      
      {containers.length === 0 ? (
        <div style={{ 
          padding: '48px', 
          textAlign: 'center', 
          color: '#6b7280' 
        }}>
          <p style={{ margin: 0 }}>No running containers</p>
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