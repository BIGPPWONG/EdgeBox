import { FastMCP } from "fastmcp";
import { z } from "zod";
import 'dotenv/config';
import { Sandbox } from '@e2b/code-interpreter';

const server = new FastMCP({
    name: "E2b Sandbox MCP Server",
    version: "1.0.0",
});

let sandbox: Sandbox | null = null;

async function ensureSandbox() {
    if (!sandbox) {
        sandbox = await Sandbox.create({
            domain: "http://192.168.4.250:49999", // Default domain
            debug: true,
            apiKey: "place-your-api-key-here", // You can set this via environment variable
        });
    }
    return sandbox;
}

// Code execution tools (stateless - each execution is independent)
server.addTool({
    name: "execute_python",
    description: "Execute Python code in isolated environment (stateless - suitable for calculations and analysis)",
    parameters: z.object({
        code: z.string().describe("Python code to execute"),
    }),
    execute: async (args) => {
        const sbx = await ensureSandbox();
        const result = await sbx.runCode(args.code, { language: 'python' });
        return JSON.stringify({ logs: result.logs, error: result.error });
    },
});

server.addTool({
    name: "execute_typescript",
    description: "Execute TypeScript/JavaScript code in isolated environment (stateless - suitable for calculations and analysis)",
    parameters: z.object({
        code: z.string().describe("TypeScript/JavaScript code to execute"),
    }),
    execute: async (args) => {
        const sbx = await ensureSandbox();
        const result = await sbx.runCode(args.code, { language: 'ts' });
        return JSON.stringify({ logs: result.logs, error: result.error });
    },
});

server.addTool({
    name: "execute_r",
    description: "Execute R code in isolated environment (stateless - suitable for statistical analysis)",
    parameters: z.object({
        code: z.string().describe("R code to execute"),
    }),
    execute: async (args) => {
        const sbx = await ensureSandbox();
        const result = await sbx.runCode(args.code, { language: 'r' });
        return JSON.stringify({ logs: result.logs, error: result.error });
    },
});

server.addTool({
    name: "execute_java",
    description: "Execute Java code in isolated environment (stateless - suitable for calculations and analysis)",
    parameters: z.object({
        code: z.string().describe("Java code to execute"),
    }),
    execute: async (args) => {
        const sbx = await ensureSandbox();
        const result = await sbx.runCode(args.code, { language: 'java' });
        return JSON.stringify({ logs: result.logs, error: result.error });
    },
});

server.addTool({
    name: "execute_bash",
    description: "Execute Bash code in isolated environment (stateless - suitable for script execution and analysis)",
    parameters: z.object({
        code: z.string().describe("Bash code to execute"),
    }),
    execute: async (args) => {
        const sbx = await ensureSandbox();
        const result = await sbx.runCode(args.code, { language: 'bash' });
        return JSON.stringify({ logs: result.logs, error: result.error });
    },
});

// System shell commands (stateful - persistent environment)
server.addTool({
    name: "shell_run",
    description: "Run a shell command in the sandbox Linux environment (stateful - can install software, start services)",
    parameters: z.object({
        command: z.string().describe("Command to execute"),
    }),
    execute: async (args) => {
        const sbx = await ensureSandbox();
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
    execute: async (args) => {
        const sbx = await ensureSandbox();
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
    execute: async (args) => {
        const sbx = await ensureSandbox();
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
    execute: async (args) => {
        const sbx = await ensureSandbox();
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
    execute: async (args) => {
        const sbx = await ensureSandbox();
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
    execute: async (args) => {
        const sbx = await ensureSandbox();
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
    execute: async (args) => {
        const sbx = await ensureSandbox();
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

// server.start({
//     transportType: "stdio",
// });
server.start({
    transportType: "httpStream",
    httpStream: {
        port: 8888,
    },
});