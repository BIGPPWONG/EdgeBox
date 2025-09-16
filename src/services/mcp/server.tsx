import { FastMCP } from "fastmcp";
import { z } from "zod";
import 'dotenv/config';
import { Sandbox } from '@e2b/code-interpreter';
import { TcpForwarder } from '../tcp-forwarder';
import { DockerManager } from '../docker-manager';
import { SandboxManager } from '../sandbox-manager';

// Create a global sandbox manager instance for main process
const sandboxManagerForMain = new SandboxManager(new DockerManager());

// Function to get the current global sandbox manager
function getSandboxManager(): typeof sandboxManagerForMain | undefined {
    return sandboxManagerForMain;
}

// Create a global TCP forwarder instance for main process      
const tcpForwarder = new TcpForwarder(getSandboxManager()!);

const server = new FastMCP({
    name: "E2b Sandbox MCP Server",
    version: "1.0.0",
    authenticate: (request) => {
        // Use session ID from header or default, ensure it's a string
        const headerSessionId = request.headers["x-session-id"];
        const sessionId = typeof headerSessionId === 'string'
            ? headerSessionId
            : Array.isArray(headerSessionId)
                ? headerSessionId[0]
                : "default_session";

        console.log(`MCP session: ${sessionId}`);

        // Return session data that will be accessible in context.session
        return Promise.resolve({
            id: sessionId,
            createdAt: new Date().toISOString(),
            userAgent: request.headers["user-agent"] || "unknown",
        });
    },
});

// Track session to sandbox mapping
const sessionSandboxMap = new Map<string, string>();

// Export function for manual sandbox cleanup
export function cleanupSandbox(sessionId: string): boolean {
    const sandboxId = sessionSandboxMap.get(sessionId);
    if (sandboxId) {
        const manager = getSandboxManager();
        if (manager) {
            manager.endSession(sessionId);
        }
        sessionSandboxMap.delete(sessionId);
        return true;
    }
    return false;
}

// Export function to get all active sessions
export function getActiveSessions(): Array<{ sessionId: string, sandboxId: string }> {
    return Array.from(sessionSandboxMap.entries()).map(([sessionId, sandboxId]) => ({
        sessionId,
        sandboxId
    }));
}

async function ensureSandbox(sessionId?: string | unknown) {
    const sessionIdStr = typeof sessionId === 'string' ? sessionId : undefined;

    if (!sessionIdStr) {
        throw new Error('Session ID is required to ensure sandbox');
    }

    // Get or create sandbox for this session
    let sandboxId = sessionSandboxMap.get(sessionIdStr);

    if (!sandboxId) {
        // Create new sandbox for this session
        const manager = getSandboxManager();
        if (!manager) {
            throw new Error('Sandbox manager not available');
        }
        sandboxId = await manager.createSandboxForSession(sessionIdStr!);
        sessionSandboxMap.set(sessionIdStr!, sandboxId);

        // Note: Cleanup will be handled by timeout or manual deletion, not session close
    }

    // Get sandbox instance (with local Docker routing)
    const manager = getSandboxManager();
    if (!manager) {
        throw new Error('Sandbox manager not available');
    }
    const container = await manager.getSandboxForSession(sessionIdStr);
    if (!container) {
        throw new Error(`No sandbox available for session ${sessionIdStr}`);
    }

    // Ensure TCP forwarders are running (only start if not already running)
    if (!tcpForwarder.areForwardersRunning()) {
        console.log('Starting TCP forwarders for session:', sessionIdStr);
        await tcpForwarder.startAllForwarders();
    }

    // Create Sandbox instance using session-specific domain for TCP forwarding
    const sessionDomain = tcpForwarder.getSessionDomain(sessionIdStr);
    console.log(`Session ${sessionIdStr} using domain: ${sessionDomain}`);
    return await Sandbox.create({
        domain: sessionDomain, // 用于 code interpreter 分流
        debug: true,
        headers: {
            'x-session-id': sessionIdStr, // 用于envd 分流
        },
    });
}

// Code execution tools (stateless - each execution is independent)
server.addTool({
    name: "execute_python",
    description: "Execute Python code in isolated environment (stateless - suitable for calculations and analysis)",
    parameters: z.object({
        code: z.string().describe("Python code to execute"),
    }),
    execute: async (args, { session }) => {
        const sbx = await ensureSandbox(session?.id);
        sbx.createCodeContext
        const result = await sbx.runCode(
            args.code,
            { language: 'python', envs: { 'x-session-id': session?.id || 'default_session' } }
        );
        return JSON.stringify({
            logs: result.logs,
            error: result.error,
            exit_code: result.error ? 1 : 0
        });
    },
});

server.addTool({
    name: "execute_typescript",
    description: "Execute TypeScript/JavaScript code in isolated environment (stateless - suitable for calculations and analysis)",
    parameters: z.object({
        code: z.string().describe("TypeScript/JavaScript code to execute"),
    }),
    execute: async (args, { session }) => {
        const sbx = await ensureSandbox(session?.id);
        const result = await sbx.runCode(args.code, { language: 'ts', envs: { 'x-session-id': session?.id || 'default_session' } });
        return JSON.stringify({
            logs: result.logs,
            error: result.error,
            exit_code: result.error ? 1 : 0
        });
    },
});

