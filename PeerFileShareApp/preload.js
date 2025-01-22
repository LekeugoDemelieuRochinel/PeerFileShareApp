const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getSharedDirs: () => ipcRenderer.invoke('get-shared-dirs'),
    getLocalIp: () => ipcRenderer.invoke('get-local-ip')
});
