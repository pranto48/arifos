const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lifeosDesktop', {
  isDesktop: true,
  getServerUrl: () => ipcRenderer.invoke('desktop:getServerUrl'),
  setServerUrl: (serverUrl) => ipcRenderer.invoke('desktop:setServerUrl', serverUrl),
  getConfig: () => ipcRenderer.invoke('desktop:getConfig'),
  completeSetup: () => ipcRenderer.send('desktop:completeSetup'),
});
