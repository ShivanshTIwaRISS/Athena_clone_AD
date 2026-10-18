/* global require */
// app/preload.cjs — VEYRA Secure IPC Bridge
// Uses .cjs extension so Node/Electron loads it as CommonJS in a "type": "module" package.
// Exposes a minimal, allowlisted set of APIs to the React renderer.
// contextIsolation: true ensures renderer cannot access Node.js directly.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('veyra', {
  // ── Timer & Proctoring ──────────────────────────────────────────────────
  registerTimerListener: (callback) => {
    const fn = (event, seconds) => callback(typeof seconds === 'number' ? Math.round(seconds) : seconds);
    ipcRenderer.on('timer', fn);
    return () => ipcRenderer.removeListener('timer', fn);
  },

  startProctoring: (opts) => ipcRenderer.invoke('start-proctoring', opts || {}),
  stopProctoring: () => ipcRenderer.invoke('stop-proctoring'),

  // ── Camera ─────────────────────────────────────────────────────────────
  registerCameraSnapListener: (callback) => {
    const fn = () => callback();
    ipcRenderer.on('camera-shot', fn);
    return () => ipcRenderer.removeListener('camera-shot', fn);
  },

  storeCameraSnap: (data) => ipcRenderer.invoke('store-camera-snap-image-on-disk', data),

  // ── Screen Capture ─────────────────────────────────────────────────────
  registerScreenSnapListener: (callback) => {
    const fn = (event, data) => callback(data);
    ipcRenderer.on('screen-snap-saved', fn);
    return () => ipcRenderer.removeListener('screen-snap-saved', fn);
  },

  captureScreen: () => ipcRenderer.invoke('capture-screen-snap'),
  storeScreenSnap: (data) => ipcRenderer.invoke('store-screen-snap-image-on-disk', data),

  // ── Snap Metadata ──────────────────────────────────────────────────────
  getSnapCounts: () => ipcRenderer.invoke('get-snap-counts'),
  getSnapDirs: () => ipcRenderer.invoke('get-snap-dirs'),

  // ── Theme ──────────────────────────────────────────────────────────────
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  getTheme: () => ipcRenderer.invoke('get-theme'),

  // ── Backend API & Port ────────────────────────────────────────────────
  apiRequest: (endpoint, options) => ipcRenderer.invoke('api-request', { endpoint, options }),
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),
  registerBackendPortListener: (callback) => {
    const fn = (event, port) => callback(port);
    ipcRenderer.once('backend-port', fn);
    return () => ipcRenderer.removeListener('backend-port', fn);
  },

  // ── App Info ───────────────────────────────────────────────────────────
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // ── Rules Dialog ───────────────────────────────────────────────────────
  showRules: () => ipcRenderer.send('show-rules'),

  // ─── Legacy aliases (backward compat with any remaining old references) ─
  startTimerOnMain: () => ipcRenderer.invoke('start-timer'),
  stopProctoringOnMain: () => ipcRenderer.invoke('stop-proctoring'),
  registerListenerForTimerTickFromMain: (cb) => {
    const fn = (event, val) => cb(val);
    ipcRenderer.on('timer', fn);
    return () => ipcRenderer.removeListener('timer', fn);
  },
  registerListenerForCameraSnapFromMain: (cb) => {
    const fn = () => cb();
    ipcRenderer.on('camera-shot', fn);
    return () => ipcRenderer.removeListener('camera-shot', fn);
  },
  registerListenerForScreenSnapFromMain: (cb) => {
    const fn = (event, d) => cb(d);
    ipcRenderer.on('screen-snap-saved', fn);
    return () => ipcRenderer.removeListener('screen-snap-saved', fn);
  },
  storeCameraSnapImageOnDisk: (data) => ipcRenderer.invoke('store-camera-snap-image-on-disk', data),
  captureScreenSnap: () => ipcRenderer.invoke('capture-screen-snap'),
  storeScreenSnapImageOnDisk: (data) => ipcRenderer.invoke('store-screen-snap-image-on-disk', data),
});

// Also expose as window.athena for backward compatibility
contextBridge.exposeInMainWorld('athena', {
  startTimerOnMain: () => ipcRenderer.invoke('start-timer'),
  stopProctoringOnMain: () => ipcRenderer.invoke('stop-proctoring'),
  registerListenerForTimerTickFromMain: (cb) => {
    const fn = (_, v) => cb(v);
    ipcRenderer.on('timer', fn);
    return () => ipcRenderer.removeListener('timer', fn);
  },
  registerListenerForCameraSnapFromMain: (cb) => {
    const fn = () => cb();
    ipcRenderer.on('camera-shot', fn);
    return () => ipcRenderer.removeListener('camera-shot', fn);
  },
  registerListenerForScreenSnapFromMain: (cb) => {
    const fn = (_, d) => cb(d);
    ipcRenderer.on('screen-snap-saved', fn);
    return () => ipcRenderer.removeListener('screen-snap-saved', fn);
  },
  storeCameraSnapImageOnDisk: (data) => ipcRenderer.invoke('store-camera-snap-image-on-disk', data),
  captureScreenSnap: () => ipcRenderer.invoke('capture-screen-snap'),
  storeScreenSnapImageOnDisk: (data) => ipcRenderer.invoke('store-screen-snap-image-on-disk', data),
  showRules: () => ipcRenderer.send('show-rules'),
});
