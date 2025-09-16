import React from 'react';
import { DockerHealthCheck } from './DockerHealthCheck';
import { MinimalSandboxManager } from './MinimalSandboxManager';
import { MCPServerManager } from './MCPServerManager';
import { TcpForwarderManager } from './TcpForwarderManager';

export const App: React.FC = () => {
  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ color: '#111827', marginBottom: '24px' }}>E2B Sandbox Manager</h1>
      <DockerHealthCheck />
      <MinimalSandboxManager />
      <MCPServerManager />
      {/* <TcpForwarderManager /> */}
    </div>
  );
};