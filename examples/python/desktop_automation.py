"""
EdgeBox Python Desktop Automation Example

Demonstrates using EdgeBox's desktop (Computer Use) capabilities
to control the GUI environment - take screenshots, move the mouse,
type text, and interact with desktop applications.

Prerequisites:
  1. EdgeBox is running with Docker Desktop
  2. GUI Tools are ENABLED in EdgeBox settings
  3. Install dependencies: pip install -r requirements.txt

Usage:
  python desktop_automation.py
"""

import asyncio
from fastmcp import Client


EDGEBOX_MCP_URL = "http://localhost:8888/mcp"


async def main():
    client = Client(EDGEBOX_MCP_URL)

    async with client:
        print("=" * 60)
        print("EdgeBox Desktop Automation Example")
        print("=" * 60)

        # --------------------------------------------------------
        # 1. Take a screenshot of the desktop
        # --------------------------------------------------------
        print("\n1. Taking a screenshot of the desktop...")
        result = await client.call_tool("desktop_screenshot", {})
        print(f"  Screenshot captured: {result}")

        # --------------------------------------------------------
        # 2. List all open windows
        # --------------------------------------------------------
        print("\n2. Listing open windows...")
        result = await client.call_tool("desktop_get_windows", {})
        print(f"  Windows: {result}")

        # --------------------------------------------------------
        # 3. Launch an application
        # --------------------------------------------------------
        print("\n3. Launching a text editor...")
        result = await client.call_tool(
            "desktop_launch_app", {"app_name": "xterm"}
        )
        print(f"  Launch result: {result}")

        # Wait for the application to open
        await client.call_tool("desktop_wait", {"ms": 2000})

        # --------------------------------------------------------
        # 4. Type text using the keyboard
        # --------------------------------------------------------
        print("\n4. Typing text...")
        result = await client.call_tool(
            "desktop_keyboard_type",
            {"text": "echo 'Hello from EdgeBox Desktop Automation!'"},
        )
        print(f"  Typed text: {result}")

        # Press Enter to execute
        result = await client.call_tool(
            "desktop_keyboard_press", {"key": "Return"}
        )
        print(f"  Pressed Enter: {result}")

        # Wait for command to execute
        await client.call_tool("desktop_wait", {"ms": 1000})

        # --------------------------------------------------------
        # 5. Take a final screenshot to see results
        # --------------------------------------------------------
        print("\n5. Taking final screenshot...")
        result = await client.call_tool("desktop_screenshot", {})
        print(f"  Final screenshot captured: {result}")

        # --------------------------------------------------------
        # 6. Mouse operations
        # --------------------------------------------------------
        print("\n6. Mouse operations...")
        result = await client.call_tool(
            "desktop_mouse_move", {"x": 100, "y": 100}
        )
        print(f"  Moved mouse to (100, 100): {result}")

        result = await client.call_tool(
            "desktop_mouse_click", {"x": 100, "y": 100, "button": "left"}
        )
        print(f"  Clicked at (100, 100): {result}")

        print("\n" + "=" * 60)
        print("Desktop automation example completed!")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
