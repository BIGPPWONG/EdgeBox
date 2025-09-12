import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';

interface MCPServerStatus {
  status: 'stopped' | 'starting' | 'running' | 'error';
  port: number;
  activeSessions: number;
  totalRequests: number;
  uptime: string;
}

export const MCPServerManager: React.FC = () => {
  const [serverStatus, setServerStatus] = useState<MCPServerStatus>({
    status: 'stopped',
    port: 8888,
    activeSessions: 0,
    totalRequests: 0,
    uptime: '0m',
  });
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Mock server status updates
    const interval = setInterval(() => {
      if (serverStatus.status === 'running') {
        setServerStatus(prev => ({
          ...prev,
          totalRequests: prev.totalRequests + Math.floor(Math.random() * 3),
        }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [serverStatus.status]);

  const handleStartServer = async () => {
    setServerStatus(prev => ({ ...prev, status: 'starting' }));
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting MCP Server on port ${serverStatus.port}...`]);
    
    // Simulate server startup
    setTimeout(() => {
      setServerStatus(prev => ({ 
        ...prev, 
        status: 'running',
        uptime: '0m',
      }));
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] MCP Server started successfully`]);
    }, 2000);
  };

  const handleStopServer = async () => {
    setServerStatus(prev => ({ 
      ...prev, 
      status: 'stopped',
      activeSessions: 0,
      uptime: '0m',
    }));
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] MCP Server stopped`]);
  };

  const handleRestartServer = async () => {
    await handleStopServer();
    setTimeout(() => {
      handleStartServer();
    }, 1000);
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
            {serverStatus.status === 'stopped' && (
              <Button
                onClick={handleStartServer}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Start Server
              </Button>
            )}
            {serverStatus.status === 'running' && (
              <>
                <Button
                  onClick={handleRestartServer}
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  Restart
                </Button>
                <Button
                  onClick={handleStopServer}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Stop
                </Button>
              </>
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
              onChange={(e) => setServerStatus(prev => ({ ...prev, port: parseInt(e.target.value) || 8888 }))}
              disabled={serverStatus.status !== 'stopped'}
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
              disabled={serverStatus.status !== 'stopped'}
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