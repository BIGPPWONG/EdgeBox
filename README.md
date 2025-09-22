# EdgeBox - The Local Desktop Sandbox for AI Agents

<div align="center">
  <img src="assets/icon/icon.png" alt="EdgeBox Logo" width="128" height="128" />
  <br/>
  <strong>A fully-featured, GUI-powered local LLM Agent sandbox with complete support for the MCP protocol.</strong>
  <br/>
  <p>Empower your Large Language Models (LLMs) with true "Computer Use" capabilities.</p>
</div>

---

**EdgeBox** is a powerful desktop application that brings the cloud-based sandbox capabilities of E2B (e2b.dev) to your local machine. Based on the open-source E2B Code Interpreter project, EdgeBox transforms the sandbox into a locally-running environment, giving you full control over your AI agent's development and execution environment.

**What makes EdgeBox unique**: While most open-source sandbox projects only provide a terminal/CLI, EdgeBox offers both **a command-line shell** AND a **full graphical (GUI) desktop environment** via an integrated VNC viewer. This means your LLM Agent is no longer just a code executor—it's a digital worker that can operate browsers, use VS Code, and interact with desktop applications, just like a human.

<div align="center">
  <img src="assets/screenshots/main-app.png" alt="EdgeBox Main Application" width="800" />
  <p><em>The EdgeBox Main Application Dashboard</em></p>
</div>

## 🤔 Why Choose EdgeBox?

| Feature          |               EdgeBox               | Other OSS Sandboxes (e.g., `codebox`) |
| :--------------- | :---------------------------------: | :-----------------------------------: |
| **Environment**  |             🖥️ **Local**             |                🖥️ Local                |
| **Interface**    |              GUI + CLI              |               CLI-Only                |
| **Capability**   | **Computer Use** & Code Interpreter |           Code Interpreter            |
| **Data Privacy** |         ✅ **100% Private**          |            ✅ 100% Private             |
| **Latency**      |           ⚡️ **Near-Zero**           |              ⚡️ Near-Zero              |
| **Integration**  |         ✅ **MCP Compliant**         |            Proprietary API            |

## 📖 Table of Contents

