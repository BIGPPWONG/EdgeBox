import React, { useState, useEffect } from 'react';
import '../types/docker';

export const DockerHealthCheck: React.FC = () => {
  const [isDockerRunning, setIsDockerRunning] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const checkDockerStatus = async () => {
    setIsChecking(true);
    try {
      const result = await window.dockerAPI.pingDocker();
      if (result.success) {
        setIsDockerRunning(result.isRunning || false);
      } else {
        setIsDockerRunning(false);
        console.error('Docker ping failed:', result.error);
      }
      setLastChecked(new Date());
    } catch (error) {
      setIsDockerRunning(false);
      setLastChecked(new Date());
      console.error('Error checking Docker status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkDockerStatus();
  }, []);

  const getStatusColor = () => {
    if (isChecking) return { bg: '#fef3c7', text: '#f59e0b' };
    if (isDockerRunning === null) return { bg: '#f3f4f6', text: '#6b7280' };
    return isDockerRunning 
      ? { bg: '#d1fae5', text: '#10b981' }
      : { bg: '#fee2e2', text: '#ef4444' };
  };

  const statusColors = getStatusColor();

  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '24px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '500', 
          margin: 0 
        }}>
          Docker Service Status
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: '500',
            borderRadius: '4px',
            backgroundColor: statusColors.bg,
            color: statusColors.text
          }}>
            {isChecking ? 'Checking...' : 
             isDockerRunning === null ? 'Unknown' :
             isDockerRunning ? 'Running' : 'Not Running'}
          </span>
          
          <button
            onClick={checkDockerStatus}
            disabled={isChecking}
            style={{
              padding: '6px 12px',
              backgroundColor: isChecking ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isChecking ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isChecking ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
        Last checked: {lastChecked.toLocaleString()}
      </div>

      {isDockerRunning ? (
        <div style={{ 
          fontSize: '14px', 
          color: '#10b981',
          backgroundColor: '#f0fdf4',
          padding: '8px 12px',
          borderRadius: '4px'
        }}>
          ✓ Docker is running and ready to create sandboxes
        </div>
      ) : isDockerRunning === false ? (
        <div style={{ 
          fontSize: '14px', 
          color: '#ef4444',
          backgroundColor: '#fef2f2',
          padding: '8px 12px',
          borderRadius: '4px'
        }}>
          ✗ Docker is not available. Please start Docker to create sandboxes.
        </div>
      ) : (
        <div style={{ 
          fontSize: '14px', 
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          padding: '8px 12px',
          borderRadius: '4px'
        }}>
          Docker status unknown. Click refresh to check.
        </div>
      )}
    </div>
  );
};