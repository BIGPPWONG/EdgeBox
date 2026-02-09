"""
EdgeBox Python Quickstart - Using FastMCP Client

This example demonstrates how to connect to EdgeBox's MCP server
and use its sandbox capabilities (code execution, file operations,
shell commands, and desktop control) from Python.

Prerequisites:
  1. EdgeBox is running with Docker Desktop
  2. MCP server is healthy (check the EdgeBox dashboard)
  3. Install dependencies: pip install -r requirements.txt

Usage:
  python quickstart.py
"""

import asyncio
from fastmcp import Client


EDGEBOX_MCP_URL = "http://localhost:8888/mcp"


async def main():
    client = Client(EDGEBOX_MCP_URL)

    async with client:
        # --------------------------------------------------------
        # 1. List available tools
        # --------------------------------------------------------
        print("=" * 60)
        print("1. Listing available MCP tools")
        print("=" * 60)
        tools = await client.list_tools()
        for tool in tools:
            print(f"  - {tool.name}: {tool.description}")

        # --------------------------------------------------------
        # 2. Execute Python code
        # --------------------------------------------------------
        print("\n" + "=" * 60)
        print("2. Executing Python code")
        print("=" * 60)
        result = await client.call_tool(
            "execute_python",
            {"code": "import sys; print(f'Hello from EdgeBox! Python {sys.version}')"},
        )
        print(f"  Result: {result}")

        # --------------------------------------------------------
        # 3. Execute Bash commands
        # --------------------------------------------------------
        print("\n" + "=" * 60)
        print("3. Running a shell command")
        print("=" * 60)
        result = await client.call_tool(
            "shell_run",
            {"command": "uname -a && echo '---' && whoami"},
        )
        print(f"  Result: {result}")

        # --------------------------------------------------------
        # 4. File operations - write, read, list
        # --------------------------------------------------------
        print("\n" + "=" * 60)
        print("4. File operations")
        print("=" * 60)

        # Write a file
        await client.call_tool(
            "fs_write",
            {"path": "/tmp/hello.txt", "content": "Hello from EdgeBox Python client!"},
        )
        print("  Written /tmp/hello.txt")

        # Read the file back
        result = await client.call_tool("fs_read", {"path": "/tmp/hello.txt"})
        print(f"  Read back: {result}")

        # List directory
        result = await client.call_tool("fs_list", {"path": "/tmp"})
        print(f"  /tmp contents: {result}")

        # --------------------------------------------------------
        # 5. Execute TypeScript code
        # --------------------------------------------------------
        print("\n" + "=" * 60)
        print("5. Executing TypeScript code")
        print("=" * 60)
        result = await client.call_tool(
            "execute_typescript",
            {"code": "console.log(`Node.js version: ${process.version}`)"},
        )
        print(f"  Result: {result}")

        # --------------------------------------------------------
        # 6. Multi-step workflow: data analysis pipeline
        # --------------------------------------------------------
        print("\n" + "=" * 60)
        print("6. Multi-step workflow: data analysis pipeline")
        print("=" * 60)
        pipeline_code = """
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
"""
        result = await client.call_tool("execute_python", {"code": pipeline_code})
        print(f"  Result: {result}")

        print("\n" + "=" * 60)
        print("All examples completed!")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
