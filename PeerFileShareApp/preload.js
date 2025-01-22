const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getLocalIp: () => ipcRenderer.invoke('get-local-ip'),
    getSharedDirs: () => ipcRenderer.invoke('get-shared-dirs'),
    getFiles: (dirType) => ipcRenderer.invoke('get-files', dirType),
    moveFileToPrivate: (filename) => ipcRenderer.invoke('move-file-to-private', filename),
    moveFileToPublic: (filename) => ipcRenderer.invoke('move-file-to-public', filename),
    getPeerFiles: (peerIp) => ipcRenderer.invoke('get-peer-files', peerIp),
    downloadFile: (peerIp, filename) => ipcRenderer.invoke('download-file', peerIp, filename)
});
