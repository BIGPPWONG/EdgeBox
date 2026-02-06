import { FastMCP } from "fastmcp";
import { imageContent } from "fastmcp";
import { z } from "zod";
import 'dotenv/config';
import { Sandbox } from '@e2b/code-interpreter';
import { TcpForwarder } from '../tcp-forwarder';
import { DockerManager } from '../docker-manager';
import { SandboxManager } from '../sandbox-manager';
import { DesktopController } from './DesktopController';
import { SettingsManager } from "../settings-manager";
import { createConnectTransport } from '@connectrpc/connect-web';
import createRpcLogger from '@e2b/code-interpreter';

// Monkey patch Sandbox initialization to fix EnvdApiClient headers issue
function patchSandboxInitialization() {
    try {
        // We already have Sandbox imported directly, so we patch that
        const OriginalSandbox = Sandbox;
        const OriginalPrototype = Sandbox.prototype;

        // Create patched wrapper for Sandbox.create
        const originalCreate = OriginalSandbox.create;

        (OriginalSandbox as any).create = async function create(...args: any[]) {
            const sandbox = await originalCreate.apply(this, args);

            // Apply patch after creation
            if (sandbox && sandbox.connectionConfig?.headers && sandbox.envdApi) {
                console.log(`[Sandbox Patch] Post-creation patching for`, args);

                const OriginalEnvdApiClient = sandbox.envdApi.constructor;
                const sessionHeaders = sandbox.connectionConfig.headers;

                sandbox.envdApi = new OriginalEnvdApiClient(
                    {
                        apiUrl: sandbox.envdApiUrl,
                        logger: (args[1] || args[0])?.logger,
                        accessToken: sandbox.envdAccessToken,
                        headers: {
                            ...(sessionHeaders || {}),
                            ...(sandbox.envdAccessToken ? { "X-Access-Token": sandbox.envdAccessToken } : {})
                        }
                    },
                    { version: (args[1] || args[0])?.envdVersion }
                );

                // Patch filesystem module with new envdApi - recreate RPC transport properly
                if (sandbox.files && sandbox.envdApi) {
                    console.log(`[Sandbox Patch] Post-creation patching filesystem module`);

                    try {
                        // Access sandbox private properties - assuming they exist from the original constructor
                        const envdApiUrl = (sandbox as any)['envdApiUrl'];
                        const connectionConfig = (sandbox as any)['connectionConfig'];
                        const envdAccessToken = (sandbox as any)['envdAccessToken'];
                        const logger = (sandbox as any)['logger'];

                        if (!envdApiUrl || !connectionConfig) {
                            throw new Error('Sandbox properties not accessible for filesystem patching');
                        }

                        // Recreate RPC transport with complete configuration
                        const rpcTransport = createConnectTransport({
                            baseUrl: envdApiUrl,
                            useBinaryFormat: false,
                            interceptors: logger ? [createRpcLogger(logger)] : undefined,
                            fetch: (url: string, options?: any) => {
                                const headers = new Headers(connectionConfig.headers);

                                if (options?.headers) {
                                    new Headers(options.headers).forEach((value, key) =>
                                        headers.append(key, value)
                                    );
                                }

                                if (envdAccessToken) {
                                    headers.append('X-Access-Token', envdAccessToken);
                                }

                                return fetch(url, {
                                    ...options,
                                    headers: headers,
                                    redirect: 'follow',
                                });
                            },
                        });

                        const OriginalFilesystem = sandbox.files.constructor;
                        sandbox.files = new OriginalFilesystem(
                            rpcTransport,
                            sandbox.envdApi,
                            connectionConfig
                        );

                        console.log(`[Sandbox Patch] Post-creation: Successfully recreated filesystem module with new transport`);
                    } catch (error) {
                        console.error('[Sandbox Patch] Failed to patch filesystem module:', error);
                        // Continue without patching filesystem - other functionality should still work
                    }
                }
            }

            return sandbox;
        };

        console.log('[Sandbox Patch] Successfully installed initialization patch');
    } catch (error) {
        console.error('Failed to setup sandbox initialization patch:', error);
    }
}

// Apply patch as soon as this module is imported
patchSandboxInitialization();

// Settings manager will be injected from main process
let settingsManager: SettingsManager | null = null;

export function setSettingsManager(manager: SettingsManager) {
    settingsManager = manager;
}

// Global setting to control GUI tools loading
function isGUIToolsEnabled(): boolean {
    if (!settingsManager) {
        console.warn('Settings manager not available');
        return false; // Default to disabled if no settings manager
    }
    console.log('MCP GUI tools enabled:', settingsManager.getSettings().enableGUITools);
    return settingsManager.getSettings().enableGUITools;
}

// Create a global sandbox manager instance for main process
const sandboxManagerForMain = new SandboxManager(new DockerManager());

// Function to get the current global sandbox manager
function getSandboxManager(): typeof sandboxManagerForMain | undefined {
    return sandboxManagerForMain;
}

