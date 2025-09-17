import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';

export class SettingsManager {
  private settings: AppSettings;
  private settingsPath: string;

  constructor() {
    this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
    this.settings = this.loadSettings();
  }

  private loadSettings(): AppSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        const parsedSettings = JSON.parse(data);
        return { ...DEFAULT_SETTINGS, ...parsedSettings };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }

    const settings = { ...DEFAULT_SETTINGS };
    this.saveSettings(settings);
    return settings;
  }

  private saveSettings(settings: AppSettings): void {
    try {
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings(this.settings);
  }

  resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings(this.settings);
  }
}