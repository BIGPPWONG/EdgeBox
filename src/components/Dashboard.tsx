import React from 'react';
import { MCPServerStatusCard, MCPServerConfigCard } from './MCPServerManager';
import { DockerHealthCheck } from './DockerHealthCheck';
import { TcpForwarderStatusCard } from './TcpForwarderManager';
import { SandboxCountCard, DockerResourceConfigCard } from './MinimalSandboxManager';

export const Dashboard: React.FC = () => {
  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-4 p-4 h-full w-full box-border overflow-hidden">
      {/* 左上：MCP Server状态 */}
      <div className="col-span-1 row-span-1 min-h-0 max-h-[280px]">
        <div className="h-full flex flex-col min-h-0 overflow-hidden">
          <MCPServerStatusCard />
        </div>
      </div>
      <div className="col-span-1 row-span-1 min-h-0 max-h-[280px]">
        <div className="h-full flex flex-col min-h-0 overflow-hidden">
          <MCPServerConfigCard />
        </div>
      </div>
      {/* 左下：Docker健康检查 */}
      <div className="col-span-1 row-span-1 min-h-0 max-h-[280px]">
        <div className="h-full flex flex-col min-h-0 overflow-hidden">
          <DockerHealthCheck />
        </div>
      </div>
      <div className="col-span-1 row-span-1 min-h-0 max-h-[280px]">
        <div className="h-full flex flex-col min-h-0 overflow-hidden">
          <TcpForwarderStatusCard />
        </div>
      </div>

      {/* 中下：MCP Server配置 */}

      {/* 右上：快速操作 */}
      <div className="col-span-1 row-span-1 min-h-0 max-h-[280px]">
        <div className="h-full flex flex-col min-h-0 overflow-hidden">
          <SandboxCountCard />
        </div>
      </div>


      {/* 右下：Docker资源配置 */}
      <div className="col-span-1 row-span-1 min-h-0 max-h-[280px]">
        <div className="h-full flex flex-col min-h-0 overflow-hidden">
          <DockerResourceConfigCard />
        </div>
      </div>
    </div>
  );
};