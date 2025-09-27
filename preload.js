const { contextBridge, ipcRenderer } = require('electron');

const safeInvoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('electronAPI', {
    openFileDialog: (options) => ipcRenderer.invoke('dialog:open', options),
    loadVideoResource: (videoPath) => ipcRenderer.invoke('video:load', videoPath),
    getFolderStats: (folderPath) => ipcRenderer.invoke('folder:stats', folderPath),
    runAIPipeline: (payload) => ipcRenderer.invoke('ai:run', payload)
});
