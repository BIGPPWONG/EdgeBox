import http from 'http';
import net from 'net';
import { DEFAULT_CONTAINER_PORTS } from '../constants/ports';
import type { SandboxManager } from './sandbox-manager';

export interface PortForwarder {
  port: number;
  server: http.Server;
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

    const server = http.createServer((req, res) => {
      this.handleHttpRequest(port, req, res);
    });

    // Handle WebSocket / HTTP upgrade (e.g. noVNC on port 6080)
    server.on('upgrade', (req, socket, head) => {
      this.handleUpgrade(port, req, socket as net.Socket, head);
    });

    const forwarder: PortForwarder = {
      port,
      server,
      isRunning: false,
    };

    await new Promise<void>((resolve, reject) => {
      server.listen(port, '0.0.0.0', () => {
        console.log(`HTTP Forwarder listening on port ${port} (all interfaces)`);
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

  /**
   * Resolve the target container port for a given session + listen port.
   * Returns null if no container or no port mapping exists.
   */
  private resolveTarget(
    listenPort: number,
    sessionId: string
  ): { targetPort: number; sessionId: string } | null {
    const container = this.sandboxManager.getContainerForSession(sessionId);
    if (!container) {
      console.error(`No container found for session ${sessionId}`);
      return null;
    }

    const targetPort = container.ports[listenPort];
    if (!targetPort) {
      console.error(`No port mapping found for container port ${listenPort}`);
      return null;
    }

    return { targetPort, sessionId };
  }

  /**
   * Per-request HTTP reverse proxy.
   * Each request is independently routed by its x-session-id header.
   *
   * Session ID resolution order:
   *  1. HTTP header  x-session-id           (fast path – no body buffering)
   *  2. POST body    env_vars["x-session-id"] (E2B SDK /execute calls)
   *  3. POST body    ["x-session-id"]         (legacy / direct calls)
   *  4. Fallback     "default_session"
   */
  private handleHttpRequest(
    listenPort: number,
    clientReq: http.IncomingMessage,
    clientRes: http.ServerResponse
  ): void {
    const headerSessionId = clientReq.headers['x-session-id'] as string | undefined;

    if (headerSessionId) {
      // Fast path: session ID already in header, stream body directly
      this.proxyRequest(listenPort, headerSessionId, clientReq, clientRes);
      return;
    }

    // Slow path: need to buffer POST body to look for session ID
    if (clientReq.method === 'POST' || clientReq.method === 'PUT') {
      const chunks: Buffer[] = [];
      clientReq.on('data', (chunk: Buffer) => chunks.push(chunk));
      clientReq.on('end', () => {
        const body = Buffer.concat(chunks);
        const sessionId = this.extractSessionFromBody(body) || 'default_session';
        this.proxyBufferedRequest(listenPort, sessionId, clientReq, clientRes, body);
      });
      clientReq.on('error', () => {
        if (!clientRes.headersSent) {
          clientRes.writeHead(400, { 'Content-Type': 'text/plain' });
        }
        clientRes.end('Request error');
      });
    } else {
      // GET / DELETE / etc. without header – use default
      this.proxyRequest(listenPort, 'default_session', clientReq, clientRes);
    }
  }

  /**
   * Try to extract x-session-id from a JSON request body.
   * Checks body.env_vars["x-session-id"] first (E2B SDK pattern),
   * then body["x-session-id"] (legacy / direct pattern).
   */
  private extractSessionFromBody(body: Buffer): string | null {
    try {
      const json = JSON.parse(body.toString());
      if (json?.env_vars?.['x-session-id']) return json.env_vars['x-session-id'];
      if (json?.['x-session-id']) return json['x-session-id'];
    } catch {
      // Not JSON or parse error – ignore
    }
    return null;
  }

  /**
   * Proxy with streaming body (fast path – body not yet consumed).
   */
  private proxyRequest(
    listenPort: number,
    sessionId: string,
    clientReq: http.IncomingMessage,
    clientRes: http.ServerResponse
  ): void {
    const target = this.resolveTarget(listenPort, sessionId);
    if (!target) {
      clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
      clientRes.end(`No container available for session "${sessionId}"`);
      return;
    }

    const proxyReq = http.request(
      {
        hostname: 'localhost',
        port: target.targetPort,
        path: clientReq.url,
        method: clientReq.method,
        headers: clientReq.headers,
      },
      (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode!, proxyRes.headers);
        proxyRes.pipe(clientRes);
      }
    );

    proxyReq.on('error', (err) => {
      console.error(`Proxy error for session ${sessionId}:`, err.message);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      clientRes.end('Proxy error');
    });

    clientReq.pipe(proxyReq);
  }

  /**
   * Proxy with pre-buffered body (slow path – body already consumed for
   * session extraction, must be written manually).
   */
  private proxyBufferedRequest(
    listenPort: number,
    sessionId: string,
    clientReq: http.IncomingMessage,
    clientRes: http.ServerResponse,
    body: Buffer
  ): void {
    const target = this.resolveTarget(listenPort, sessionId);
    if (!target) {
      clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
      clientRes.end(`No container available for session "${sessionId}"`);
      return;
    }

    // Fix Content-Length to match the buffered body (guards against
    // transfer-encoding mismatches after re-sending)
    const headers = { ...clientReq.headers };
    headers['content-length'] = String(body.length);
    delete headers['transfer-encoding'];

    const proxyReq = http.request(
      {
        hostname: 'localhost',
        port: target.targetPort,
        path: clientReq.url,
        method: clientReq.method,
        headers,
      },
      (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode!, proxyRes.headers);
        proxyRes.pipe(clientRes);
      }
    );

    proxyReq.on('error', (err) => {
      console.error(`Proxy error for session ${sessionId}:`, err.message);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      clientRes.end('Proxy error');
    });

    proxyReq.end(body);
  }

  /**
   * Per-request WebSocket / HTTP upgrade proxy.
   * Used for noVNC (port 6080) and any other upgrade-based protocols.
   */
  private handleUpgrade(
    listenPort: number,
    clientReq: http.IncomingMessage,
    clientSocket: net.Socket,
    head: Buffer
  ): void {
    const sessionId =
      (clientReq.headers['x-session-id'] as string) || 'default_session';

    const target = this.resolveTarget(listenPort, sessionId);
    if (!target) {
      clientSocket.destroy();
      return;
    }

    const targetSocket = net.createConnection(
      { host: 'localhost', port: target.targetPort },
      () => {
        // Reconstruct and forward the original HTTP upgrade request
        const reqLine = `${clientReq.method} ${clientReq.url} HTTP/${clientReq.httpVersion}\r\n`;
        const headers = Object.entries(clientReq.headers)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('\r\n');
        targetSocket.write(reqLine + headers + '\r\n\r\n');
        if (head.length > 0) targetSocket.write(head);

        // Bidirectional pipe
        clientSocket.pipe(targetSocket);
        targetSocket.pipe(clientSocket);
      }
    );

    const cleanup = () => {
      if (!clientSocket.destroyed) clientSocket.destroy();
      if (!targetSocket.destroyed) targetSocket.destroy();
    };

    clientSocket.on('error', cleanup);
    targetSocket.on('error', cleanup);
    clientSocket.on('close', cleanup);
    targetSocket.on('close', cleanup);
  }

  public async stopForwarder(port: number): Promise<void> {
    const forwarder = this.forwarders.get(port);
    if (!forwarder) return;

    return new Promise((resolve) => {
      forwarder.server.close(() => {
        console.log(`HTTP Forwarder stopped on port ${port}`);
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
