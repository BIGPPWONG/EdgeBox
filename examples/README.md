# EdgeBox Quickstart Examples

Quickstart examples showing how to connect to EdgeBox's MCP server programmatically.

## Language Examples

| Language | Client Library | Directory |
|----------|---------------|-----------|
| **Python** | [FastMCP](https://gofastmcp.com/clients/client) | [`python/`](./python/) |
| **TypeScript** | [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) + [fastmcp](https://github.com/punkpeye/fastmcp) | [`typescript/`](./typescript/) |

## What's Covered

Each language directory includes three examples:

1. **`quickstart`** - Core capabilities: list tools, execute code, file operations, shell commands
2. **`multi_session`** - Running multiple tasks concurrently
3. **`desktop_automation`** - GUI/Computer Use: screenshots, mouse, keyboard, window management

## Prerequisites

1. **EdgeBox** is running and the MCP server is healthy
2. **Docker Desktop** is installed and running
3. For desktop automation examples, **GUI Tools** must be enabled in EdgeBox settings

## MCP Endpoint

By default, EdgeBox exposes its MCP server at:

```
http://localhost:8888/mcp
```
