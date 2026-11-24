'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tpms', {
  call: (method, ...args) => ipcRenderer.invoke('api', method, args),
  checkPostcode: (pc) => ipcRenderer.invoke('postcode:check', pc),
  pdf: (kind, id, opts) => ipcRenderer.invoke('doc:pdf', kind, id, opts),
  saveText: (name, content) => ipcRenderer.invoke('file:saveText', name, content),
  openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  showItem: (p) => ipcRenderer.invoke('shell:showItem', p),
  info: () => ipcRenderer.invoke('app:info'),
});
