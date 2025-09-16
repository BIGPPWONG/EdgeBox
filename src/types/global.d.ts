import { SandboxManager } from '../services/sandbox-manager';

declare global {
  namespace NodeJS {
    interface Global {
      sandboxManager?: SandboxManager;
    }
  }
  
  // For browser environments
  interface Window {
    sandboxManager?: SandboxManager;
  }
  
  // Extend globalThis
  var sandboxManager: SandboxManager | undefined;
}

// Extend the global object
declare var global: NodeJS.Global & typeof globalThis;