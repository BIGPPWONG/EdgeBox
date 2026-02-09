/**
 * EdgeBox TypeScript Multi-Session Example
 *
 * Demonstrates running multiple tasks in the EdgeBox sandbox concurrently.
 *
 * Prerequisites:
 *   1. EdgeBox is running with Docker Desktop
 *   2. MCP server is healthy (check the EdgeBox dashboard)
 *   3. Install dependencies: npm install
 *
 * Usage:
 *   npx tsx multi_session.ts
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const EDGEBOX_MCP_URL = "http://localhost:8888/mcp";

async function createClient(): Promise<Client> {
  const client = new Client(
    { name: "edgebox-ts-multi-session", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    const transport = new StreamableHTTPClientTransport(
      new URL(EDGEBOX_MCP_URL)
    );
    await client.connect(transport);
  } catch {
    const sseTransport = new SSEClientTransport(
      new URL("http://localhost:8888/sse")
    );
    await client.connect(sseTransport);
  }

  return client;
}

async function runTask(taskName: string, code: string) {
  const client = await createClient();

  try {
    console.log(`[${taskName}] Executing code...`);
    const result = await client.callTool({
      name: "execute_python",
      arguments: { code },
    });
    console.log(`[${taskName}] Result:`, result.content);
    return result;
  } finally {
    await client.close();
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("EdgeBox Multi-Session Example");
  console.log("=".repeat(60));
  console.log("\nRunning two tasks concurrently...\n");

  // Task 1: Data processing
  const dataTask = `
import statistics
data = [23, 45, 67, 12, 89, 34, 56, 78, 90, 11]
print(f"Mean: {statistics.mean(data):.2f}")
print(f"Median: {statistics.median(data):.2f}")
print(f"Stdev: {statistics.stdev(data):.2f}")
`;

  // Task 2: System info
  const systemTask = `
import platform, os
print(f"OS: {platform.system()} {platform.release()}")
print(f"Architecture: {platform.machine()}")
print(f"Python: {platform.python_version()}")
print(f"CPU count: {os.cpu_count()}")
`;

  // Run tasks concurrently
  await Promise.all([
    runTask("data-analysis", dataTask),
    runTask("system-info", systemTask),
  ]);

  console.log("\nAll sessions completed!");
}

main().catch(console.error);
