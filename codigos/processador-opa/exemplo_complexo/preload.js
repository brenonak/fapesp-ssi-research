const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('uatm', {
    // Cria uma função que o HTML pode chamar
    validarVoo: (dados) => ipcRenderer.invoke('checar-voo', dados)
});