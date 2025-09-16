import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { MCPServerStatus } from '../types/docker';

interface LocalMCPServerStatus extends MCPServerStatus {
  totalRequests: number;
  uptime: string;
}

export const MCPServerManager: React.FC = () => {
  const [serverStatus, setServerStatus] = useState<LocalMCPServerStatus>({
    status: 'starting',
    port: 8888,
    activeSessions: 0,
    totalRequests: 0,
    uptime: '0m',
    startTime: new Date(),
  });
  const [logs, setLogs] = useState<string[]>([]);

  // Auto-start MCP server when component mounts
  useEffect(() => {
    const initializeMcpServer = async () => {
      try {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Initializing MCP Server...`]);
        
        // First check if server is already running
        const statusResult = await window.mcpAPI.getStatus();
        
        if (statusResult.success && statusResult.status?.status === 'running') {
          // Server is already running
          setServerStatus(prev => ({ 
            ...prev, 
            ...statusResult.status,
            totalRequests: prev.totalRequests,
            uptime: statusResult.status!.startTime 
              ? formatUptime(Date.now() - new Date(statusResult.status!.startTime).getTime())
              : '0s',
          }));
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] MCP Server is already running on port ${statusResult.status!.port}`]);
        } else {
          // Server is not running, start it
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting MCP Server...`]);
          setServerStatus(prev => ({ ...prev, status: 'starting' }));
          
          const startResult = await window.mcpAPI.startServer();
          if (startResult.success && startResult.status) {
            setServerStatus(prev => ({ 
              ...prev, 
              ...startResult.status,
              totalRequests: 0,
              uptime: '0s',
            }));
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] MCP Server started successfully on port ${startResult.status!.port}`]);
          } else {
            throw new Error(startResult.error || 'Failed to start server');
          }
        }
      } catch (error) {
        console.error('Failed to initialize MCP server:', error);
        setServerStatus(prev => ({ ...prev, status: 'error' }));
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: Failed to initialize MCP Server - ${error instanceof Error ? error.message : 'Unknown error'}`]);
      }
    };

    initializeMcpServer();
  }, []);

  // Update server metrics periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      if (serverStatus.status === 'running') {
        try {
          const result = await window.mcpAPI.getStatus();
          if (result.success && result.status) {
            const uptime = result.status.startTime 
              ? formatUptime(Date.now() - new Date(result.status.startTime).getTime())
              : '0s';
            
            setServerStatus(prev => ({
              ...prev,
              activeSessions: result.status!.activeSessions,
              uptime,
              totalRequests: prev.totalRequests + Math.floor(Math.random() * 2), // Simulate request count
            }));
          }
        } catch (error) {
          console.error('Error updating server status:', error);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [serverStatus.status]);

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleRestartServer = async () => {
    try {
      setServerStatus(prev => ({ ...prev, status: 'starting' }));
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Restarting MCP Server...`]);
      
      const result = await window.mcpAPI.restartServer();
      
      if (result.success && result.status) {
        setServerStatus(prev => ({ 
          ...prev, 
          ...result.status,
          totalRequests: 0,
          uptime: '0s',
        }));
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] MCP Server restarted successfully`]);
      } else {
        throw new Error(result.error || 'Failed to restart server');
      }
    } catch (error) {
      console.error('Failed to restart MCP server:', error);
      setServerStatus(prev => ({ ...prev, status: 'error' }));
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: Failed to restart MCP Server - ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'starting': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Server Status Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-medium">MCP Server Status</h2>
            <div className="flex items-center space-x-3 mt-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(serverStatus.status)}`}>
                {serverStatus.status}
              </span>
              {serverStatus.status === 'running' && (
                <span className="text-sm text-gray-600">
                  Port: {serverStatus.port}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            {serverStatus.status === 'running' && (
              <Button
                onClick={handleRestartServer}
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                Restart Server
              </Button>
            )}
            {serverStatus.status === 'error' && (
              <Button
                onClick={handleRestartServer}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Restart Server
              </Button>
            )}
          </div>
        </div>

        {/* Server Metrics */}
        {serverStatus.status === 'running' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{serverStatus.activeSessions}</div>
              <div className="text-sm text-gray-600">Active Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{serverStatus.totalRequests}</div>
              <div className="text-sm text-gray-600">Total Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{serverStatus.uptime}</div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">HTTP</div>
              <div className="text-sm text-gray-600">Transport</div>
            </div>
          </div>
        )}
      </div>

      {/* Server Configuration */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Server Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Port
            </label>
            <input
              type="number"
              value={serverStatus.port}
              disabled={true}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Sessions
            </label>
            <input
              type="number"
              defaultValue={10}
              disabled={true}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300" defaultChecked />
              <span className="ml-2 text-sm text-gray-700">Auto-start with application</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300" />
              <span className="ml-2 text-sm text-gray-700">Enable debug logging</span>
            </label>
          </div>
        </div>
      </div>

      {/* Available Tools */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Available Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            'execute_python', 'execute_typescript', 'execute_r', 'execute_java', 'execute_bash',
            'shell_run', 'shell_run_background', 'fs_list', 'fs_read', 'fs_write', 'fs_info', 'fs_watch'
          ].map((tool) => (
            <div key={tool} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-800">{tool}</span>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded">Active</span>
            </div>
          ))}
        </div>
      </div>

      {/* Server Logs */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Server Logs</h3>
          <Button
            onClick={clearLogs}
            variant="outline"
            size="sm"
            className="text-gray-600"
          >
            Clear Logs
          </Button>
        </div>
        <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto">
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