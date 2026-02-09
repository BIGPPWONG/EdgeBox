# EdgeBox Python Quickstart Examples

Connect to EdgeBox's MCP server from Python using the [FastMCP](https://gofastmcp.com/clients/client) client.

## Prerequisites

1. **EdgeBox** is running and the MCP server is healthy (check the dashboard)
2. **Docker Desktop** is installed and running
3. **Python 3.10+**

## Setup

```bash
cd examples/python
pip install -r requirements.txt
```

## Examples

### `quickstart.py` - Core Capabilities

Demonstrates the main EdgeBox features:
- Listing available MCP tools
- Executing Python and TypeScript code
- Running shell commands
- File operations (write, read, list)
- Multi-step data analysis pipeline

```bash
python quickstart.py
```

### `multi_session.py` - Concurrent Sessions

Shows how to run multiple tasks in the EdgeBox sandbox concurrently.

```bash
python multi_session.py
```

### `desktop_automation.py` - Computer Use (GUI)

Demonstrates desktop automation capabilities:
- Taking screenshots
- Launching applications
- Keyboard and mouse control
- Window management

> **Note**: Requires GUI Tools to be enabled in EdgeBox settings.

```bash
python desktop_automation.py
```

## MCP Endpoint

By default, EdgeBox exposes its MCP server at:

```
http://localhost:8888/mcp
```

You can change the port in EdgeBox settings.
