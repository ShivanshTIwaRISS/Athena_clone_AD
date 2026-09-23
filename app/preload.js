/* global require */
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("athena", {
    registerListenerForTimerTickFromMain: (callback) => {
        const fn = (event, message) => {
            callback(message);
        };

        ipcRenderer.on('timer', fn);

        return () => {
            ipcRenderer.removeListener('timer', fn);
        };
    },
    startTimerOnMain: () => {
        try {
            return ipcRenderer.invoke('start-timer');
        } catch {
            throw new Error("Unable to start timer");
        }
    },
    stopProctoringOnMain: () => {
        try {
            return ipcRenderer.invoke('stop-proctoring');
        } catch {
            return false;
        }
    },

    // Functions related to capturing camera snaps of user
    registerListenerForCameraSnapFromMain: (callback) => {
        const fn = () => callback();
        ipcRenderer.on('camera-shot', fn);

        return () => {
            ipcRenderer.removeListener('camera-shot', fn);
        };
    },

    storeCameraSnapImageOnDisk: (data) => {
        return ipcRenderer.invoke('store-camera-snap-image-on-disk', data);
    },

    // Functions related to screen capture snapshots
    registerListenerForScreenSnapFromMain: (callback) => {
        const fn = (event, data) => callback(data);
        ipcRenderer.on('screen-snap-saved', fn);

        return () => {
            ipcRenderer.removeListener('screen-snap-saved', fn);
        };
    },

    captureScreenSnap: () => {
        return ipcRenderer.invoke('capture-screen-snap');
    },

    storeScreenSnapImageOnDisk: (data) => {
        return ipcRenderer.invoke('store-screen-snap-image-on-disk', data);
    },

    // Functions related to showing Contest Rules in a new Dialog
    showRules: () => {
        ipcRenderer.send("show-rules");
    }
});

