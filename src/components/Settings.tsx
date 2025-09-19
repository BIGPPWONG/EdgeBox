import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types/settings';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

// declare global {
//   interface Window {
//     settingsAPI: {
//       getSettings: () => Promise<{ success: boolean; settings?: AppSettings; error?: string }>;
//       updateSettings: (updates: Partial<AppSettings>) => Promise<{ success: boolean; error?: string }>;
//       resetToDefaults: () => Promise<{ success: boolean; error?: string }>;
//     };
//   }
// }

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await window.settingsAPI.getSettings();
      if (result.success && result.settings) {
        setSettings(result.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: Partial<AppSettings>) => {
    setSaving(true);
    try {
      const result = await window.settingsAPI.updateSettings(updates);
      if (result.success) {
        setSettings(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const result = await window.settingsAPI.resetToDefaults();
      if (result.success) {
        await loadSettings();
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="p-0 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Settings</h2>
        {/* <Badge variant="secondary">Configuration</Badge> */}
      </div>

      <div className="space-y-4">
        {/* Debug Mode */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Debug Mode</label>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.debugMode}
              onChange={(e) => handleSave({ debugMode: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">Enable debug logging</span>
          </div>
        </div>

        {/* Default Docker Image */}
        {/* <div className="space-y-2">
          <label className="text-sm font-medium">Default Docker Image</label>
          <Input
            value={settings.defaultDockerImage}
            onChange={(e) => setSettings({ ...settings, defaultDockerImage: e.target.value })}
            onBlur={(e) => handleSave({ defaultDockerImage: e.target.value })}
            placeholder="ubuntu:latest"
          />
        </div> */}

        {/* MCP Port */}
        <div className="space-y-2">
          <label className="text-sm font-medium">MCP Server Port</label>
          <Input
            type="number"
            value={settings.mcpPort}
            onChange={(e) => setSettings({ ...settings, mcpPort: parseInt(e.target.value) || 8888 })}
            onBlur={(e) => handleSave({ mcpPort: parseInt(e.target.value) || 8888 })}
            placeholder="8888"
          />
        </div>

              </div>

      <div className="flex space-x-3 pt-4 border-t">
        <Button
          onClick={handleReset}
          variant="outline"
          disabled={saving}
        >
          Reset to Defaults
        </Button>
        <Button disabled={saving}>
          {saving ? 'Saving...' : 'Settings Auto-saved'}
        </Button>
      </div>
    </div>
  );
};