// Create a global TCP forwarder instance for main process      
const tcpForwarder = new TcpForwarder(getSandboxManager()!);
export function createServer(): FastMCP {
    const server = new FastMCP({
        name: "EdgeBox MCP Server",
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
    addAllTools(server);
    return server
}

// Export function for manual sandbox cleanup
export async function cleanupSandbox(sessionId: string): Promise<boolean> {
    const manager = getSandboxManager();
    if (!manager) return false;

    const sandboxId = manager.getSessionSandboxId(sessionId);
    if (!sandboxId) return false;

    await manager.endSession(sessionId);
    return true;
}

// Export function to get all active sessions
export function getActiveSessions(): Array<{ sessionId: string, sandboxId: string }> {
    const manager = getSandboxManager();
    if (!manager) return [];
    return manager.getAllSessions().map(s => ({
        sessionId: s.sessionId,
        sandboxId: s.sandboxId,
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

    const manager = getSandboxManager();
    if (!manager) {
        throw new Error('Sandbox manager not available');
    }

    // Single source of truth: SandboxManager owns all session-to-sandbox mappings
    const container = await manager.getSandboxForSession(sessionIdStr);
    if (!container) {
        await manager.createSandboxForSession(sessionIdStr);
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
function addCoreTools(server: ReturnType<typeof createServer>) {
    // Code execution tools (stateless - each execution is independent)
    server.addTool({
        name: "execute_python",
        description: "Execute Python code in isolated environment (stateless - suitable for calculations and analysis)",
        parameters: z.object({
            code: z.string().describe("Python code to execute"),
        }),
        execute: async (args, { session }) => {
            const sbx = await ensureSandbox(session?.id);
            const result = await sbx.runCode(
                args.code,
                { language: 'python', envs: { 'x-session-id': (session?.id as string) || 'default_session' } }
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
            const result = await sbx.runCode(args.code, { language: 'ts', envs: { 'x-session-id': (session?.id as string) || 'default_session' } });
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
            const result = await sbx.runCode(args.code, { language: 'r', envs: { 'x-session-id': (session?.id as string) || 'default_session' } });
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
            const result = await sbx.runCode(args.code, { language: 'java', envs: { 'x-session-id': (session?.id as string) || 'default_session' } });
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
            const result = await sbx.runCode(args.code, { language: 'bash', envs: { 'x-session-id': (session?.id as string) || 'default_session' } });
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
}
function addGUITools(server: FastMCP) {

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
        description: "Press a specific key using xdotool key syntax",
        parameters: z.object({
            key: z.string().describe("Key to press using xdotool key syntax. Common keys: 'Return', 'Escape', 'Tab', 'space', 'BackSpace', 'Delete', 'Left', 'Right', 'Up', 'Down', 'F1'-'F12', 'Page_Up', 'Page_Down', 'Home', 'End'. Single characters: 'a', '1', '!'. For a-zA-Z and 0-9, you can use the character directly."),
        }),
        execute: async (args, { session }) => {
            const desktop = await ensureDesktopController(session?.id);
            await desktop.keyboardPress(args.key);
            return "Key pressed";
        },
    });

    server.addTool({
        name: "desktop_keyboard_combo",
        description: "Press key combination/shortcut using xdotool key syntax",
        parameters: z.object({
            keys: z.array(z.string()).describe("Array of keys for combination using xdotool key syntax (e.g., ['ctrl', 'c'], ['alt', 'Tab'], ['shift', 'F1']). Each key should use xdotool key format: 'ctrl', 'alt', 'shift', 'super' for modifiers, plus any valid key from desktop_keyboard_press"),
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
            console.log('Taking screenshot...');
            const imageData = await desktop.takeScreenshot();
            console.log('Screenshot taken');
            console.log(`Screenshot size: ${imageData.length} bytes`);
            // Convert Uint8Array to base64 for JSON serialization
            // const base64 = Buffer.from(imageData).toString('base64');
            // return JSON.stringify({
            //     format: 'png',
            //     data: base64,
            //     size: imageData.length
            // });
            return imageContent({
                buffer: Buffer.from(imageData, "base64"),
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

function addContainerLifecycleTools(server: FastMCP) {
    server.addTool({
        name: "container_list",
        description: "List all sandbox containers and their status, including session mappings",
        parameters: z.object({}),
        execute: async () => {
            const manager = getSandboxManager();
            if (!manager) {
                throw new Error('Sandbox manager not available');
            }

            const sandboxes = manager.getAllSandboxes();
            const containers = manager.getAllContainers();
            const sessions = manager.getAllSessions();

            return JSON.stringify({
                sandboxes: sandboxes.map(s => ({
                    id: s.id,
                    name: s.name,
                    status: s.status,
                    dockerImage: s.dockerImage,
                    createdAt: s.createdAt,
                    lastUsed: s.lastUsed,
                    timeout: s.timeout,
                    resources: s.resources,
                })),
                containers: containers.map(c => ({
                    id: c.id,
                    name: c.name,
                    status: c.status,
                    ports: c.ports,
                    domain: c.domain,
                })),
                sessions: sessions.map(s => ({
                    sessionId: s.sessionId,
                    sandboxId: s.sandboxId,
                    createdAt: s.createdAt,
                    lastActivity: s.lastActivity,
                })),
            });
        },
    });

    server.addTool({
        name: "container_create",
        description: "Create and start a new sandbox container. Returns the sandbox ID for use with other container operations.",
        parameters: z.object({
            name: z.string().optional().describe("Custom name for the sandbox (default: auto-generated)"),
            timeout: z.number().optional().describe("Timeout in minutes before auto-shutdown (default: 30)"),
        }),
        execute: async (args, { session }) => {
            const manager = getSandboxManager();
            if (!manager) {
                throw new Error('Sandbox manager not available');
            }

            const sessionId = typeof session?.id === 'string' ? session.id : 'default_session';
            const sandboxName = args.name || `MCP_Sandbox_${Date.now()}`;
            const defaultImage = settingsManager?.getSettings()?.defaultDockerImage || 'e2b-sandbox:latest';
            const timeout = args.timeout || 30;

            // Get resource settings
            const cpuCores = settingsManager?.getSettings()?.dockerCpuCores || 1;
            const memoryGB = settingsManager?.getSettings()?.dockerMemoryGB || 1;

            const config = await manager.createSandbox(sandboxName, defaultImage, timeout);

            // Apply resource limits from settings
            config.resources = { cpuCores, memoryGB };

            await manager.startSandbox(config.id);

            // Register session in SandboxManager (single source of truth)
            manager.registerSessionForSandbox(sessionId, config.id);

            return JSON.stringify({
                success: true,
                sandboxId: config.id,
                name: sandboxName,
                status: 'running',
                timeout,
                message: `Sandbox container '${sandboxName}' created and started successfully`,
            });
        },
    });

    server.addTool({
        name: "container_stop",
        description: "Stop a running sandbox container by its ID. The container can be restarted later.",
        parameters: z.object({
            sandbox_id: z.string().describe("The sandbox ID to stop (from container_list or container_create)"),
        }),
        execute: async (args) => {
            const manager = getSandboxManager();
            if (!manager) {
                throw new Error('Sandbox manager not available');
            }

            const config = manager.getSandboxConfig(args.sandbox_id);
            if (!config) {
                return JSON.stringify({
                    success: false,
                    error: `Sandbox '${args.sandbox_id}' not found`,
                });
            }

            if (config.status === 'stopped') {
                return JSON.stringify({
                    success: false,
                    error: `Sandbox '${args.sandbox_id}' is already stopped`,
                });
            }

            await manager.stopSandbox(args.sandbox_id);

            return JSON.stringify({
                success: true,
                sandboxId: args.sandbox_id,
                status: 'stopped',
                message: `Sandbox container '${args.sandbox_id}' stopped successfully`,
            });
        },
    });

    server.addTool({
        name: "container_restart",
        description: "Restart a sandbox container by its ID. Stops the container if running, then starts it again.",
        parameters: z.object({
            sandbox_id: z.string().describe("The sandbox ID to restart (from container_list or container_create)"),
        }),
        execute: async (args, { session }) => {
            const manager = getSandboxManager();
            if (!manager) {
                throw new Error('Sandbox manager not available');
            }

            const config = manager.getSandboxConfig(args.sandbox_id);
            if (!config) {
                return JSON.stringify({
                    success: false,
                    error: `Sandbox '${args.sandbox_id}' not found`,
                });
            }

            // Stop if running
            if (config.status === 'running' || config.status === 'starting') {
                await manager.stopSandbox(args.sandbox_id);
            }

            // Re-create and start a new sandbox for this session
            const sessionId = typeof session?.id === 'string' ? session.id : 'default_session';
            const newSandboxId = await manager.createSandboxForSession(sessionId);

            return JSON.stringify({
                success: true,
                oldSandboxId: args.sandbox_id,
                newSandboxId,
                status: 'running',
                message: `Sandbox container restarted successfully. New sandbox ID: ${newSandboxId}`,
            });
        },
    });

    server.addTool({
        name: "container_delete",
        description: "Delete a sandbox container permanently. Stops the container if running and removes all associated data.",
        parameters: z.object({
            sandbox_id: z.string().describe("The sandbox ID to delete (from container_list or container_create)"),
        }),
        execute: async (args) => {
            const manager = getSandboxManager();
            if (!manager) {
                throw new Error('Sandbox manager not available');
            }

            const config = manager.getSandboxConfig(args.sandbox_id);
            if (!config) {
                return JSON.stringify({
                    success: false,
                    error: `Sandbox '${args.sandbox_id}' not found`,
                });
            }

            await manager.deleteSandbox(args.sandbox_id);

            return JSON.stringify({
                success: true,
                sandboxId: args.sandbox_id,
                message: `Sandbox container '${args.sandbox_id}' deleted successfully`,
            });
        },
    });
}

function addAllTools(serverInstance: FastMCP) {
    // Core tools (always available)
    addCoreTools(serverInstance);

    // Container lifecycle tools (always available)
    addContainerLifecycleTools(serverInstance);

    // GUI tools (conditional)
    if (isGUIToolsEnabled()) {
        console.log('Loading GUI tools...');
        addGUITools(serverInstance);
    } else {
        console.log('GUI tools disabled, skipping...');
    }
}
// Export the server instance without auto-starting
// export default server;

