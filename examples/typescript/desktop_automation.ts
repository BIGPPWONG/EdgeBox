/**
 * EdgeBox TypeScript Desktop Automation Example
 *
 * Demonstrates using EdgeBox's desktop (Computer Use) capabilities
 * to control the GUI environment - take screenshots, move the mouse,
 * type text, and interact with desktop applications.
 *
 * Prerequisites:
 *   1. EdgeBox is running with Docker Desktop
 *   2. GUI Tools are ENABLED in EdgeBox settings
 *   3. Install dependencies: npm install
 *
 * Usage:
 *   npx tsx desktop_automation.ts
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const EDGEBOX_MCP_URL = "http://localhost:8888/mcp";

async function createClient(): Promise<Client> {
  const client = new Client(
    { name: "edgebox-ts-desktop", version: "1.0.0" },
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

async function main() {
  const client = await createClient();

  try {
    console.log("=".repeat(60));
    console.log("EdgeBox Desktop Automation Example");
    console.log("=".repeat(60));

    // --------------------------------------------------------
    // 1. Take a screenshot of the desktop
    // --------------------------------------------------------
    console.log("\n1. Taking a screenshot of the desktop...");
    const screenshot = await client.callTool({
      name: "desktop_screenshot",
      arguments: {},
    });
    console.log("  Screenshot captured:", screenshot.content);

    // --------------------------------------------------------
    // 2. List all open windows
    // --------------------------------------------------------
    console.log("\n2. Listing open windows...");
    const windows = await client.callTool({
      name: "desktop_get_windows",
      arguments: {},
    });
    console.log("  Windows:", windows.content);

    // --------------------------------------------------------
    // 3. Launch an application
    // --------------------------------------------------------
    console.log("\n3. Launching a text editor...");
    const launch = await client.callTool({
      name: "desktop_launch_app",
      arguments: { app_name: "xterm" },
    });
    console.log("  Launch result:", launch.content);

    // Wait for the application to open
    await client.callTool({
      name: "desktop_wait",
      arguments: { ms: 2000 },
    });

    // --------------------------------------------------------
    // 4. Type text using the keyboard
    // --------------------------------------------------------
    console.log("\n4. Typing text...");
    const typed = await client.callTool({
      name: "desktop_keyboard_type",
      arguments: { text: "echo 'Hello from EdgeBox Desktop Automation!'" },
    });
    console.log("  Typed text:", typed.content);

    // Press Enter to execute
    const enter = await client.callTool({
      name: "desktop_keyboard_press",
      arguments: { key: "Return" },
    });
    console.log("  Pressed Enter:", enter.content);

    // Wait for command to execute
    await client.callTool({
      name: "desktop_wait",
      arguments: { ms: 1000 },
    });

    // --------------------------------------------------------
    // 5. Take a final screenshot to see results
    // --------------------------------------------------------
    console.log("\n5. Taking final screenshot...");
    const finalScreenshot = await client.callTool({
      name: "desktop_screenshot",
      arguments: {},
    });
    console.log("  Final screenshot captured:", finalScreenshot.content);

    // --------------------------------------------------------
    // 6. Mouse operations
    // --------------------------------------------------------
    console.log("\n6. Mouse operations...");
    const move = await client.callTool({
      name: "desktop_mouse_move",
      arguments: { x: 100, y: 100 },
    });
    console.log("  Moved mouse to (100, 100):", move.content);

    const click = await client.callTool({
      name: "desktop_mouse_click",
      arguments: { x: 100, y: 100, button: "left" },
    });
    console.log("  Clicked at (100, 100):", click.content);

    console.log(`\n${"=".repeat(60)}`);
    console.log("Desktop automation example completed!");
    console.log("=".repeat(60));
  } finally {
    await client.close();
  }
}

main().catch(console.error);
