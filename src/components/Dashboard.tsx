import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { MCPServerStatusCard, MCPServerConfigCard } from './MCPServerManager';
import { DockerHealthCheck } from './DockerHealthCheck';
import { TcpForwarderStatusCard } from './TcpForwarderManager';

export const Dashboard: React.FC = () => {
  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-4 p-4 h-full w-full box-border overflow-hidden">
      {/* 左上：MCP Server状态 */}
      <div className="col-span-1 row-span-1 min-h-0">
        <div className="h-full flex flex-col min-h-0">
          <MCPServerStatusCard />
        </div>
      </div>
      <div className="col-span-1 row-span-1 min-h-0">
        <div className="h-full flex flex-col min-h-0">
          <MCPServerConfigCard />
        </div>
      </div>
      {/* 左下：Docker健康检查 */}
      <div className="col-span-1 row-span-1 min-h-0">
        <div className="h-full flex flex-col min-h-0">
          <DockerHealthCheck />
        </div>
      </div>
      <div className="col-span-1 row-span-1 min-h-0">
        <div className="h-full flex flex-col min-h-0">
          <TcpForwarderStatusCard />
        </div>
      </div>

      {/* 中下：MCP Server配置 */}

      {/* 右上：快速操作 */}
      <div className="col-span-1 row-span-1 min-h-0">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 h-full w-full flex flex-col relative">
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">⚡</span>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">快速操作</h3>
          <div className="text-slate-600 text-xs">常用功能</div>
        </div>

        <div className="space-y-2 flex-1">
          <button className="w-full p-2 bg-white/60 backdrop-blur rounded-lg hover:bg-white/80 transition-all text-left">
            <div className="flex items-center space-x-2">
              <span className="text-base">📦</span>
              <div>
                <div className="font-medium text-xs">创建容器</div>
                <div className="text-xs text-slate-600">新建沙箱环境</div>
              </div>
            </div>
          </button>

          <button className="w-full p-2 bg-white/60 backdrop-blur rounded-lg hover:bg-white/80 transition-all text-left">
            <div className="flex items-center space-x-2">
              <span className="text-base">🔧</span>
              <div>
                <div className="font-medium text-xs">配置MCP</div>
                <div className="text-xs text-slate-600">服务器设置</div>
              </div>
            </div>
          </button>
        </div>
      </Card>
      </div>


      {/* 右下：开发环境 */}
      <div className="col-span-1 row-span-1 min-h-0">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 h-full w-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Dev Environment</h3>
            <div className="text-slate-600 text-xs">Tools Status</div>
          </div>
          <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">🛠️</span>
          </div>
        </div>

        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between p-1.5 bg-white/60 rounded-lg">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs">🐍</span>
              <span className="text-xs font-medium">Python</span>
            </div>
            <Badge className="bg-green-500 text-white text-xs">Ready</Badge>
          </div>

          <div className="flex items-center justify-between p-1.5 bg-white/60 rounded-lg">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs">📘</span>
              <span className="text-xs font-medium">TypeScript</span>
            </div>
            <Badge className="bg-green-500 text-white text-xs">Ready</Badge>
          </div>

          <div className="flex items-center justify-between p-1.5 bg-white/60 rounded-lg">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs">💻</span>
              <span className="text-xs font-medium">Shell</span>
            </div>
            <Badge className="bg-green-500 text-white text-xs">Ready</Badge>
          </div>
        </div>
      </Card>
      </div>
    </div>
  );
};