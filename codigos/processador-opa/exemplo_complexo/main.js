const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const opa = require('@open-policy-agent/opa-wasm');

let mainWindow;
let policy;

// 1. Carrega o OPA Wasm assim que o App abre
async function carregarOPA() {
    const wasmPath = path.join(__dirname, 'policy.wasm');
    const wasmBuffer = fs.readFileSync(wasmPath);
    policy = await opa.loadPolicy(wasmBuffer);
    console.log("OPA Wasm carregado com sucesso!");
}

function createWindow() {
    // 2. Cria a janela visual
    mainWindow = new BrowserWindow({
        width: 800,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Ponte de segurança
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadFile('index.html');
}

// 3. Inicialização do App
app.whenReady().then(async () => {
    await carregarOPA();
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// A LÓGICA DO OPA
ipcMain.handle('checar-voo', async (event, dadosDoVoo) => {
    try {
        if (!policy) throw new Error("OPA ainda não carregou.");
        
        // 1. Avalia a política
        const execution = policy.evaluate(dadosDoVoo);
        
        // 2. O resultado agora é um Objeto { allow: bool, deny: [] }
        const output = execution[0].result;
        
        const aprovado = output.allow;
        const listaDeErros = output.deny || []; // Pega a lista ou vazio se não tiver

        // 3. Formata a mensagem para a tela
        let mensagemFinal = "";
        
        if (aprovado) {
            mensagemFinal = "Voo Autorizado!";
        } else {
            // Se tiver erros, junta todos eles numa frase
            if (listaDeErros.length > 0) {
                mensagemFinal = "BLOQUEADO: " + listaDeErros.join(" | ");
            } else {
                mensagemFinal = "BLOQUEADO PELO SISTEMA (Regra Genérica).";
            }
        }

        return { 
            aprovado: aprovado, 
            detalhes: mensagemFinal
        };

    } catch (erro) {
        console.error(erro);
        return { aprovado: false, detalhes: "Erro Técnico: " + erro.message };
    }
});