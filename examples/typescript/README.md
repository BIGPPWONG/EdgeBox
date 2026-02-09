# EdgeBox TypeScript Quickstart Examples

Connect to EdgeBox's MCP server from TypeScript using the [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) client (as referenced by [fastmcp](https://github.com/punkpeye/fastmcp)).

## Prerequisites

1. **EdgeBox** is running and the MCP server is healthy (check the dashboard)
2. **Docker Desktop** is installed and running
3. **Node.js 18+**

## Setup

```bash
cd examples/typescript
npm install
```

## Examples

### `quickstart.ts` - Core Capabilities

Demonstrates the main EdgeBox features:
- Listing available MCP tools
- Executing Python and TypeScript code
- Running shell commands
- File operations (write, read, list)
- Multi-step data analysis pipeline

```bash
npx tsx quickstart.ts
```

### `multi_session.ts` - Concurrent Sessions

Shows how to run multiple tasks in the EdgeBox sandbox concurrently.

```bash
npx tsx multi_session.ts
```

### `desktop_automation.ts` - Computer Use (GUI)

Demonstrates desktop automation capabilities:
- Taking screenshots
- Launching applications
- Keyboard and mouse control
- Window management

> **Note**: Requires GUI Tools to be enabled in EdgeBox settings.

```bash
npx tsx desktop_automation.ts
```

## MCP Endpoint

By default, EdgeBox exposes its MCP server at:

```
http://localhost:8888/mcp
```

The client automatically tries Streamable HTTP transport first, then falls back to SSE for compatibility. You can change the port in EdgeBox settings.
