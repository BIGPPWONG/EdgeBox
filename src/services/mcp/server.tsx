import { FastMCP } from "fastmcp";
import { z } from "zod";
import 'dotenv/config';
import { Sandbox } from '@e2b/code-interpreter';
import { TcpForwarder } from '../tcp-forwarder';
import { DockerManager } from '../docker-manager';
import { SandboxManager } from '../sandbox-manager';
import { DesktopController } from './DesktopController';

// Settings manager will be injected from main process
let settingsManager: any = null;

export function setSettingsManager(manager: any) {
    settingsManager = manager;
}

// Global setting to control GUI tools loading
function isGUIToolsEnabled(): boolean {
    if (!settingsManager) {
        return false; // Default to disabled if no settings manager
    }
    return settingsManager.get('enableGUITools', false);
}

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

// Export the sandbox manager instance
export { sandboxManagerForMain };

// Export the TCP forwarder instance
export { tcpForwarder };

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

async function ensureDesktopController(sessionId?: string | unknown): Promise<DesktopController> {
    const sandbox = await ensureSandbox(sessionId);
    return new DesktopController(sandbox);
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
            timeoutMs: args.timeout || 0, // 0 means no timeout
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

// Desktop GUI tools (only loaded if enabled in settings)
if (isGUIToolsEnabled()) {

    // Mouse Controls
    server.addTool({
        name: "desktop_mouse_click",
        description: "Perform mouse click at current position or specified coordinates",
        parameters: z.object({
            button: z.enum(['left', 'right', 'middle']).optional().describe("Mouse button (default: left)"),
            x: z.number().optional().describe("X coordinate"),
            y: z.number().optional().describe("Y coordinate"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            await desktop.mouseClick(args.button, args.x, args.y);
            return "Mouse click performed";
        },
    });

    server.addTool({
        name: "desktop_mouse_double_click",
        description: "Perform mouse double click at current position or specified coordinates",
        parameters: z.object({
            x: z.number().optional().describe("X coordinate"),
            y: z.number().optional().describe("Y coordinate"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            await desktop.mouseDoubleClick(args.x, args.y);
            return "Mouse double click performed";
        },
    });

    server.addTool({
        name: "desktop_mouse_move",
        description: "Move mouse to specified coordinates",
        parameters: z.object({
            x: z.number().describe("X coordinate"),
            y: z.number().describe("Y coordinate"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            await desktop.mouseMove(args.x, args.y);
            return "Mouse moved";
        },
    });

    server.addTool({
        name: "desktop_mouse_scroll",
        description: "Perform mouse scroll action",
        parameters: z.object({
            direction: z.enum(['up', 'down']).describe("Scroll direction"),
            amount: z.number().optional().describe("Scroll amount (default: 1)"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            await desktop.mouseScroll(args.direction, args.amount);
            return "Mouse scroll performed";
        },
    });

    server.addTool({
        name: "desktop_mouse_drag",
        description: "Perform mouse drag from one position to another",
        parameters: z.object({
            fromX: z.number().describe("Starting X coordinate"),
            fromY: z.number().describe("Starting Y coordinate"),
            toX: z.number().describe("Ending X coordinate"),
            toY: z.number().describe("Ending Y coordinate"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            await desktop.mouseDrag(args.fromX, args.fromY, args.toX, args.toY);
            return "Mouse drag performed";
        },
    });

    // Keyboard Controls
    server.addTool({
        name: "desktop_keyboard_type",
        description: "Type text using keyboard input with automatic clipboard handling for non-ASCII characters",
        parameters: z.object({
            text: z.string().describe("Text to type"),
            delay: z.number().optional().describe("Typing delay in milliseconds (1-25, default: 12)"),
            useClipboard: z.boolean().optional().describe("Force clipboard method (default: false)"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            await desktop.keyboardType(args.text, {
                delay: args.delay,
                useClipboard: args.useClipboard
            });
            return "Text typed";
        },
    });

    server.addTool({
        name: "desktop_keyboard_press",
        description: "Press a specific key",
        parameters: z.object({
            key: z.string().describe("Key to press (e.g., 'Return', 'Escape', 'Tab', 'space')"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            await desktop.keyboardPress(args.key);
            return "Key pressed";
        },
    });

    server.addTool({
        name: "desktop_keyboard_combo",
        description: "Press key combination/shortcut",
        parameters: z.object({
            keys: z.array(z.string()).describe("Array of keys for combination (e.g., ['ctrl', 'c'])"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            await desktop.keyboardCombo(args.keys);
            return "Key combination pressed";
        },
    });

    // Window Management
    server.addTool({
        name: "desktop_get_windows",
        description: "Get list of all windows with their class names, titles, and IDs",
        parameters: z.object({
            includeMinimized: z.boolean().optional().describe("Include minimized windows (default: false)"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            const windows = await desktop.getAllWindowsWithClass(args.includeMinimized);
            return JSON.stringify(windows);
        },
    });

    server.addTool({
        name: "desktop_switch_window",
        description: "Switch to and focus a specific window by its ID",
        parameters: z.object({
            windowId: z.string().describe("Window ID to switch to"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            const success = await desktop.switchToWindow(args.windowId);
            return JSON.stringify({ success });
        },
    });

    server.addTool({
        name: "desktop_maximize_window",
        description: "Maximize a specific window",
        parameters: z.object({
            windowId: z.string().describe("Window ID to maximize"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            const success = await desktop.maximizeWindow(args.windowId);
            return JSON.stringify({ success });
        },
    });

    server.addTool({
        name: "desktop_minimize_window",
        description: "Minimize a specific window",
        parameters: z.object({
            windowId: z.string().describe("Window ID to minimize"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            const success = await desktop.minimizeWindow(args.windowId);
            return JSON.stringify({ success });
        },
    });

    server.addTool({
        name: "desktop_resize_window",
        description: "Resize a specific window to given dimensions",
        parameters: z.object({
            windowId: z.string().describe("Window ID to resize"),
            width: z.number().describe("New width in pixels"),
            height: z.number().describe("New height in pixels"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            const success = await desktop.resizeWindow(args.windowId, args.width, args.height);
            return JSON.stringify({ success });
        },
    });

    // Screenshot and Application Control
    server.addTool({
        name: "desktop_screenshot",
        description: "Take a screenshot of the desktop",
        parameters: z.object({}),
        execute: async (_, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            const imageData = await desktop.takeScreenshot();
            // Convert Uint8Array to base64 for JSON serialization
            const base64 = Buffer.from(imageData).toString('base64');
            return JSON.stringify({
                format: 'png',
                data: base64,
                size: imageData.length
            });
        },
    });

    server.addTool({
        name: "desktop_launch_app",
        description: "Launch an application by its name",
        parameters: z.object({
            appName: z.string().describe("Application name to launch"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            await desktop.launchApplication(args.appName);
            return "Application launched";
        },
    });

    server.addTool({
        name: "desktop_wait",
        description: "Wait for specified number of seconds",
        parameters: z.object({
            seconds: z.number().describe("Number of seconds to wait"),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            await desktop.waitFor(args.seconds);
            return `Waited for ${args.seconds} seconds`;
        },
    });
}

// Export the server instance without auto-starting
export default server;

