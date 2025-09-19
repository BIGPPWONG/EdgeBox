import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from './ui/button';
import { RefreshCw, Monitor } from 'lucide-react';

type VNCStep = 'starting' | 'opening' | 'ready' | 'error';

export const VNCPage: React.FC = () => {
  const { containerName } = useParams<{ containerName: string }>();

  const [currentStep, setCurrentStep] = useState<VNCStep>('starting');
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // 启动VNC服务
  const startVNC = async () => {
    if (!containerName) {
      setError('容器名称未提供');
      setCurrentStep('error');
      return;
    }

    try {
      setCurrentStep('starting');
      setError(null);

      const result = await (window as any).sandboxManagerAPI.startVNC(containerName, { viewOnly: false });

      if (!mountedRef.current) return;

      if (result.success) {
        setStreamUrl(result.result.streamUrl);
        setCurrentStep('opening');

        // 延迟一下再显示iframe，让用户看到进度
        setTimeout(() => {
          if (mountedRef.current) {
            setCurrentStep('ready');
          }
        }, 500);
      } else {
        throw new Error(result.error || 'Failed to start VNC');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setCurrentStep('error');
    }
  };

  // 停止VNC服务
  const stopVNC = async () => {
    if (!containerName) return;

    try {
      await (window as any).sandboxManagerAPI.stopVNC(containerName);
    } catch (err) {
      console.error('Failed to stop VNC:', err);
    }
  };

  // 重新加载VNC
  const handleReload = () => {
    setCurrentStep('starting');
    startVNC();
  };


  // 组件挂载时自动启动VNC
  useEffect(() => {
    mountedRef.current = true;
    startVNC();

    // 监听窗口关闭事件
    const handleBeforeUnload = () => {
      stopVNC();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // 组件卸载时清理
    return () => {
      mountedRef.current = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopVNC();
    };
  }, [containerName]);



  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* 顶部标题栏 */}
      <div className="drag-region px-3 py-1 bg-white/95 backdrop-blur-sm border-b border-slate-200/60 flex items-center">
        <div className="w-20"></div>
        <div className="flex-1 flex items-center justify-center gap-1.5">
          <Monitor className="text-slate-600" size={16} />
          <h1 className="text-sm font-medium text-slate-800">
            VNC - {containerName}
          </h1>
        </div>
        <div className="w-20 flex items-center justify-end gap-2">
          {(
            <Button
              onClick={handleReload}
              variant="default"
              size="sm"
              className={`no-drag px-2 py-1 ${currentStep === 'ready'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : ''
                }`}
            >
              <RefreshCw size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 进度指示器 - 只在非ready状态显示 */}
        {currentStep !== 'ready' && (
          <div className="flex-1 flex flex-col items-center justify-center bg-black text-green-400 font-mono">
            <div className="flex flex-col items-center space-y-8">
              {/* 主图标和状态 */}
              <div className="flex flex-col items-center space-y-4">
                <Monitor size={80} className="text-green-400" />

                {/* 状态指示 */}
                {currentStep === 'starting' && (
                  <div className="text-green-400 font-mono text-sm">
                    Starting VNC...
                  </div>
                )}
                {currentStep === 'opening' && (
                  <div className="text-green-400 font-mono text-sm">
                    Opening connection...
                  </div>
                )}
                {currentStep === 'error' && (
                  <div className="text-red-400 font-mono text-sm">
                    Connection failed
                  </div>
                )}
              </div>

              {/* 进度动画 */}
              {['starting', 'opening'].includes(currentStep) && (
                <div className="flex space-x-1 justify-center font-mono text-green-400">
                  <span className="animate-pulse" style={{ animationDelay: '0ms' }}>█</span>
                  <span className="animate-pulse" style={{ animationDelay: '200ms' }}>█</span>
                  <span className="animate-pulse" style={{ animationDelay: '400ms' }}>█</span>
                  <span className="animate-pulse" style={{ animationDelay: '600ms' }}>█</span>
                  <span className="animate-pulse" style={{ animationDelay: '800ms' }}>█</span>
                </div>
              )}

              {/* 错误信息 */}
              {error && (
                <div className="text-xs text-red-400 bg-black border border-red-600/50 px-3 py-2 max-w-md font-mono">
                  ERROR: {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VNC iframe - 只在ready状态显示 */}
        {currentStep === 'ready' && streamUrl && (
          <div className="flex-1 bg-black overflow-hidden">
            <iframe
              src={streamUrl}
              className="w-full h-full border-none"
              title={`VNC - ${containerName}`}
            />
          </div>
        )}
      </div>

    </div>
  );
};