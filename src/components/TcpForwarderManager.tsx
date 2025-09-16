import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';

interface ForwarderStatus {
  port: number;
  isRunning: boolean;
}

export const TcpForwarderManager: React.FC = () => {
  const [forwarders, setForwarders] = useState<ForwarderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const refreshStatus = async () => {
    try {
      const result = await window.tcpAPI.getStatus();
      if (result.success && result.status) {
        setForwarders(result.status);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Status updated: ${result.status!.length} forwarders`]);
      }
    } catch (error) {
      console.error('Failed to get TCP forwarder status:', error);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: Failed to get status - ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  const handleStartForwarders = async () => {
    setIsLoading(true);
    try {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting TCP forwarders...`]);
      
      const result = await window.tcpAPI.startForwarders();
      if (result.success) {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] TCP forwarders started successfully`]);
        await refreshStatus();
      } else {
        throw new Error(result.error || 'Failed to start forwarders');
      }
    } catch (error) {
      console.error('Failed to start TCP forwarders:', error);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: Failed to start forwarders - ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopForwarders = async () => {
    setIsLoading(true);
    try {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Stopping TCP forwarders...`]);
      
      const result = await window.tcpAPI.stopForwarders();
      if (result.success) {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] TCP forwarders stopped successfully`]);
        await refreshStatus();
      } else {
        throw new Error(result.error || 'Failed to stop forwarders');
      }
    } catch (error) {
      console.error('Failed to stop TCP forwarders:', error);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: Failed to stop forwarders - ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const runningCount = forwarders.filter(f => f.isRunning).length;
  const allRunning = forwarders.length > 0 && runningCount === forwarders.length;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium">TCP Forwarder Status</h2>
            <div className="flex items-center space-x-3 mt-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                allRunning 
                  ? 'text-green-600 bg-green-100' 
                  : runningCount > 0 
                    ? 'text-yellow-600 bg-yellow-100'
                    : 'text-gray-600 bg-gray-100'
              }`}>
                {allRunning ? 'All Running' : runningCount > 0 ? 'Partial' : 'Stopped'}
              </span>
              <span className="text-sm text-gray-600">
                {runningCount}/{forwarders.length} Active
              </span>
            </div>
          </div>

          <div className="flex space-x-2">
            {!allRunning && (
              <Button
                onClick={handleStartForwarders}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? 'Starting...' : 'Start All'}
              </Button>
            )}
            {runningCount > 0 && (
              <Button
                onClick={handleStopForwarders}
                disabled={isLoading}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                {isLoading ? 'Stopping...' : 'Stop All'}
              </Button>
            )}
            <Button
              onClick={refreshStatus}
              variant="outline"
              className="text-gray-600"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Forwarder List */}
        {forwarders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forwarders.map((forwarder) => (
              <div
                key={forwarder.port}
                className="p-4 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      Port {forwarder.port}
                    </div>
                    <div className="text-sm text-gray-600">
                      TCP Forwarder
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    forwarder.isRunning
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {forwarder.isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No forwarders configured
          </div>
        )}
      </div>

      {/* Configuration Info */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Ports
            </label>
            <div className="text-sm text-gray-600">
              Automatically configured from container ports
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Protocol
            </label>
            <div className="text-sm text-gray-600">
              TCP with session-based routing
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <div className="text-blue-600 text-sm">
              <strong>Info:</strong> TCP forwarders automatically route traffic to sandbox containers 
              based on session IDs. They start on-demand when sandboxes are created.
            </div>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Forwarder Logs</h3>
          <Button
            onClick={clearLogs}
            variant="outline"
            size="sm"
            className="text-gray-600"
          >
            Clear Logs
          </Button>
        </div>
        <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};