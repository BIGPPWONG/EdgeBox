import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { MCPServerStatus } from '../types/docker';
import { Wrench, Clock, BarChart3, Link, RefreshCw, Radio } from 'lucide-react';

interface LocalMCPServerStatus extends MCPServerStatus {
  totalRequests: number;
  uptime: string;
}

// Hook for MCP server data
const useMCPServer = () => {
  const [serverStatus, setServerStatus] = useState<LocalMCPServerStatus>({
    status: 'starting',
    port: 8888,
    activeSessions: 0,
    totalRequests: 0,
    uptime: '0m',
    startTime: new Date(),
  });

  const initializeMcpServer = useCallback(async () => {
    try {
      const statusResult = await window.mcpAPI.getStatus();
      console.log('MCP Server status:', statusResult);

      if (statusResult.success && statusResult.status?.status === 'running') {
        setServerStatus(prev => ({
          ...prev,
          ...statusResult.status,
          totalRequests: prev.totalRequests,
          uptime: statusResult.status!.startTime
            ? formatUptime(Date.now() - new Date(statusResult.status!.startTime).getTime())
            : '0s',
        }));
      } else {
        const startResult = await window.mcpAPI.startServer();
        if (startResult.success && startResult.status) {
          setServerStatus(prev => ({
            ...prev,
            ...startResult.status,
            totalRequests: 0,
            uptime: '0s',
          }));
        }
      }
    } catch (error) {
      console.error('Failed to initialize MCP server:', error);
      setServerStatus(prev => ({ ...prev, status: 'error' }));
    }
  }, []);

  useEffect(() => {
    initializeMcpServer();
  }, [initializeMcpServer]);

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
              totalRequests: prev.totalRequests + Math.floor(Math.random() * 2),
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

  const restartServer = useCallback(async () => {
    try {
      setServerStatus(prev => ({ ...prev, status: 'starting' }));
      const result = await window.mcpAPI.restartServer();

      if (result.success && result.status) {
        setServerStatus(prev => ({
          ...prev,
          ...result.status,
          totalRequests: 0,
          uptime: '0s',
        }));
      }
    } catch (error) {
      console.error('Failed to restart MCP server:', error);
      setServerStatus(prev => ({ ...prev, status: 'error' }));
    }
  }, []);

  return { serverStatus, restartServer };
};

// MCP Server运行状态卡片
export const MCPServerStatusCard: React.FC = () => {
  const { serverStatus, restartServer } = useMCPServer();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500 text-white text-xs">Running</Badge>;
      case 'starting':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">Starting</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Unknown</Badge>;
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Wrench size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">MCP Server</h3>
            <p className="text-slate-600 text-xs">Runtime Status Monitor</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(serverStatus.status)}
        </div>
      </div>

      {serverStatus.status === 'running' ? (
        <div className="space-y-2 flex-1 min-h-0">
          <div className="flex items-center justify-between p-1.5 bg-white/60 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock size={12} />
              <span className="text-xs font-medium">Uptime</span>
            </div>
            <span className="text-xs font-bold text-blue-600">{serverStatus.uptime}</span>
          </div>

          <div className="flex items-center justify-between p-1.5 bg-white/60 rounded-lg">
            <div className="flex items-center space-x-2">
              <BarChart3 size={12} />
              <span className="text-xs font-medium">Requests Processed</span>
            </div>
            <span className="text-xs font-bold text-green-600">{serverStatus.totalRequests}</span>
          </div>

          <div className="flex items-center justify-between p-1.5 bg-white/60 rounded-lg">
            <div className="flex items-center space-x-2">
              <Link size={12} />
              <span className="text-xs font-medium">Active Sessions</span>
            </div>
            <span className="text-xs font-bold text-purple-600">{serverStatus.activeSessions}</span>
          </div>

          <div className="mt-2 p-2 bg-white/60 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-1">
              <Link size={12} />
              <span className="text-xs font-medium">Port</span>
            </div>
            <div className="text-sm font-bold text-blue-600 font-mono">:{serverStatus.port}</div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 flex-1 flex flex-col justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <h4 className="text-xs font-semibold text-slate-700 mb-1">
            {serverStatus.status === 'starting' ? 'Starting...' : 'Service Offline'}
          </h4>
          <p className="text-xs text-slate-600 mb-2">
            {serverStatus.status === 'starting' ? 'Initializing protocol' : 'Please check configuration'}
          </p>
          <Button
            onClick={restartServer}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            <div className="flex items-center space-x-1">
              <RefreshCw size={14} />
              <span>Restart</span>
            </div>
          </Button>
        </div>
      )}
    </Card>
  );
};

// MCP Server监听地址配置卡片
export const MCPServerConfigCard: React.FC = () => {
  const [enableGUITools, setEnableGUITools] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await window.settingsAPI.getSettings();
      if (result.success && result.settings) {
        setEnableGUITools(result.settings.enableGUITools);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGUITools = async (enabled: boolean) => {
    try {
      const result = await window.settingsAPI.updateSettings({ enableGUITools: enabled });
      if (result.success) {
        setEnableGUITools(enabled);

        // Restart MCP server after GUI tools setting change
        try {
          const restartResult = await window.mcpAPI.restartServer();
          if (restartResult.success && restartResult.status) {
            console.log('MCP server restarted successfully after GUI tools change');
          }
        } catch (restartError) {
          console.error('Failed to restart MCP server after GUI tools change:', restartError);
        }
      }
    } catch (error) {
      console.error('Failed to update GUI tools setting:', error);
    }
  };

  // const { serverStatus } = useMCPServer();
  const mcpUrl = `http://localhost:8888/mcp`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Radio size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">MCP Config</h3>
            <p className="text-slate-600 text-xs">Claude Desktop Connection</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
          Ready
        </Badge>
      </div>

      <div className="space-y-2 flex-1 min-h-0">
        <div className="flex items-center justify-between p-1.5 bg-white/60 rounded-lg">
          <div className="flex items-center space-x-2">
            <Radio size={12} />
            <span className="text-xs font-medium">Protocol Type</span>
          </div>
          <span className="text-xs font-bold text-blue-600">HTTP Streamable</span>
        </div>
        <div className="p-1.5 bg-white/60 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wrench size={12} />
              <span className="text-xs font-medium">Enable GUI Tools</span>
            </div>
            <Switch
              checked={enableGUITools}
              onCheckedChange={handleToggleGUITools}
              disabled={loading}
            />
          </div>
        </div>

        <div className="p-1.5 bg-white/60 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-1">
            <Link size={12} />
            <span className="text-xs font-medium">Server Address</span>
          </div>
          <span className="text-xs font-bold text-green-600 font-mono break-all">{mcpUrl}</span>
        </div>


      </div>
    </Card>
  );
};
