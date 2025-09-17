import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
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

  const getStatusBadge = () => {
    if (isChecking) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">Checking...</Badge>;
    }
    if (isDockerRunning === null) {
      return <Badge variant="outline" className="text-xs">Unknown</Badge>;
    }
    return isDockerRunning
      ? <Badge className="bg-green-500 text-white text-xs">Running</Badge>
      : <Badge variant="destructive" className="text-xs">Not Running</Badge>;
  };

  const getStatusMessage = () => {
    if (isDockerRunning) {
      return (
        <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-green-600 text-lg">✓</span>
          <span className="text-sm text-green-700 font-medium">
            Docker is running and ready to create sandboxes
          </span>
        </div>
      );
    }

    if (isDockerRunning === false) {
      return (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-red-600 text-lg">✗</span>
          <span className="text-sm text-red-700 font-medium">
            Docker is not available. Please start Docker to create sandboxes.
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-gray-600 text-lg">?</span>
        <span className="text-sm text-gray-700 font-medium">
          Docker status unknown. Click refresh to check.
        </span>
      </div>
    );
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🐳</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Docker Service</h3>
            <p className="text-slate-600 text-xs">Container Engine Status</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {getStatusBadge()}
        </div>
      </div>

      <div className="space-y-2 flex-1 min-h-0">
        <div className="flex items-center justify-between p-1.5 bg-white/60 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-xs">📅</span>
            <span className="text-xs font-medium">Last Check</span>
          </div>
          <span className="text-xs text-slate-600">{lastChecked.toLocaleTimeString()}</span>
        </div>

        {isDockerRunning ? (
          <div className="flex items-center space-x-2 p-2 bg-green-100 rounded-lg">
            <span className="text-green-600 text-sm">✓</span>
            <span className="text-xs text-green-700 font-medium">
              Docker is running normally, ready to create sandboxes
            </span>
          </div>
        ) : isDockerRunning === false ? (
          <div className="flex items-center space-x-2 p-2 bg-red-100 rounded-lg">
            <span className="text-red-600 text-sm">✗</span>
            <span className="text-xs text-red-700 font-medium">
              Docker is not running, please start Docker
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
            <span className="text-gray-600 text-sm">?</span>
            <span className="text-xs text-gray-700 font-medium">
              Status unknown, click refresh to check
            </span>
          </div>
        )}

        <div className="pt-1">
          <Button
            onClick={checkDockerStatus}
            disabled={isChecking}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isChecking ? 'Checking...' : '🔄 Refresh Status'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