- [EdgeBox - The Local Desktop Sandbox for AI Agents](#edgebox---the-local-desktop-sandbox-for-ai-agents)
  - [🤔 Why Choose EdgeBox?](#-why-choose-edgebox)
  - [📖 Table of Contents](#-table-of-contents)
  - [🚀 Core Features](#-core-features)
    - [1. 💻 Full Desktop Environment (Computer Use)](#1--full-desktop-environment-computer-use)
    - [2. 🐚 Complete Code Interpreter \& Shell](#2--complete-code-interpreter--shell)
    - [3. 🔗 Seamless LLM Agent Integration (via MCP)](#3--seamless-llm-agent-integration-via-mcp)
  - [🏗️ Architecture](#️-architecture)
  - [📋 Prerequisites](#-prerequisites)
  - [🛠️ Installation](#️-installation)
  - [🎯 Usage](#-usage)
    - [Quick Start](#quick-start)
    - [MCP Client Configuration](#mcp-client-configuration)
    - [Instructing Your LLM Agent](#instructing-your-llm-agent)
    - [Multi-Session Concurrent Sandboxes](#multi-session-concurrent-sandboxes)
  - [🔐 Security](#-security)
  - [📄 License](#-license)
  - [🙏 Acknowledgments](#-acknowledgments)
  - [🔗 Related Projects](#-related-projects)
  - [📞 Support](#-support)

## 🚀 Core Features

EdgeBox exposes all its capabilities through the MCP protocol, organized into three core modules for your LLM Agent.

### 1. 💻 Full Desktop Environment (Computer Use)
- **VNC Remote Desktop**: Access a complete, interactive Ubuntu desktop environment.
- **Pre-installed Applications**: Comes with Google Chrome, VS Code, and other essential tools out of the box.
- **GUI Automation**: Your agent can programmatically control the mouse and keyboard to interact with any desktop application.
- **Visual Perception**: Built-in screenshot capabilities provide visual context to the agent, enabling it to "see" and react to the GUI.

<div align="center">
  <img src="assets/screenshots/vnc.gif" alt="VNC Desktop Environment Demo" width="800" />
  <p><em>An interactive VNC session with VS Code and a browser.</em></p>
</div>

### 2. 🐚 Complete Code Interpreter & Shell
- **Secure Code Execution**: Safely run AI-generated code in an isolated Docker container.
- **Full Shell Access**: A fully-featured `bash` terminal allows the execution of any Linux command.
- **Isolated Filesystem**: Each session gets a separate filesystem with full support for creating, reading, writing, and deleting files.
- **Multi-language Support**: Native support for Python, JavaScript (Node.js), and other runtimes.

### 3. 🔗 Seamless LLM Agent Integration (via MCP)
- **Standardized Protocol**: All sandbox features are exposed via the **MCP (Model Context Protocol)** HTTP interface.
- **Broad Client Compatibility**: Easily connect to any LLM client that supports MCP, such as Claude Desktop, OpenWebUI, LobeChat, and more.
- **Multi-Session Management**: Create and manage multiple, isolated sandbox sessions concurrently using the `x-session-id` header.

## 🏗️ Architecture

EdgeBox is designed to provide a seamless and powerful local execution environment for LLM agents.

**[LLM Agent (Claude, GPT, etc.)]** `<- MCP (HTTP Stream) ->` **[EdgeBox App]** `<- Docker API ->` **[Isolated Sandbox Container (Desktop + Shell)]**

- **Frontend**: Electron + React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Dockerode (for Docker API)
- **Containerization**: Docker
- **UI Components**: Radix UI

## 📋 Prerequisites

- **Docker Desktop**: Must be installed and running.

## 🛠️ Installation

1.  **Download EdgeBox**
    Download the latest release for your platform from the [Releases page](https://github.com/BIGPPWONG/edgebox/releases).

2.  **Install & Run Docker Desktop**
    Ensure Docker Desktop is installed and running before starting EdgeBox.

3.  **Run EdgeBox**
    - **Windows**: Run `EdgeBox.exe`
    - **macOS**: Open `EdgeBox.app`
    - **Linux**: Run the AppImage or install the `.deb`/`.rpm` package.

## 🎯 Usage

### Quick Start
1.  Launch EdgeBox and ensure Docker is running.
2.  Check the dashboard to verify all components (Docker, MCP Server) are healthy.
3.  Add the EdgeBox MCP configuration to your LLM client.

### MCP Client Configuration

Add EdgeBox to your LLM client with this configuration:

```json
{
  "mcpServers": {
    "edgebox": {
      "url": "http://localhost:8888/mcp"
    }
  }
}
````

### Instructing Your LLM Agent

Once configured, you can give your LLM agent natural language instructions like:

  - **Code Execution**: *"Write a Python script to analyze this CSV file and show me the output."*
  - **File Operations**: *"Create a new folder called 'project', and inside it, create a file named `main.py`."*
  - **Computer Use**: *"Open the browser, navigate to 'github.com', search for 'EdgeBox', and then take a screenshot for me."*

### Multi-Session Concurrent Sandboxes

Easily manage multiple isolated environments by specifying an `x-session-id` in your MCP request headers.

**Example configuration for different tasks:**

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

## 🔐 Security

  - **Container Isolation**: Every sandbox session runs in a separate Docker container.
  - **Resource Limits**: Configurable CPU and memory constraints prevent resource abuse.
  - **Network Isolation**: Container networking is controlled to protect the host machine.

## 📄 License

See the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.

## 🙏 Acknowledgments

  - **E2B Team**: For creating the fantastic open-source E2B Code Interpreter project that inspired EdgeBox.
  - **Docker**: For the powerful containerization technology.
  - **Electron**: For making cross-platform desktop apps possible.

## 🔗 Related Projects

  - [E2B Code Interpreter](https://github.com/e2b-dev/code-interpreter) - The original project that served as our foundation.
  - [FastMCP](https://github.com/jlowin/fastmcp) - An implementation of the Model Context Protocol (MCP).

## 📞 Support

  - **Issues**: Report bugs and feature requests on [GitHub Issues](https://github.com/BIGPPWONG/edgebox/issues).
  - **Discussions**: Join the conversation in [GitHub Discussions](https://github.com/BIGPPWONG/edgebox/discussions).

<!-- end list -->
