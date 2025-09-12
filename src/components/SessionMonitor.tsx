import React, { useState, useEffect } from 'react';
import { SandboxSession } from '../types/sandbox';
import { sandboxManager } from '../services/sandbox-manager';
import { Button } from './ui/button';

export const SessionMonitor: React.FC = () => {
  const [sessions, setSessions] = useState<SandboxSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const refreshSessions = () => {
    setSessions(sandboxManager.getAllSessions());
  };

  useEffect(() => {
    refreshSessions();
    
    // Refresh sessions every 5 seconds
    const interval = setInterval(refreshSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const getActivityStatus = (lastActivity: Date) => {
    const minutesAgo = Math.floor((Date.now() - lastActivity.getTime()) / 60000);
    if (minutesAgo < 1) return { text: 'Active', color: 'text-green-600 bg-green-100' };
    if (minutesAgo < 5) return { text: 'Recent', color: 'text-yellow-600 bg-yellow-100' };
    return { text: 'Idle', color: 'text-gray-600 bg-gray-100' };
  };

  const formatDuration = (startTime: Date) => {
    const minutes = Math.floor((Date.now() - startTime.getTime()) / 60000);
    if (minutes < 1) return 'Just started';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatTimeAgo = (time: Date) => {
    const minutes = Math.floor((Date.now() - time.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) return `${hours}h ${remainingMinutes}m ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleEndSession = (sessionId: string) => {
    sandboxManager.endSession(sessionId);
    refreshSessions();
  };

  const handleEndAllSessions = async () => {
    const sessionIds = sessions.map(s => s.sessionId);
    sessionIds.forEach(id => sandboxManager.endSession(id));
    refreshSessions();
  };

  return (
    <div className="space-y-6">
      {/* Session Overview */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Session Overview</h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="text-gray-600"
              onClick={refreshSessions}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={handleEndAllSessions}
              disabled={sessions.length === 0}
            >
              End All Sessions
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{sessions.length}</div>
            <div className="text-sm text-gray-600">Total Sessions</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {sessions.filter(s => getActivityStatus(s.lastActivity).text === 'Active').length}
            </div>
            <div className="text-sm text-gray-600">Active Sessions</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {sessions.filter(s => getActivityStatus(s.lastActivity).text === 'Recent').length}
            </div>
            <div className="text-sm text-gray-600">Recent Sessions</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {sessions.filter(s => getActivityStatus(s.lastActivity).text === 'Idle').length}
            </div>
            <div className="text-sm text-gray-600">Idle Sessions</div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">Active Sessions ({sessions.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {sessions.map((session) => {
            const activityStatus = getActivityStatus(session.lastActivity);
            const isSelected = selectedSession === session.sessionId;
            
            return (
              <div key={session.sessionId} className="p-6">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setSelectedSession(isSelected ? null : session.sessionId)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900">{session.sessionId}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${activityStatus.color}`}>
                        {activityStatus.text}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Client:</span> {session.clientInfo || 'Unknown'}</p>
                      <p><span className="font-medium">Sandbox:</span> {session.sandboxId}</p>
                      <p><span className="font-medium">Duration:</span> {formatDuration(session.createdAt)}</p>
                      <p><span className="font-medium">Last Activity:</span> {formatTimeAgo(session.lastActivity)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSession(isSelected ? null : session.sessionId);
                      }}
                    >
                      {isSelected ? 'Hide Details' : 'Show Details'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEndSession(session.sessionId);
                      }}
                    >
                      End Session
                    </Button>
                  </div>
                </div>

                {/* Session Details */}
                {isSelected && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">Session Details</h5>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p><span className="font-medium">Session ID:</span> {session.sessionId}</p>
                      <p><span className="font-medium">Sandbox ID:</span> {session.sandboxId}</p>
                      <p><span className="font-medium">Created:</span> {session.createdAt.toLocaleString()}</p>
                      <p><span className="font-medium">Last Activity:</span> {session.lastActivity.toLocaleString()}</p>
                      {session.clientInfo && (
                        <p><span className="font-medium">Client Info:</span> {session.clientInfo}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {sessions.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg">No active sessions</p>
              <p className="mt-1">Sessions will appear here when clients connect to the MCP server</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};