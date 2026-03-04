const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (content, options) => ipcRenderer.invoke('dialog:saveFile', content, options),
});
