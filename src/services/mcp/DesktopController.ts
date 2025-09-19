import { Sandbox } from '@e2b/code-interpreter'

export class DesktopController {
  private desktop: Sandbox

  constructor(sandbox: Sandbox) {
    this.desktop = sandbox
  }

  // ============ VNC Stream 控制函数 ============

  async startVNCStream(options: { viewOnly?: boolean, windowId?: string } = {}) {
    const vncPort = 5900
    const webPort = 6080
    const { viewOnly = false, windowId } = options

    console.log('Starting VNC stream...', { viewOnly, windowId })

    // 停止现有服务
    await this.desktop.commands.run('pkill x11vnc || true', { envs: { DISPLAY: ':0' } })

    // 构建 x11vnc 命令
    let vncCommand = `x11vnc -bg -display :0 -forever -wait 50 -shared -rfbport ${vncPort} -nopw 2>/tmp/x11vnc_stderr.log`

    // 如果指定了窗口ID，只传输该窗口
    if (windowId) {
      vncCommand += ` -id ${windowId}`
    }

    // 启动 x11vnc 服务器
    await this.desktop.commands.run(vncCommand, { envs: { DISPLAY: ':0' } })

    // 启动 noVNC 代理
    const novncCommand = `cd /opt/noVNC/utils && ./novnc_proxy --vnc localhost:${vncPort} --listen ${webPort} --web /opt/noVNC > /tmp/novnc.log 2>&1`
    await this.desktop.commands.run(novncCommand, {
      envs: { DISPLAY: ':0' },
      background: true,
      timeoutMs: 0
    })

    // 等待服务启动
    await this.desktop.commands.run('sleep 3', { envs: { DISPLAY: ':0' } })

    // 检查状态
    const vncCheck = await this.desktop.commands.run('pgrep -x x11vnc', { envs: { DISPLAY: ':0' } })
    const portCheck = await this.desktop.commands.run(`netstat -tuln | grep ":${webPort} "`, { envs: { DISPLAY: ':0' } })

    const isRunning = vncCheck.stdout.trim() !== '' && portCheck.stdout.trim() !== ''
    console.log('VNC stream started:', isRunning)

    // 构建URL参数
    const urlParams = new URLSearchParams({
      autoconnect: 'true',
      resize: 'scale'
    })

    if (viewOnly) {
      urlParams.set('view_only', 'true')
    }

    const streamUrl = `http://localhost:${webPort}/vnc.html?${urlParams.toString()}`

    return {
      isRunning,
      streamUrl,
      windowId: windowId || 'desktop'
    }
  }

  async stopVNCStream() {
    console.log('Stopping VNC stream...')
    await this.desktop.commands.run('pkill x11vnc', { envs: { DISPLAY: ':0' } })
    console.log('VNC stream stopped')
  }

  // ============ 鼠标操作函数 ============

  async mouseClick(button: 'left' | 'right' | 'middle' = 'left', x?: number, y?: number) {
    const buttonMap = { left: 1, right: 3, middle: 2 }
    if (x !== undefined && y !== undefined) {
      await this.desktop.commands.run(`xdotool mousemove --sync ${x} ${y}`, { envs: { DISPLAY: ':0' } })
    }
    await this.desktop.commands.run(`xdotool click ${buttonMap[button]}`, { envs: { DISPLAY: ':0' } })
  }

  async mouseDoubleClick(x?: number, y?: number) {
    if (x !== undefined && y !== undefined) {
      await this.desktop.commands.run(`xdotool mousemove --sync ${x} ${y}`, { envs: { DISPLAY: ':0' } })
    }
    await this.desktop.commands.run('xdotool click --repeat 2 1', { envs: { DISPLAY: ':0' } })
  }

  async mouseMove(x: number, y: number) {
    await this.desktop.commands.run(`xdotool mousemove --sync ${x} ${y}`, { envs: { DISPLAY: ':0' } })
  }

  async mouseScroll(direction: 'up' | 'down', amount = 1) {
    const button = direction === 'up' ? 4 : 5
    await this.desktop.commands.run(`xdotool click --repeat ${amount} ${button}`, { envs: { DISPLAY: ':0' } })
  }

  async mouseDrag(fromX: number, fromY: number, toX: number, toY: number) {
    await this.desktop.commands.run(`xdotool mousemove --sync ${fromX} ${fromY}`, { envs: { DISPLAY: ':0' } })
    await this.desktop.commands.run('xdotool mousedown 1', { envs: { DISPLAY: ':0' } })
    await this.desktop.commands.run(`xdotool mousemove --sync ${toX} ${toY}`, { envs: { DISPLAY: ':0' } })
    await this.desktop.commands.run('xdotool mouseup 1', { envs: { DISPLAY: ':0' } })
  }

  // ============ 键盘操作函数 ============

