import React, { useState } from 'react';
import { Dashboard } from './Dashboard';
import { MinimalSandboxManager } from './MinimalSandboxManager';
import { TcpForwarderManager } from './TcpForwarderManager';
import { Badge } from './ui/badge';

type TabType = 'dashboard' | 'containers' | 'mcp' | 'network';

interface MenuItem {
  id: TabType;
  label: string;
  icon: string;
  component: React.ComponentType;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Home', icon: '🏠', component: Dashboard },
  { id: 'containers', label: 'Containers', icon: '📦', component: MinimalSandboxManager },
  { id: 'network', label: 'Network', icon: '🌐', component: TcpForwarderManager },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const ActiveComponent = menuItems.find(item => item.id === activeTab)?.component || Dashboard;

  return (
    <div className="h-screen flex bg-slate-100">
      {/* 左侧导航菜单 */}
      <div className="w-64 bg-slate-800 text-white flex flex-col">
        {/* 顶部用户信息 */}
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-400 to-green-500 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">E2B</span>
            </div>
            <div>
              <div className="font-semibold text-lg">E2B Manager</div>
              <div className="text-sm text-slate-400">Development</div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-xl">
            <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
              <span className="text-slate-200 font-medium text-sm">👨‍💻</span>
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
                w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-left transition-all duration-200
                ${activeTab === item.id
                  ? 'bg-white text-slate-800 shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* 底部设置区域 */}
        <div className="p-4 border-t border-slate-700">
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200">
            <span>⚙️</span>
            <span>Settings</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200 mt-2">
            <span>🚪</span>
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* 右侧主要内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
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
            <span className="text-slate-600">E2B Desktop v1.0</span>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              System Ready
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};