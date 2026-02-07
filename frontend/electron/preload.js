const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Platform info
  platform: process.platform,

  // App version
  appVersion: () => ipcRenderer.invoke('app-version'),

  // Notifications (can be extended later)
  notification: {
    show: (title, body) => {
      return new Notification(title, { body });
    }
  },

  // System info
  systemInfo: () => ({
    platform: process.platform,
    arch: process.arch,
    version: process.version,
  }),
});

// Security: Disable node integration in renderer
window.nodeRequire = undefined;
window.require = undefined;
window.module = undefined;
window.exports = undefined;

// Log that preload script loaded successfully
console.log('SlabDash Electron preload script loaded');
