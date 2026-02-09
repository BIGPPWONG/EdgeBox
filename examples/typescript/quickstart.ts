/**
 * EdgeBox TypeScript Quickstart
 *
 * Demonstrates how to connect to EdgeBox's MCP server and use its
 * sandbox capabilities (code execution, file operations, shell commands)
 * from TypeScript using the MCP SDK client (as referenced by fastmcp).
 *
 * Prerequisites:
 *   1. EdgeBox is running with Docker Desktop
 *   2. MCP server is healthy (check the EdgeBox dashboard)
 *   3. Install dependencies: npm install
 *
 * Usage:
 *   npx tsx quickstart.ts
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const EDGEBOX_MCP_URL = "http://localhost:8888/mcp";

async function createClient(): Promise<Client> {
  const client = new Client(
    { name: "edgebox-ts-quickstart", version: "1.0.0" },
    { capabilities: {} }
  );

  // Try Streamable HTTP first, fall back to SSE for compatibility
  try {
    const transport = new StreamableHTTPClientTransport(
      new URL(EDGEBOX_MCP_URL)
    );
    await client.connect(transport);
  } catch {
    console.log("Streamable HTTP not available, falling back to SSE...");
    const sseTransport = new SSEClientTransport(
      new URL("http://localhost:8888/sse")
    );
    await client.connect(sseTransport);
  }

  return client;
}

function printSection(num: number, title: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${num}. ${title}`);
  console.log("=".repeat(60));
}

async function main() {
  const client = await createClient();

  try {
    // --------------------------------------------------------
    // 1. List available tools
    // --------------------------------------------------------
    printSection(1, "Listing available MCP tools");
    const { tools } = await client.listTools();
    for (const tool of tools) {
      console.log(`  - ${tool.name}: ${tool.description}`);
    }

    // --------------------------------------------------------
    // 2. Execute Python code
    // --------------------------------------------------------
    printSection(2, "Executing Python code");
    const pythonResult = await client.callTool({
      name: "execute_python",
      arguments: {
        code: "import sys; print(f'Hello from EdgeBox! Python {sys.version}')",
      },
    });
    console.log("  Result:", pythonResult.content);

    // --------------------------------------------------------
    // 3. Run a shell command
    // --------------------------------------------------------
    printSection(3, "Running a shell command");
    const shellResult = await client.callTool({
      name: "shell_run",
      arguments: { command: "uname -a && echo '---' && whoami" },
    });
    console.log("  Result:", shellResult.content);

    // --------------------------------------------------------
    // 4. File operations - write, read, list
    // --------------------------------------------------------
    printSection(4, "File operations");

    // Write a file
    await client.callTool({
      name: "fs_write",
      arguments: {
        path: "/tmp/hello.txt",
        content: "Hello from EdgeBox TypeScript client!",
      },
    });
    console.log("  Written /tmp/hello.txt");

    // Read the file back
    const readResult = await client.callTool({
      name: "fs_read",
      arguments: { path: "/tmp/hello.txt" },
    });
    console.log("  Read back:", readResult.content);

    // List directory
    const listResult = await client.callTool({
      name: "fs_list",
      arguments: { path: "/tmp" },
    });
    console.log("  /tmp contents:", listResult.content);

    // --------------------------------------------------------
    // 5. Execute TypeScript code in the sandbox
    // --------------------------------------------------------
    printSection(5, "Executing TypeScript code in sandbox");
    const tsResult = await client.callTool({
      name: "execute_typescript",
      arguments: {
        code: "console.log(`Node.js version: ${process.version}`)",
      },
    });
    console.log("  Result:", tsResult.content);

    // --------------------------------------------------------
    // 6. Multi-step workflow: data analysis pipeline
    // --------------------------------------------------------
    printSection(6, "Multi-step workflow: data analysis pipeline");
    const pipelineCode = `
import json

data = [
    {"name": "Alice", "score": 85},
    {"name": "Bob", "score": 92},
    {"name": "Charlie", "score": 78},
    {"name": "Diana", "score": 95},
    {"name": "Eve", "score": 88},
]

avg = sum(d["score"] for d in data) / len(data)
top = max(data, key=lambda d: d["score"])
bottom = min(data, key=lambda d: d["score"])

result = {
    "average_score": avg,
    "top_performer": top["name"],
    "lowest_performer": bottom["name"],
    "total_students": len(data),
}
print(json.dumps(result, indent=2))
`;
    const pipelineResult = await client.callTool({
      name: "execute_python",
      arguments: { code: pipelineCode },
    });
    console.log("  Result:", pipelineResult.content);

    console.log(`\n${"=".repeat(60)}`);
    console.log("All examples completed!");
    console.log("=".repeat(60));
  } finally {
    await client.close();
  }
}

main().catch(console.error);
