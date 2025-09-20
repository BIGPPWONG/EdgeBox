import React, { useState, useEffect } from 'react';
import { Dashboard } from './Dashboard';
import { MinimalSandboxManager } from './MinimalSandboxManager';
import { TcpForwarderManager } from './TcpForwarderManager';
import { Settings as SettingsComponent } from './Settings';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Toaster } from "@/components/ui/sonner"

import { Home, Package, Globe, Settings, Info, User, Loader2 } from 'lucide-react';
import { APP_DESCRIPTION, APP_DISPLAY_NAME } from '@/constants/app-name';

type TabType = 'dashboard' | 'containers' | 'mcp' | 'network';

interface MenuItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  component: React.ComponentType;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home, component: Dashboard },
  { id: 'containers', label: 'Containers', icon: Package, component: MinimalSandboxManager },
  { id: 'network', label: 'Network', icon: Globe, component: TcpForwarderManager },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [cleanupStatus, setCleanupStatus] = useState<'cleaning' | 'completed' | 'error'>('cleaning');
  const [cleanupError, setCleanupError] = useState<string>('');

  // Listen for cleanup events from main process
  useEffect(() => {
    const handleCleanupStarted = () => {
      setShowCleanupDialog(true);
      setCleanupStatus('cleaning');
    };

    const handleCleanupCompleted = () => {
      setCleanupStatus('completed');
      setTimeout(() => {
        setShowCleanupDialog(false);
      }, 2000);
    };

    const handleCleanupError = (errorMessage: string) => {
      setCleanupStatus('error');
      setCleanupError(errorMessage);
    };

    // Check if window.electronAPI exists (defined in preload)
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const electronAPI = (window as any).electronAPI;
      electronAPI.onCleanupStarted?.(handleCleanupStarted);
      electronAPI.onCleanupCompleted?.(handleCleanupCompleted);
      electronAPI.onCleanupError?.(handleCleanupError);
    }
  }, []);

  const ActiveComponent = menuItems.find(item => item.id === activeTab)?.component || Dashboard;

  return (
    <div className="h-screen flex bg-transparent">
      {/* 清理对话框 - 与app风格统一 */}
      <Dialog
        open={showCleanupDialog}
        onOpenChange={cleanupStatus === 'cleaning' ? undefined : setShowCleanupDialog}
      >
        <DialogContent
          className="sm:max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 shadow-2xl"
          showCloseButton={cleanupStatus !== 'cleaning'}
          onPointerDownOutside={cleanupStatus === 'cleaning' ? (e) => e.preventDefault() : undefined}
          onEscapeKeyDown={cleanupStatus === 'cleaning' ? (e) => e.preventDefault() : undefined}
        >
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-3 text-white text-lg font-medium">
              {cleanupStatus === 'cleaning' && (
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                </div>
              )}
              {cleanupStatus === 'completed' && (
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full" />
                </div>
              )}
              {cleanupStatus === 'error' && (
                <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full" />
                </div>
              )}
              <span>Container Cleanup</span>
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-sm mt-2">
              {cleanupStatus === 'cleaning' && 'Please wait while containers are being cleaned up...'}
              {cleanupStatus === 'completed' && 'All containers have been successfully cleaned up.'}
              {cleanupStatus === 'error' && `Cleanup failed: ${cleanupError}`}
            </DialogDescription>
          </DialogHeader>

          {cleanupStatus === 'cleaning' && (
            <div className="py-2">
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
            </div>
          )}

          {cleanupStatus !== 'cleaning' && (
            <div className="flex justify-end pt-4 border-t border-slate-700/50">
              <button
                onClick={() => setShowCleanupDialog(false)}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200 font-medium"
              >
                {cleanupStatus === 'error' ? 'Got it' : 'Done'}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 左侧导航菜单 */}
      <div className="drag-region pt-6 w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 text-white flex flex-col shadow-2xl">
        {/* 顶部用户信息 */}
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-400 to-green-500 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">EB</span>
            </div>
            <div>
              <div className="font-semibold text-lg">{APP_DISPLAY_NAME}</div>
              <div className="text-sm text-slate-400">{APP_DESCRIPTION}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-600/30">
            <div className="w-10 h-10 bg-slate-700/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-slate-500/30">
              <User size={16} className="text-slate-200" />
            </div>
            <div>
              <div className="font-medium text-sm">Developer</div>
              <div className="text-xs text-slate-400">Local Environment</div>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                no-drag w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-left transition-all duration-100
                ${activeTab === item.id
                  ? 'bg-white/95 backdrop-blur-sm text-slate-800 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }
              `}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* 底部设置区域 */}
        <div className="p-4 border-t border-slate-600/40">
          <Dialog>
            <DialogTrigger asChild>
              <button className="no-drag w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-100">
                <Settings size={18} />
                <span>Settings</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              {/* <DialogHeader>
                <DialogTitle>Application Settings</DialogTitle>
                <DialogDescription>
                  Configure shared variables and application preferences.
                </DialogDescription>
              </DialogHeader> */}
              <SettingsComponent />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <button className="no-drag w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-100 mt-2">
                <Info size={18} />
                <span>About</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>About {APP_DISPLAY_NAME}</DialogTitle>
                <DialogDescription>
                  {APP_DESCRIPTION}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Version:</span>
                  <span className="text-sm text-slate-600">1.0.0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Environment:</span>
                  <span className="text-sm text-slate-600">Development</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Built with:</span>
                  <span className="text-sm text-slate-600">
                    Electron + React + e2b/code-interpreter
                  </span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 右侧主要内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="drag-region h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {activeTab === 'dashboard' ? 'General Information' :
                menuItems.find(item => item.id === activeTab)?.label}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === 'dashboard' && 'Overview of your sandbox environment'}
              {activeTab === 'containers' && 'Manage your development containers'}
              {activeTab === 'mcp' && 'MCP server configuration and monitoring'}
              {activeTab === 'network' && 'Network forwarding and connectivity'}
            </p>
          </div>

          <div className="flex items-center space-x-4">
          </div>
        </div>

        {/* 主要内容区域 */}
        <main className="flex-1 p-8 bg-slate-50">
          <ActiveComponent />
        </main>

        {/* 底部状态栏 */}
        <div className="h-12 bg-white border-t border-slate-200 flex items-center justify-between px-8 text-sm">
          <div className="flex items-center space-x-6">
            <span className="text-slate-600">{APP_DISPLAY_NAME} v1.0</span>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              System Ready
            </Badge>
          </div>
        </div>
      </div>

      {/* Toast 通知 */}
      <Toaster />
    </div>
  );
};