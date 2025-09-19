import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

type VNCStep = 'starting' | 'opening' | 'ready' | 'error';

export const VNCPage: React.FC = () => {
  const { containerName } = useParams<{ containerName: string }>();
  const navigate = useNavigate();

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

  // 关闭窗口
  const handleClose = () => {
    if (window.close) {
      window.close();
    } else {
      // 如果无法关闭窗口，导航回到主页
      navigate('/');
    }
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

  const getStepIcon = (step: VNCStep) => {
    switch (step) {
      case 'starting':
        return '🔄';
      case 'opening':
        return '🚀';
      case 'ready':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🔄';
    }
  };

  const getStepText = (step: VNCStep) => {
    switch (step) {
      case 'starting':
        return '正在启动VNC服务...';
      case 'opening':
        return '正在准备VNC界面...';
      case 'ready':
        return 'VNC已就绪';
      case 'error':
        return '启动失败';
      default:
        return '处理中...';
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 顶部标题栏 */}
      <div style={{
        padding: '16px 24px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827'
        }}>
          VNC连接 - {containerName}
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          {currentStep === 'ready' && (
            <button
              onClick={handleReload}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🔄 重新加载
            </button>
          )}
          {currentStep === 'error' && (
            <button
              onClick={handleReload}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🔄 重试
            </button>
          )}
          <button
            onClick={handleClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            关闭
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div style={{
        flex: 1,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* 进度指示器 - 只在非ready状态显示 */}
        {currentStep !== 'ready' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '24px',
            backgroundColor: currentStep === 'error' ? '#fef2f2' : 'white',
            borderRadius: '12px',
            border: `1px solid ${currentStep === 'error' ? '#fecaca' : '#e5e7eb'}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px'
          }}>
            <div style={{
              fontSize: '32px',
              animation: ['starting', 'opening'].includes(currentStep) ? 'spin 2s linear infinite' : 'none'
            }}>
              {getStepIcon(currentStep)}
            </div>
            <div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: currentStep === 'error' ? '#ef4444' : '#111827',
                marginBottom: '4px'
              }}>
                {getStepText(currentStep)}
              </div>
              {error && (
                <div style={{
                  fontSize: '14px',
                  color: '#ef4444'
                }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VNC iframe - 只在ready状态显示 */}
        {currentStep === 'ready' && streamUrl && (
          <div style={{
            flex: 1,
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <iframe
              src={streamUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              title={`VNC - ${containerName}`}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};