server.addTool({
    name: "execute_r",
    description: "Execute R code in isolated environment (stateless - suitable for statistical analysis)",
    parameters: z.object({
        code: z.string().describe("R code to execute"),
    }),
    execute: async (args, { session }) => {
        const sbx = await ensureSandbox(session?.id);
        const result = await sbx.runCode(args.code, { language: 'r', envs: { 'x-session-id': session?.id || 'default_session' } });
        return JSON.stringify({
            logs: result.logs,
            error: result.error,
            exit_code: result.error ? 1 : 0
        });
    },
});

server.addTool({
    name: "execute_java",
    description: "Execute Java code in isolated environment (stateless - suitable for calculations and analysis)",
    parameters: z.object({
        code: z.string().describe("Java code to execute"),
    }),
    execute: async (args, { session }) => {
        const sbx = await ensureSandbox(session?.id);
        const result = await sbx.runCode(args.code, { language: 'java', envs: { 'x-session-id': session?.id || 'default_session' } });
        return JSON.stringify({
            logs: result.logs,
            error: result.error,
            exit_code: result.error ? 1 : 0
        });
    },
});

server.addTool({
    name: "execute_bash",
    description: "Execute Bash code in isolated environment (stateless - suitable for script execution and analysis)",
    parameters: z.object({
        code: z.string().describe("Bash code to execute"),
    }),
    execute: async (args, { session }) => {
        const sbx = await ensureSandbox(session?.id);
        const result = await sbx.runCode(args.code, { language: 'bash', envs: { 'x-session-id': session?.id || 'default_session' } });
        return JSON.stringify({
            logs: result.logs,
            error: result.error,
            exit_code: result.error ? 1 : 0
        });
    },
});

// System shell commands (stateful - persistent environment)
server.addTool({
    name: "shell_run",
    description: "Run a shell command in the sandbox Linux environment (stateful - can install software, start services)",
    parameters: z.object({
        command: z.string().describe("Command to execute"),
    }),
    execute: async (args, { session }) => {
        const sbx = await ensureSandbox(session?.id);
        const result = await sbx.commands.run(args.command);
        return JSON.stringify({
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
        });
    },
});

server.addTool({
    name: "shell_run_background",
    description: "Run a shell command in background in the sandbox Linux environment (stateful - creates persistent processes)",
    parameters: z.object({
        command: z.string().describe("Command to execute in background"),
        timeout: z.number().optional().describe("Timeout in milliseconds to wait for output"),
    }),
    execute: async (args, { session }) => {
        const sbx = await ensureSandbox(session?.id);
        let output = '';
        let error = '';

        const bgCmd = await sbx.commands.run(args.command, {
            background: true,
            onStdout: (data) => {
                output += data;
            },
            onStderr: (data) => {
                error += data;
            },
        });

        // Wait for some output or timeout
        const timeout = args.timeout || 2000;
        await new Promise(resolve => setTimeout(resolve, timeout));

        return JSON.stringify({
            pid: bgCmd.pid,
            stdout: output,
            stderr: error,
            status: 'running'
        });
    },
});

// Filesystem operations (stateful - persistent filesystem)
server.addTool({
    name: "fs_list",
    description: "List files in a directory on the sandbox filesystem (stateful - reflects actual filesystem state)",
    parameters: z.object({
        path: z.string().describe("Directory path to list"),
    }),
    execute: async (args, { session }) => {
        const sbx = await ensureSandbox(session?.id);
        const files = await sbx.files.list(args.path);
        return JSON.stringify(files);
    },
});

server.addTool({
    name: "fs_read",
    description: "Read content of a file from the sandbox filesystem (stateful - reads actual file content)",
    parameters: z.object({
        path: z.string().describe("File path to read"),
    }),
    execute: async (args, { session }) => {
        const sbx = await ensureSandbox(session?.id);
        const content = await sbx.files.read(args.path);
        return content;
    },
});

server.addTool({
    name: "fs_write",
    description: "Write content to a file on the sandbox filesystem (stateful - persists to disk)",
    parameters: z.object({
        path: z.string().describe("File path to write to"),
        content: z.string().describe("Content to write"),
    }),
    execute: async (args, { session }) => {
        const sbx = await ensureSandbox(session?.id);
        await sbx.files.write(args.path, args.content);
        return "File written successfully";
    },
});

server.addTool({
    name: "fs_info",
    description: "Get information about a file on the sandbox filesystem (stateful - reflects actual file metadata)",
    parameters: z.object({
        path: z.string().describe("File path to get info for"),
    }),
    execute: async (args, { session }) => {
        const sbx = await ensureSandbox(session?.id);
        const fileInfo = await sbx.files.getInfo(args.path);
        return JSON.stringify(fileInfo);
    },
});

server.addTool({
    name: "fs_watch",
    description: "Watch a directory for changes on the sandbox filesystem (stateful - monitors actual filesystem events)",
    parameters: z.object({
        path: z.string().describe("Directory path to watch"),
        timeout: z.number().optional().describe("Timeout in milliseconds (default 5000)"),
    }),
    execute: async (args, { session }) => {
        const sbx = await ensureSandbox(session?.id);
        const events: any[] = [];

        const watchHandle = await sbx.files.watchDir(args.path, (event) => {
            events.push(event);
        });

        // Wait for events or timeout
        const timeout = args.timeout || 5000;
        await new Promise(resolve => setTimeout(resolve, timeout));

        watchHandle.stop();

        return JSON.stringify({
            events: events,
            message: `Watched directory ${args.path} for ${timeout}ms`
        });
    },
});

// Export the server instance without auto-starting
export default server;