  async keyboardType(text: string, options: {
    delay?: number,        // 输入延迟，单位：毫秒，最大25ms
    useClipboard?: boolean // 强制使用剪贴板方式
  } = {}) {
    const { delay = 12, useClipboard = false } = options

    // 限制延迟最大值为25毫秒
    const actualDelay = Math.min(Math.max(delay, 1), 25)

    // 检查是否包含非ASCII字符
    const hasNonAscii = /[^\x00-\x7F]/.test(text)

    // 自动使用剪贴板：有非ASCII字符 或 手动指定
    const shouldUseClipboard = hasNonAscii || useClipboard

    if (shouldUseClipboard) {
      // 使用剪贴板方案
      const reason = hasNonAscii ? '(non-ASCII detected)' : '(forced)'
      console.log('Using clipboard method', reason, 'for text:', text.substring(0, 50) + (text.length > 50 ? '...' : ''))

      try {
        // 转义文本中的特殊字符
        const escapedText = text.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$')
        await this.desktop.commands.run(`echo -n "${escapedText}" | xclip -selection clipboard | true`, {
          envs: { DISPLAY: ':0' },
          timeoutMs: 3000
        })
      } catch (error) {
        console.log('Clipboard operation failed, skipping text input')
      }
      // 使用 Ctrl+V 粘贴
      await this.keyboardCombo(['ctrl', 'v'])
    } else {
      // 使用 xdotool 逐字符输入
      console.log('Using xdotool type for text:', text.substring(0, 50) + (text.length > 50 ? '...' : ''))

      await this.desktop.commands.run(`xdotool type --delay ${actualDelay} "${text}"`, { envs: { DISPLAY: ':0' } })
    }
  }

  async keyboardPress(key: string) {
    await this.desktop.commands.run(`xdotool key ${key}`, { envs: { DISPLAY: ':0' } })
  }

  async keyboardCombo(keys: string[]) {
    const combo = keys.join('+')
    await this.desktop.commands.run(`xdotool key ${combo}`, { envs: { DISPLAY: ':0' } })
  }

  // ============ 窗口操作函数 ============

  async getAllWindowsWithClass(includeMinimized = false) {
    try {
      // 根据参数决定是否包含最小化窗口
      const searchCommand = includeMinimized
        ? 'xdotool search ""'  // 获取所有窗口（包括最小化的）
        : 'xdotool search --onlyvisible ""'  // 只获取可见窗口

      const result = await this.desktop.commands.run(searchCommand, { envs: { DISPLAY: ':0' } })
      const windowIds = result.stdout.trim().split('\n').filter(id => id)

      const windows = []
      for (const windowId of windowIds) {
        try {
          // 获取窗口类名
          const classResult = await this.desktop.commands.run(`xdotool getwindowclassname ${windowId}`, { envs: { DISPLAY: ':0' } })
          // 获取窗口标题
          const titleResult = await this.desktop.commands.run(`xdotool getwindowname ${windowId}`, { envs: { DISPLAY: ':0' } })

          // 获取窗口状态（是否最小化）
          let isMinimized = false
          if (includeMinimized) {
            try {
              // 检查窗口属性来判断是否最小化
              const wmStateResult = await this.desktop.commands.run(`xprop -id ${windowId} _NET_WM_STATE 2>/dev/null || echo "UNKNOWN"`, { envs: { DISPLAY: ':0' } })
              isMinimized = wmStateResult.stdout.includes('_NET_WM_STATE_HIDDEN')
            } catch {
              // 如果无法获取状态，假设窗口是最小化的
              isMinimized = true
            }
          }

          windows.push({
            windowId,
            appClass: classResult.stdout.trim(),
            title: titleResult.stdout.trim(),
            isMinimized
          })
        } catch (error) {
          // 跳过无法获取信息的窗口
          continue
        }
      }

      return windows
    } catch (error) {
      return []
    }
  }

  async switchToWindow(windowId: string) {
    try {
      // 激活并聚焦到指定窗口
      await this.desktop.commands.run(`xdotool windowactivate ${windowId}`, { envs: { DISPLAY: ':0' } })
      await this.desktop.commands.run(`xdotool windowfocus ${windowId}`, { envs: { DISPLAY: ':0' } })
      return true
    } catch (error) {
      console.log(`Failed to switch to window ${windowId}:`, error)
      return false
    }
  }

  async maximizeWindow(windowId: string) {
    try {
      await this.desktop.commands.run(`xdotool windowsize ${windowId} 100% 100%`, { envs: { DISPLAY: ':0' } })
      return true
    } catch (error) {
      console.log(`Failed to maximize window ${windowId}:`, error)
      return false
    }
  }

  async minimizeWindow(windowId: string) {
    try {
      await this.desktop.commands.run(`xdotool windowminimize ${windowId}`, { envs: { DISPLAY: ':0' } })
      return true
    } catch (error) {
      console.log(`Failed to minimize window ${windowId}:`, error)
      return false
    }
  }

  async resizeWindow(windowId: string, width: number, height: number) {
    try {
      await this.desktop.commands.run(`xdotool windowsize ${windowId} ${width} ${height}`, { envs: { DISPLAY: ':0' } })
      return true
    } catch (error) {
      console.log(`Failed to resize window ${windowId} to ${width}x${height}:`, error)
      return false
    }
  }

  // ============ 截图和应用启动函数 ============

  async takeScreenshot(): Promise<Uint8Array> {
    const timestamp = Date.now()
    const screenshotPath = `/tmp/screenshot-${timestamp}.png`

    // 使用 scrot 命令截图
    await this.desktop.commands.run(`scrot --pointer ${screenshotPath}`, { envs: { DISPLAY: ':0' } })

    // 读取文件内容
    const image = await this.desktop.files.read(screenshotPath, { format: 'bytes' })

    // 清理临时文件
    await this.desktop.files.remove(screenshotPath)

    return image
  }

  async launchApplication(appName: string) {
    await this.desktop.commands.run(`gtk-launch ${appName}`, {
      envs: { DISPLAY: ':0' },
      background: true,
      timeoutMs: 0
    })
  }

  async waitFor(seconds: number) {
    await this.desktop.commands.run(`sleep ${seconds}`, { envs: { DISPLAY: ':0' } })
  }
}