# EdgeBox - AI 智能体的本地桌面沙箱

[![Release](https://github.com/BIGPPWONG/EdgeBox/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/BIGPPWONG/EdgeBox/actions/workflows/release.yml)

<div align="center">
  <img src="assets/icon/icon.png" alt="EdgeBox Logo" width="128" height="128" />
  <br/>
  <strong>一个功能齐全、支持图形界面的本地大语言模型智能体沙箱，完全支持 MCP 协议。</strong>
  <br/>
  <p>为您的大语言模型（LLM）赋予真正的"计算机使用"能力。</p>
</div>

---

**EdgeBox** 是一个强大的桌面应用程序，它将 E2B (e2b.dev) 基于云的沙箱功能带到您的本地机器。基于开源的 E2B 代码解释器项目，EdgeBox 将沙箱转变为本地运行的环境，让您完全控制 AI 智能体的开发和执行环境。

**EdgeBox 的独特之处**：虽然大多数开源沙箱项目只提供终端/命令行界面，但 EdgeBox 同时提供了**命令行 Shell** 和**完整的图形化（GUI）桌面环境**（通过集成的 VNC 查看器）。这意味着您的 LLM 智能体不再只是代码执行器，而是一个能够操作浏览器、使用 VS Code 和与桌面应用程序交互的数字工作者，就像人类一样。

<div align="center">
  <img src="assets/screenshots/main-app.png" alt="EdgeBox 主应用程序" width="800" />
  <p><em>EdgeBox 主应用程序仪表板</em></p>
</div>
<div align="center">
  <img src="assets/screenshots/computer-use.gif" alt="计算机使用演示" width="800" />
  <p><em>计算机使用演示：输入"google.com"，按回车，并截取屏幕截图 - 展示计算机使用能力。</em></p>
</div>

## 🤔 为什么选择 EdgeBox？

| 功能特性     |           EdgeBox            | 其他开源沙箱（如 `codebox`） |
| :----------- | :--------------------------: | :--------------------------: |
| **环境**     |          🖥️ **本地**          |            🖥️ 本地            |
| **界面**     |          GUI + CLI           |            仅 CLI            |
| **能力**     | **计算机使用** 和 代码解释器 |          代码解释器          |
| **数据隐私** |       ✅ **100% 私有**        |         ✅ 100% 私有          |
| **延迟**     |         ⚡️ **接近零**         |           ⚡️ 接近零           |
| **集成**     |        ✅ **MCP 兼容**        |           专有 API           |

## 📖 目录

- [EdgeBox - AI 智能体的本地桌面沙箱](#edgebox---ai-智能体的本地桌面沙箱)
  - [🤔 为什么选择 EdgeBox？](#-为什么选择-edgebox)
  - [📖 目录](#-目录)
  - [🚀 核心功能](#-核心功能)
    - [1. 💻 完整桌面环境（计算机使用）](#1--完整桌面环境计算机使用)
    - [2. 🐚 完整的代码解释器 \& Shell](#2--完整的代码解释器--shell)
    - [3. 🔗 无缝的 LLM 智能体集成（通过 MCP）](#3--无缝的-llm-智能体集成通过-mcp)
  - [🛠️ 可用的 MCP 工具](#️-可用的-mcp-工具)
    - [📟 核心工具（CLI 模式 - 始终可用）](#-核心工具cli-模式---始终可用)
    - [🖱️ 桌面工具（GUI 模式 - 启用 GUI 工具时可用）](#️-桌面工具gui-模式---启用-gui-工具时可用)
  - [🏗️ 架构](#️-架构)
  - [📋 前置要求](#-前置要求)
  - [🛠️ 安装](#️-安装)
  - [🎯 使用方法](#-使用方法)
    - [快速开始](#快速开始)
    - [MCP 客户端配置](#mcp-客户端配置)
    - [指导您的 LLM 智能体](#指导您的-llm-智能体)
    - [多会话并发沙箱](#多会话并发沙箱)
    - [编程访问（SDK 示例）](#编程访问sdk-示例)
  - [🔐 安全性](#-安全性)
  - [📄 许可证](#-许可证)
  - [🙏 致谢](#-致谢)
  - [🔗 相关项目](#-相关项目)
  - [📞 支持](#-支持)

## 🚀 核心功能

EdgeBox 通过 MCP 协议暴露其所有功能，为您的 LLM 智能体组织为三个核心模块。

### 1. 💻 完整桌面环境（计算机使用）
- **VNC 远程桌面**：访问一个完整的、交互式的 Ubuntu 桌面环境。
- **预装应用程序**：开箱即用地附带 Google Chrome、VS Code 和其他基本工具。
- **GUI 自动化**：您的智能体可以通过编程方式控制鼠标和键盘来与任何桌面应用程序交互。
- **视觉感知**：内置的屏幕截图功能为智能体提供视觉上下文，使其能够"看到"并对 GUI 做出反应。

<div align="center">
  <img src="assets/screenshots/vnc.gif" alt="VNC 桌面环境演示" width="800" />
  <p><em>带有 VS Code 和浏览器的交互式 VNC 会话。</em></p>
</div>

### 2. 🐚 完整的代码解释器 & Shell
- **安全的代码执行**：在隔离的 Docker 容器中安全地运行 AI 生成的代码。
- **完整 Shell 访问**：功能齐全的 `bash` 终端允许执行任何 Linux 命令。
- **隔离的文件系统**：每个会话都有独立的文件系统，完全支持创建、读取、写入和删除文件。
- **多语言支持**：原生支持 Python、JavaScript (Node.js) 和其他运行时。

### 3. 🔗 无缝的 LLM 智能体集成（通过 MCP）
- **标准化协议**：所有沙箱功能都通过 **MCP（模型上下文协议）** HTTP 接口暴露。
- **广泛的客户端兼容性**：轻松连接到任何支持 MCP 的 LLM 客户端，如 Claude Desktop、OpenWebUI、LobeChat 等。
- **多会话管理**：使用 `x-session-id` 头创建和管理多个隔离的沙箱会话。

## 🛠️ 可用的 MCP 工具

EdgeBox 通过 MCP 工具展示其能力，分为两类：

### 📟 核心工具（CLI 模式 - 始终可用）

**代码执行工具** - 在各种语言中执行代码：
- `execute_python` - 在隔离环境中执行 Python 代码
- `execute_typescript` - 执行 TypeScript/JavaScript 代码
- `execute_r` - 执行 R 代码进行统计分析
- `execute_java` - 执行 Java 代码
- `execute_bash` - 执行 Bash 脚本

**Shell 命令** - 与 Linux 环境交互：
- `shell_run` - 运行 Shell 命令（有状态的、持久化环境）
- `shell_run_background` - 在后台运行命令并进行进程管理

**文件系统操作** - 管理文件和目录：
- `fs_list` - 列出目录中的文件
- `fs_read` - 读取文件内容
- `fs_write` - 将内容写入文件
- `fs_info` - 获取文件元数据和信息
- `fs_watch` - 实时监控目录变化

### 🖱️ 桌面工具（GUI 模式 - 启用 GUI 工具时可用）

**鼠标控制** - 程序化鼠标交互：
- `desktop_mouse_click` - 执行鼠标点击（左键/右键/中键）
- `desktop_mouse_double_click` - 双击操作
- `desktop_mouse_move` - 将光标移动到坐标位置
- `desktop_mouse_scroll` - 以可配置数量向上/向下滚动
- `desktop_mouse_drag` - 从一个位置拖动到另一个位置

**键盘控制** - 文本输入和按键组合：
- `desktop_keyboard_type` - 输入文本，支持非 ASCII 字符的剪贴板
- `desktop_keyboard_press` - 按特定键（Return、Escape、Tab 等）
- `desktop_keyboard_combo` - 执行按键组合（Ctrl+C、Alt+Tab 等）

**窗口管理** - 控制桌面应用程序：
- `desktop_get_windows` - 列出所有窗口及其标题和 ID
- `desktop_switch_window` - 聚焦特定窗口
- `desktop_maximize_window` - 最大化窗口
- `desktop_minimize_window` - 最小化窗口
- `desktop_resize_window` - 将窗口调整为特定尺寸

**视觉和应用程序控制**：
- `desktop_screenshot` - 捕获桌面屏幕截图（PNG 格式）
- `desktop_launch_app` - 按名称启动应用程序
- `desktop_wait` - 在操作之间添加延迟

> **注意**：桌面工具仅在 EdgeBox 设置中启用 GUI 工具时可用。无论 GUI 设置如何，核心工具始终可用。

## 🏗️ 架构

EdgeBox 旨在为 LLM 智能体提供无缝且强大的本地执行环境。

**[LLM 智能体（Claude、GPT 等）]** `<- MCP (HTTP 流) ->` **[EdgeBox 应用]** `<- Docker API ->` **[隔离的沙箱容器（桌面 + Shell）]**

- **前端**：Electron + React + TypeScript + Tailwind CSS
- **后端**：Node.js + Dockerode（用于 Docker API）
- **容器化**：Docker
- **UI 组件**：Radix UI

## 📋 前置要求

- **Docker Desktop**：必须安装并运行。

## 🛠️ 安装

1. **下载 EdgeBox**
   从 [发布页面](https://github.com/BIGPPWONG/edgebox/releases) 下载您平台的最新版本。

2. **安装并运行 Docker Desktop**
   在启动 EdgeBox 之前，请确保 Docker Desktop 已安装并运行。

3. **运行 EdgeBox**
   - **Windows**：运行 `EdgeBox.exe`
   - **macOS**：打开 `EdgeBox.app`
   - **Linux**：运行 AppImage 或安装 `.deb`/`.rpm` 包。

## 🎯 使用方法

### 快速开始
1. 启动 EdgeBox 并确保 Docker 正在运行。
2. 检查仪表板以验证所有组件（Docker、MCP 服务器）是否正常运行。
3. 将 EdgeBox MCP 配置添加到您的 LLM 客户端。

### MCP 客户端配置

将 EdgeBox 添加到您的 LLM 客户端配置：

```json
{
  "mcpServers": {
    "edgebox": {
      "url": "http://localhost:8888/mcp"
    }
  }
}
```

### 指导您的 LLM 智能体

配置完成后，您可以向 LLM 智能体发出自然语言指令，例如：

  - **代码执行**：*"编写一个 Python 脚本分析这个 CSV 文件并向我显示输出。"*
  - **文件操作**：*"创建一个名为 'project' 的新文件夹，在其中创建一个名为 `main.py` 的文件。"*
  - **计算机使用**：*"打开浏览器，导航到 'github.com'，搜索 'EdgeBox'，然后为我截取屏幕截图。"*

### 多会话并发沙箱

通过在 MCP 请求头中指定 `x-session-id` 来轻松管理多个隔离环境。

**不同任务的示例配置**：

```json
{
  "mcpServers": {
    "edgebox-default": {
      "url": "http://localhost:8888/mcp"
    },
    "edgebox-data-analysis": {
      "url": "http://localhost:8888/mcp",
      "headers": {
        "x-session-id": "data-analysis"
      }
    },
    "edgebox-web-scraping": {
      "url": "http://localhost:8888/mcp",
      "headers": {
        "x-session-id": "web-scraping"
      }
    }
  }
}
```

### 编程访问（SDK 示例）

您可以通过代码编程方式连接到 EdgeBox 的 MCP 服务器。以下是 Python 和 TypeScript 的快速入门示例。

#### Python 快速入门（FastMCP）

使用 [FastMCP](https://gofastmcp.com/clients/client) 客户端从 Python 连接到 EdgeBox。

**安装：**

```bash
pip install fastmcp
```

**示例：**

```python
import asyncio
from fastmcp import Client

EDGEBOX_MCP_URL = "http://localhost:8888/mcp"

async def main():
    client = Client(EDGEBOX_MCP_URL)

    async with client:
        # 列出可用工具
        tools = await client.list_tools()
        for tool in tools:
            print(f"  - {tool.name}: {tool.description}")

        # 在沙箱中执行 Python 代码
        result = await client.call_tool(
            "execute_python",
            {"code": "import sys; print(f'Hello from EdgeBox! Python {sys.version}')"},
        )
        print(f"Result: {result}")

        # 运行 Shell 命令
        result = await client.call_tool(
            "shell_run",
            {"command": "uname -a && whoami"},
        )
        print(f"Shell: {result}")

        # 文件操作
        await client.call_tool(
            "fs_write",
            {"path": "/tmp/hello.txt", "content": "Hello from EdgeBox!"},
        )
        result = await client.call_tool("fs_read", {"path": "/tmp/hello.txt"})
        print(f"File content: {result}")

        # 在沙箱中执行 TypeScript 代码
        result = await client.call_tool(
            "execute_typescript",
            {"code": "console.log(`Node.js ${process.version}`)"},
        )
        print(f"TypeScript: {result}")

        # 桌面自动化（需要启用 GUI 工具）
        # result = await client.call_tool("desktop_screenshot", {})
        # result = await client.call_tool("desktop_keyboard_type", {"text": "hello"})

asyncio.run(main())
```

#### TypeScript 快速入门（fastmcp）

使用 [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) 客户端（由 [fastmcp](https://github.com/punkpeye/fastmcp) 引用）从 TypeScript 连接到 EdgeBox。

**安装：**

```bash
npm install @modelcontextprotocol/sdk fastmcp
```

**示例：**

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const EDGEBOX_MCP_URL = "http://localhost:8888/mcp";

async function main() {
  const client = new Client(
    { name: "edgebox-quickstart", version: "1.0.0" },
    { capabilities: {} },
  );

  const transport = new StreamableHTTPClientTransport(
    new URL(EDGEBOX_MCP_URL),
  );
  await client.connect(transport);

  try {
    // 列出可用工具
    const { tools } = await client.listTools();
    for (const tool of tools) {
      console.log(`  - ${tool.name}: ${tool.description}`);
    }

    // 在沙箱中执行 Python 代码
    const pythonResult = await client.callTool({
      name: "execute_python",
      arguments: {
        code: "import sys; print(f'Hello from EdgeBox! Python {sys.version}')",
      },
    });
    console.log("Result:", pythonResult.content);

    // 运行 Shell 命令
    const shellResult = await client.callTool({
      name: "shell_run",
      arguments: { command: "uname -a && whoami" },
    });
    console.log("Shell:", shellResult.content);

    // 文件操作
    await client.callTool({
      name: "fs_write",
      arguments: { path: "/tmp/hello.txt", content: "Hello from EdgeBox!" },
    });
    const readResult = await client.callTool({
      name: "fs_read",
      arguments: { path: "/tmp/hello.txt" },
    });
    console.log("File content:", readResult.content);

    // 在沙箱中执行 TypeScript 代码
    const tsResult = await client.callTool({
      name: "execute_typescript",
      arguments: { code: "console.log(`Node.js ${process.version}`)" },
    });
    console.log("TypeScript:", tsResult.content);

    // 桌面自动化（需要启用 GUI 工具）
    // const screenshot = await client.callTool({ name: "desktop_screenshot", arguments: {} });
    // const typed = await client.callTool({ name: "desktop_keyboard_type", arguments: { text: "hello" } });
  } finally {
    await client.close();
  }
}

main().catch(console.error);
```

#### 容器管理示例

EdgeBox 提供容器生命周期工具（`container_list`、`container_create`、`container_stop`、`container_restart`、`container_delete`）来编程管理沙箱容器。
`container_stop` 会结束该 `session_id` 与容器的映射关系，因此一般应将 **`container_stop` 或 `container_delete` 二选一** 作为最终清理步骤（不要对同一个 `session_id` 先 stop 再 delete）。

**Python：**

```python
import asyncio
from fastmcp import Client

async def main():
    client = Client("http://localhost:8888/mcp")

    async with client:
        # 创建新容器（60 分钟超时）
        result = await client.call_tool(
            "container_create",
            {"session_id": "my-session", "timeout": 60},
        )
        print(f"Create: {result}")

        # 列出所有活跃容器
        result = await client.call_tool("container_list", {})
        print(f"List: {result}")

        # 重启容器
        result = await client.call_tool(
            "container_restart", {"session_id": "my-session"}
        )
        print(f"Restart: {result}")

        # 清理方式 A：停止容器
        result = await client.call_tool(
            "container_stop", {"session_id": "my-session"}
        )
        print(f"Stop: {result}")

        # 清理方式 B（替代 stop）：直接删除容器及所有关联数据
        # 为了演示可重复运行，这里使用不同的 session_id
        await client.call_tool(
            "container_create",
            {"session_id": "my-session-delete", "timeout": 60},
        )
        result = await client.call_tool(
            "container_delete", {"session_id": "my-session-delete"}
        )
        print(f"Delete: {result}")

asyncio.run(main())
```

**TypeScript：**

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  const client = new Client(
    { name: "edgebox-container-mgmt", version: "1.0.0" },
    { capabilities: {} },
  );
  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:8888/mcp"),
  );
  await client.connect(transport);

  try {
    // 创建新容器（60 分钟超时）
    const created = await client.callTool({
      name: "container_create",
      arguments: { session_id: "my-session", timeout: 60 },
    });
    console.log("Create:", created.content);

    // 列出所有活跃容器
    const list = await client.callTool({
      name: "container_list",
      arguments: {},
    });
    console.log("List:", list.content);

    // 重启容器
    const restarted = await client.callTool({
      name: "container_restart",
      arguments: { session_id: "my-session" },
    });
    console.log("Restart:", restarted.content);

    // 清理方式 A：停止容器
    const stopped = await client.callTool({
      name: "container_stop",
      arguments: { session_id: "my-session" },
    });
    console.log("Stop:", stopped.content);

    // 清理方式 B（替代 stop）：直接删除容器及所有关联数据
    // 为了演示可重复运行，这里使用不同的 session_id
    await client.callTool({
      name: "container_create",
      arguments: { session_id: "my-session-delete", timeout: 60 },
    });
    const deleted = await client.callTool({
      name: "container_delete",
      arguments: { session_id: "my-session-delete" },
    });
    console.log("Delete:", deleted.content);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
```

#### 会话隔离示例

在 EdgeBox 中，**每个会话（session）对应一个独立的 Docker 容器**，拥有各自隔离的文件系统和运行环境。不传 `x-session-id` 时，所有请求共用同一个 `"default_session"` 容器。通过传入不同的 `x-session-id` header，可以并行运行完全隔离的工作负载。

**Python：**

```python
import asyncio
from fastmcp import Client
from fastmcp.client.transports import StreamableHttpTransport

async def run_in_session(session_id: str):
    """每个 session 拥有独立的隔离容器。"""
    transport = StreamableHttpTransport(
        url="http://localhost:8888/mcp",
        headers={"x-session-id": session_id},
    )
    client = Client(transport)

    async with client:
        # 写入文件 - 仅在此 session 的容器内可见
        await client.call_tool(
            "fs_write",
            {"path": "/tmp/id.txt", "content": f"I am {session_id}"},
        )

        # 读取文件
        result = await client.call_tool("fs_read", {"path": "/tmp/id.txt"})
        print(f"[{session_id}] /tmp/id.txt => {result}")

        # 在此 session 的容器内运行命令
        result = await client.call_tool(
            "shell_run", {"command": "hostname"}
        )
        print(f"[{session_id}] hostname => {result}")

async def main():
    # 顺序运行，输出更直观（并发场景见下方校验脚本）
    await run_in_session("session-alice")
    await run_in_session("session-bob")
    # session-alice 的 /tmp/id.txt 内容为 "I am session-alice"
    # session-bob 的 /tmp/id.txt 内容为 "I am session-bob"
    # 它们互不干扰。

asyncio.run(main())
```

**TypeScript：**

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function runInSession(sessionId: string) {
  const client = new Client(
    { name: "edgebox-session-demo", version: "1.0.0" },
    { capabilities: {} },
  );
  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:8888/mcp"),
    {
      requestInit: {
        headers: { "x-session-id": sessionId },
      },
    },
  );
  await client.connect(transport);

  try {
    // 写入文件 - 仅在此 session 的容器内可见
    await client.callTool({
      name: "fs_write",
      arguments: { path: "/tmp/id.txt", content: `I am ${sessionId}` },
    });

    // 读取文件
    const read = await client.callTool({
      name: "fs_read",
      arguments: { path: "/tmp/id.txt" },
    });
    console.log(`[${sessionId}] /tmp/id.txt =>`, read.content);

    // 在此 session 的容器内运行命令
    const host = await client.callTool({
      name: "shell_run",
      arguments: { command: "hostname" },
    });
    console.log(`[${sessionId}] hostname =>`, host.content);
  } finally {
    await client.close();
  }
}

async function main() {
  // 这两个 session 运行在完全独立的容器中
  await Promise.all([
    runInSession("session-alice"),
    runInSession("session-bob"),
  ]);
  // session-alice 的 /tmp/id.txt 内容为 "I am session-alice"
  // session-bob 的 /tmp/id.txt 内容为 "I am session-bob"
  // 它们互不干扰。
}

main().catch(console.error);
```

#### 并发隔离校验（<= 4）

如果你希望在轻量并发下校验会话隔离，建议将并发控制在较低水平（例如 `<= 4`），并验证每个 session 都能读回自己写入的值。

**Python（4 个 session，独立路径）：**

```python
import asyncio
from fastmcp import Client
from fastmcp.client.transports import StreamableHttpTransport

URL = "http://localhost:8888/mcp"
SESSIONS = ["s1", "s2", "s3", "s4"]
ROUNDS = 20

async def run_once(session_id: str, round_no: int) -> bool:
    transport = StreamableHttpTransport(
        url=URL,
        headers={"x-session-id": session_id},
    )
    client = Client(transport)

    path = f"/tmp/id-{session_id}.txt"
    expected = f"{session_id}-r{round_no}"

    async with client:
        await client.call_tool("fs_write", {"path": path, "content": expected})
        read = await client.call_tool("fs_read", {"path": path})
        actual = read.content[0].text
        return actual == expected

async def main():
    bad = 0
    for i in range(1, ROUNDS + 1):
        results = await asyncio.gather(*[run_once(s, i) for s in SESSIONS])
        bad += sum(0 if ok else 1 for ok in results)
    print(f"BAD={bad}")

asyncio.run(main())
```

**TypeScript（4 个 session，独立路径）：**

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const URL = "http://localhost:8888/mcp";
const SESSIONS = ["s1", "s2", "s3", "s4"];
const ROUNDS = 20;

async function runOnce(sessionId: string, roundNo: number): Promise<boolean> {
  const client = new Client(
    { name: "edgebox-isolation-check", version: "1.0.0" },
    { capabilities: {} },
  );
  const transport = new StreamableHTTPClientTransport(new URL(URL), {
    requestInit: { headers: { "x-session-id": sessionId } },
  });
  await client.connect(transport);

  const path = `/tmp/id-${sessionId}.txt`;
  const expected = `${sessionId}-r${roundNo}`;

  try {
    await client.callTool({
      name: "fs_write",
      arguments: { path, content: expected },
    });
    const read = await client.callTool({
      name: "fs_read",
      arguments: { path },
    });
    const actual = (read.content?.[0] as any)?.text ?? "";
    return actual === expected;
  } finally {
    await client.close();
  }
}

async function main() {
  let bad = 0;
  for (let i = 1; i <= ROUNDS; i++) {
    const results = await Promise.all(SESSIONS.map((s) => runOnce(s, i)));
    bad += results.filter((ok) => !ok).length;
  }
  console.log(`BAD=${bad}`);
}

main().catch(console.error);
```

## 🔐 安全性

  - **容器隔离**：每个沙箱会话都在单独的 Docker 容器中运行。
  - **资源限制**：可配置的 CPU 和内存约束可防止资源滥用。
  - **网络隔离**：容器网络受到控制以保护主机机器。

## 📄 许可证

详细信息请参见 [LICENSE](https://www.google.com/search?q=LICENSE) 文件。

## 🙏 致谢

  - **E2B 团队**：创造了启发了 EdgeBox 的精彩开源 E2B 代码解释器项目。
  - **Docker**：提供强大的容器化技术。
  - **Electron**：使跨平台桌面应用成为可能。

## 🔗 相关项目

  - [E2B 代码解释器](https://github.com/e2b-dev/code-interpreter) - 作为我们基础的原项目。
  - [FastMCP](https://github.com/jlowin/fastmcp) - 模型上下文协议（MCP）的一个实现。

## 📞 支持

  - **问题**：在 [GitHub Issues](https://github.com/BIGPPWONG/edgebox/issues) 上报告错误和功能请求。
  - **讨论**：加入 [GitHub Discussions](https://github.com/BIGPPWONG/edgebox/discussions) 的对话。

<!-- end list -->
