import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Container, CheckCircle, XCircle, HelpCircle, Calendar, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import '../types/docker';

export const DockerHealthCheck: React.FC = () => {
  const [isDockerRunning, setIsDockerRunning] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [defaultImage, setDefaultImage] = useState<string>('');
  const [hasDefaultImage, setHasDefaultImage] = useState<boolean | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  const loadSettings = async () => {
    try {
      const result = await window.settingsAPI.getSettings();
      if (result.success && result.settings) {
        setDefaultImage(result.settings.defaultDockerImage || 'ubuntu:latest');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setDefaultImage('ubuntu:latest');
    }
  };

  const checkDockerImage = async (imageName: string) => {
    if (!imageName) return;

    try {
      const result = await window.dockerAPI.checkImage(imageName);
      if (result.success) {
        setHasDefaultImage(result.hasImage || false);
      } else {
        setHasDefaultImage(false);
        console.error('Docker image check failed:', result.error);
      }
    } catch (error) {
      setHasDefaultImage(false);
      console.error('Error checking Docker image:', error);
    }
  };

  const loadBundledImage = async () => {
    setIsLoadingImage(true);
    setLoadError(undefined);
    try {
      const result = await window.dockerAPI.loadBundledImage();
      if (result.success) {
        setLoadError(undefined);
        // Reload image status after loading
        await checkDockerImage(defaultImage);
      } else {
        setLoadError(result.error || 'Failed to load image');
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoadingImage(false);
    }
  };

  const checkDockerStatus = async () => {
    setIsChecking(true);
    try {
      // Check Docker daemon
      const result = await window.dockerAPI.pingDocker();
      if (result.success) {
        setIsDockerRunning(result.isRunning || false);

        // If Docker is running, check for default image
        if (result.isRunning && defaultImage) {
          await checkDockerImage(defaultImage);
        }
      } else {
        setIsDockerRunning(false);
        setHasDefaultImage(null);
        console.error('Docker ping failed:', result.error);
      }
      setLastChecked(new Date());
    } catch (error) {
      setIsDockerRunning(false);
      setHasDefaultImage(null);
      setLastChecked(new Date());
      console.error('Error checking Docker status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (defaultImage) {
      checkDockerStatus();
    }
  }, [defaultImage]);

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

  
  return (
    <>
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Container size={16} className="text-white" />
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

      <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between p-1.5 bg-white/60 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar size={12} />
            <span className="text-xs font-medium">Last Check</span>
          </div>
          <span className="text-xs text-slate-600">{lastChecked.toLocaleTimeString()}</span>
        </div>

        {isDockerRunning ? (
          <div className="flex items-center space-x-2 p-2 bg-green-100 rounded-lg">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-xs text-green-700 font-medium">
              Docker is running normally
            </span>
          </div>
        ) : isDockerRunning === false ? (
          <div className="flex items-center space-x-2 p-2 bg-red-100 rounded-lg">
            <XCircle size={16} className="text-red-600" />
            <span className="text-xs text-red-700 font-medium">
              Docker is not running, please start Docker
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
            <HelpCircle size={16} className="text-gray-600" />
            <span className="text-xs text-gray-700 font-medium">
              Status unknown, click refresh to check
            </span>
          </div>
        )}

        {defaultImage && isDockerRunning && (
          <div className="mt-1">
            {hasDefaultImage === true ? (
              <div className="flex items-center space-x-2 p-2 bg-green-100 rounded-lg">
                <CheckCircle size={16} className="text-green-600" />
                <span className="text-xs text-green-700 font-medium">
                  Docker image ready - sandboxes available
                </span>
              </div>
            ) : hasDefaultImage === false ? (
              <div className="flex items-center space-x-2 p-2 bg-orange-100 rounded-lg">
                <XCircle size={16} className="text-orange-600" />
                <span className="text-xs text-orange-700 font-medium">
                  Docker image required - load needed
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
                <HelpCircle size={16} className="text-gray-600" />
                <span className="text-xs text-gray-700 font-medium">
                  Checking Docker image status...
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-1 flex-shrink-0 flex justify-end">
        <Button
          onClick={checkDockerStatus}
          disabled={isChecking}
          variant="ghost"
          size="sm"
          className="h-7 px-2"
        >
          <div className="flex items-center space-x-1">
            <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
            <span className="text-xs">{isChecking ? 'Checking...' : 'Refresh'}</span>
          </div>
        </Button>
      </div>
    </Card>

    {/* Force dialog when image is missing */}
    <Dialog open={isDockerRunning === true && hasDefaultImage === false} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Load Docker Image</DialogTitle>
          <DialogDescription>
            System detected that Docker is running, but the default image <strong>{defaultImage}</strong> is not available.
            You need to load the image from the bundle file to create sandboxes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loadError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {loadError}
            </div>
          )}

          <div className="flex justify-center space-x-3">
            <Button
              onClick={loadBundledImage}
              disabled={isLoadingImage}
              className="min-w-[120px]"
            >
              {isLoadingImage ? 'Loading...' : 'Load Image'}
            </Button>
          </div>

          {isLoadingImage && (
            <div className="text-xs text-gray-500 text-center">
              Loading image from bundle file, please wait...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

