import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Shuffle, Target, Wrench, Lightbulb } from 'lucide-react';

// Global debug mode configuration - imported from app config
const DEBUG_MODE_ENABLED = window.DEBUG_MODE_ENABLED || false; // Check for global debug mode setting

interface ForwarderStatus {
  port: number;
  isRunning: boolean;
}

// Hook for TCP forwarder data
const useTcpForwarder = () => {
  const [forwarders, setForwarders] = useState<ForwarderStatus[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(DEBUG_MODE_ENABLED);

  const refreshStatus = async () => {
    try {
      const result = await window.tcpForwarderAPI.getStatus();
      if (result.success && result.status) {
        setForwarders(result.status);
        setIsRunning(result.areRunning || false);
      }
    } catch (error) {
      console.error('Failed to get TCP forwarder status:', error);
    }
  };

  const startForwarders = async () => {
    setIsLoading(true);
    try {
      const result = await window.tcpForwarderAPI.start();
      if (result.success) {
        await refreshStatus();
      }
    } catch (error) {
      console.error('Failed to start TCP forwarders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopForwarders = async () => {
    setIsLoading(true);
    try {
      const result = await window.tcpForwarderAPI.stop();
      if (result.success) {
        await refreshStatus();
      }
    } catch (error) {
      console.error('Failed to stop TCP forwarders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return {
    forwarders,
    isRunning,
    isLoading,
    debugMode,
    refreshStatus,
    startForwarders,
    stopForwarders,
    toggleDebugMode
  };
};

// TCP Forwarder监听端口列表卡片
export const TcpForwarderStatusCard: React.FC = () => {
  const { forwarders, isRunning, isLoading, debugMode, startForwarders, stopForwarders, toggleDebugMode } = useTcpForwarder();

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shuffle size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">TCP Forwarder</h3>
            <p className="text-slate-600 text-xs">Listening Port List</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className={`${isRunning ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'} text-xs`}>
            {isRunning ? 'Running' : 'Auto'}
          </Badge>
          {/* <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
            {forwarders.length} Ports
          </Badge> */}
        </div>
      </div>

      <div className="space-y-2 flex-1 min-h-0">
        <div className="p-3 bg-white/70 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Target size={16} />
            <span className="text-sm font-medium text-slate-700">Configured Listening Ports</span>
          </div>
          <div className="font-mono text-sm text-blue-600 font-bold break-all">
            {forwarders.length > 0
              ? forwarders.map(f => `${f.port}${f.isRunning ? ' ✓' : ' ✗'}`).join(', ')
              : 'No configured ports'
            }
          </div>
        </div>

        {debugMode && (
          <div className="p-3 bg-white/70 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Wrench size={16} />
                <span className="text-sm font-medium text-slate-700">Manual Controls (Debug)</span>
              </div>
              <button
                onClick={toggleDebugMode}
                className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
              >
                Hide
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={startForwarders}
                disabled={isLoading || isRunning}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${isLoading || isRunning
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
              >
                {isLoading ? 'Starting...' : 'Start'}
              </button>
              <button
                onClick={stopForwarders}
                disabled={isLoading || !isRunning}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${isLoading || !isRunning
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
              >
                {isLoading ? 'Stopping...' : 'Stop'}
              </button>
            </div>
          </div>
        )}


        <div className="p-2 bg-blue-100 rounded-lg">
          <div className="flex items-center space-x-1">
            <Lightbulb size={12} className="text-blue-700" />
            <span className="text-xs font-medium text-blue-700">Note</span>
          </div>
          <div className="text-xs text-blue-600 mt-1">
            TCP forwarder is managed by MCP server automatically. Manual controls are only available in debug mode for troubleshooting.
          </div>
        </div>
      </div>
    </Card>
  );
};

// 简化的TCP Forwarder组件，仅显示端口列表
export const TcpForwarderManager: React.FC = () => {
  return (
    <div className="space-y-6">
      <TcpForwarderStatusCard />
    </div>
  );
};