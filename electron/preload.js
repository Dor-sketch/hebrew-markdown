const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    openFile: () => ipcRenderer.invoke('open-file'),
    saveFile: (content, suggestedName) => ipcRenderer.invoke('save-file', content, suggestedName),
    saveFileAs: (content, suggestedName) => ipcRenderer.invoke('save-file-as', content, suggestedName),

    // Menu event listeners
    onMenuOpen: (callback) => ipcRenderer.on('menu-open', callback),
    onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
    onMenuSaveAs: (callback) => ipcRenderer.on('menu-save-as', callback)
});
