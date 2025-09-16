import net from 'net';
import { DEFAULT_CONTAINER_PORTS } from '../constants/ports';
import type { SandboxManager } from './sandbox-manager';

export interface PortForwarder {
  port: number;
  server: net.Server;
  isRunning: boolean;
}

export class TcpForwarder {
  private forwarders: Map<number, PortForwarder> = new Map();
  private sandboxManager: SandboxManager;

  constructor(sandboxManager: SandboxManager) {
    this.sandboxManager = sandboxManager;
  }

  // Start forwarders for all default ports
  async startAllForwarders(): Promise<void> {
    const promises = DEFAULT_CONTAINER_PORTS.map(port => this.startForwarder(port));
    await Promise.all(promises);
  }

  // Start forwarder for a specific port
  async startForwarder(port: number): Promise<void> {
    if (this.forwarders.has(port)) {
      console.log(`Forwarder for port ${port} already running`);
      return;
    }

    const server = net.createServer((clientSocket) => {
      this.handleConnection(port, clientSocket);
    });

    const forwarder: PortForwarder = {
      port,
      server,
      isRunning: false,
    };

    await new Promise<void>((resolve, reject) => {
      server.listen(port, '0.0.0.0', () => {
        console.log(`TCP Forwarder listening on port ${port} (all interfaces)`);
        forwarder.isRunning = true;
        resolve();
      });

      server.on('error', (error) => {
        console.error(`Failed to start forwarder on port ${port}:`, error);
        reject(error);
      });
    });

    this.forwarders.set(port, forwarder);
  }

  private async handleConnection(listenPort: number, clientSocket: net.Socket): Promise<void> {
    console.log(`New connection on port ${listenPort}`);

    try {
      // Extract session ID from Host header
      const sessionId = await this.extractSessionFromHost(clientSocket);

      if (!sessionId) {
        console.error('No session ID found in Host header, closing connection');
        clientSocket.destroy();
        return;
      }

      console.log(`Connection for session: ${sessionId}`);

      // Get container info for this session
      const container = await this.sandboxManager.getSandboxForSession(sessionId);
      if (!container) {
        console.error(`No container found for session ${sessionId}`);
        clientSocket.destroy();
        return;
      }

      // Get target port from container port mapping
      const targetPort = container.ports[listenPort];
      if (!targetPort) {
        console.error(`No port mapping found for container port ${listenPort}`);
        clientSocket.destroy();
        return;
      }

      // Forward to target container
      await this.forwardToTarget(clientSocket, 'localhost', targetPort, sessionId);

    } catch (error) {
      console.error(`Error handling connection on port ${listenPort}:`, error);
      clientSocket.destroy();
    }
  }

  private async extractSessionFromHost(clientSocket: net.Socket): Promise<string | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 5000);

      clientSocket.once('data', (data) => {
        clearTimeout(timeout);

        const dataStr = data.toString();
        console.log('Received initial data:', dataStr);

        // Look for x-session-id header in HTTP request
        const headerSessionMatch = dataStr.match(/x-session-id:\s*([^\r\n]+)/i);
        if (headerSessionMatch) {
          const sessionId = headerSessionMatch[1].trim();
          console.log(`Found session ID in header: ${sessionId}`);

          // Re-emit the original data without modification
          setTimeout(() => {
            clientSocket.emit('data', data);
          }, 0);

          resolve(sessionId);
          return;
        }

        // Look for x-session-id in JSON body (for POST requests)
        try {
          // Split headers and body
          const httpParts = dataStr.split('\r\n\r\n');
          if (httpParts.length >= 2) {
            const bodyStr = httpParts[1];
            if (bodyStr.trim()) {
              const jsonBody = JSON.parse(bodyStr);

              // Check if x-session-id is in env_vars
              if (jsonBody.env_vars && jsonBody.env_vars['x-session-id']) {
                const sessionId = jsonBody.env_vars['x-session-id'];
                console.log(`Found session ID in body env_vars: ${sessionId}`);

                // Re-emit the original data without modification
                setTimeout(() => {
                  clientSocket.emit('data', data);
                }, 0);

                resolve(sessionId);
                return;
              }

              // Check if x-session-id is directly in the body
              if (jsonBody['x-session-id']) {
                const sessionId = jsonBody['x-session-id'];
                console.log(`Found session ID in body: ${sessionId}`);

                // Re-emit the original data without modification
                setTimeout(() => {
                  clientSocket.emit('data', data);
                }, 0);

                resolve(sessionId);
                return;
              }
            }
          }
        } catch (error) {
          // If JSON parsing fails, continue with normal flow
          console.log('Failed to parse JSON body, continuing...');
        }

        // If no session ID found, re-emit data and return null
        setTimeout(() => {
          clientSocket.emit('data', data);
        }, 0);
        resolve(null);
      });

      clientSocket.once('close', () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  }

  private async forwardToTarget(
    clientSocket: net.Socket,
    targetHost: string,
    targetPort: number,
    sessionId: string
  ): Promise<void> {
    const targetSocket = net.createConnection({ port: targetPort, host: targetHost }, () => {
      console.log(`Connected to target ${targetHost}:${targetPort} for session ${sessionId}`);
    });

    // Setup bidirectional data forwarding
    clientSocket.pipe(targetSocket);
    targetSocket.pipe(clientSocket);

    // Handle errors and cleanup
    const cleanup = () => {
      if (!clientSocket.destroyed) clientSocket.destroy();
      if (!targetSocket.destroyed) targetSocket.destroy();
    };

    clientSocket.on('error', (err) => {
      console.error(`Client socket error for session ${sessionId}:`, err);
      cleanup();
    });

    targetSocket.on('error', (err) => {
      console.error(`Target socket error for session ${sessionId}:`, err);
      cleanup();
    });

    clientSocket.on('close', () => {
      console.log(`Client connection closed for session ${sessionId}`);
      cleanup();
    });

    targetSocket.on('close', () => {
      console.log(`Target connection closed for session ${sessionId}`);
      cleanup();
    });
  }

  public async stopForwarder(port: number): Promise<void> {
    const forwarder = this.forwarders.get(port);
    if (!forwarder) return;

    return new Promise((resolve) => {
      forwarder.server.close(() => {
        console.log(`TCP Forwarder stopped on port ${port}`);
        this.forwarders.delete(port);
        resolve();
      });
    });
  }

  public async stopAllForwarders(): Promise<void> {
    const promises = Array.from(this.forwarders.keys()).map(port => this.stopForwarder(port));
    await Promise.all(promises);
  }

  public getForwarderStatus(): { port: number; isRunning: boolean }[] {
    return Array.from(this.forwarders.values()).map(f => ({
      port: f.port,
      isRunning: f.isRunning,
    }));
  }

  public areForwardersRunning(): boolean {
    return this.forwarders.size > 0 &&
      Array.from(this.forwarders.values()).every(f => f.isRunning);
  }

  // Generate localhost domain for use in Sandbox.create()
  public getSessionDomain(_sessionId: string, port: number = 49999): string {
    return `http://localhost:${port}`;
  }
}

// Note: Global TCP forwarder instance should be created with a sandbox manager
// export const tcpForwarder = new TcpForwarder(sandboxManager);