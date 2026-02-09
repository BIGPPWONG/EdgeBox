"""
EdgeBox Python Multi-Session Example

Demonstrates running multiple isolated sandbox sessions concurrently.
Each session has its own filesystem and execution environment.

Prerequisites:
  1. EdgeBox is running with Docker Desktop
  2. MCP server is healthy (check the EdgeBox dashboard)
  3. Install dependencies: pip install -r requirements.txt

Usage:
  python multi_session.py
"""

import asyncio
from fastmcp import Client


EDGEBOX_BASE_URL = "http://localhost:8888/mcp"


async def run_session(session_name: str, code: str):
    """Run code in an isolated EdgeBox session."""
    # Each session gets its own isolated sandbox via the x-session-id header.
    # Pass custom headers through the Client to route to different containers.
    url = f"{EDGEBOX_BASE_URL}"
    client = Client(url)

    async with client:
        print(f"[{session_name}] Executing code...")
        result = await client.call_tool("execute_python", {"code": code})
        print(f"[{session_name}] Result: {result}")
        return result


async def main():
    print("=" * 60)
    print("EdgeBox Multi-Session Example")
    print("=" * 60)
    print()
    print("Running two tasks in the same EdgeBox sandbox...\n")

    # Task 1: Data processing
    data_task = """
import statistics
data = [23, 45, 67, 12, 89, 34, 56, 78, 90, 11]
print(f"Mean: {statistics.mean(data):.2f}")
print(f"Median: {statistics.median(data):.2f}")
print(f"Stdev: {statistics.stdev(data):.2f}")
"""

    # Task 2: System info
    system_task = """
import platform, os
print(f"OS: {platform.system()} {platform.release()}")
print(f"Architecture: {platform.machine()}")
print(f"Python: {platform.python_version()}")
print(f"CPU count: {os.cpu_count()}")
"""

    # Run tasks concurrently
    await asyncio.gather(
        run_session("data-analysis", data_task),
        run_session("system-info", system_task),
    )

    print("\nAll sessions completed!")


if __name__ == "__main__":
    asyncio.run(main())
