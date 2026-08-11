const fs = require('fs');
const opa = require('@open-policy-agent/opa-wasm');

// Carrega o arquivo Wasm da política
const policyWasm = fs.readFileSync('policy.wasm');


// Função para validar a credencial usando a política OPA
async function validarCredencial(credencialInput) {
    // Carrega o OPA
    const policy = await opa.loadPolicy(policyWasm);
    
    // Executa a avaliação (passando o input dinâmico)
    const resultSet = policy.evaluate(credencialInput);

    // O result set[0].result é o valor de "allow" (true/false)
    const isAllowed = resultSet[0].result;
    
    return isAllowed;
}

// SIMULAÇÃO

// Input 1: Credencial Válida
const credencialBoa = {
    "model": "FutureFlyer-X1",
    "weight": 2000,
    "battery_cycles": 500,
    "automationLevel": "onboard pilot"
};

// Input 2: Credencial Inválida (Peso alto)
const credencialRuim = {
    "model": "FutureFlyer-X1",
    "weight": 3000,
    "battery_cycles": 500,
    "automationLevel": "fully autonomous"
};

(async () => {
    console.log("Testando Credencial Válida...");
    const resultado1 = await validarCredencial(credencialBoa);
    console.log("Permitido?", resultado1); // Esperado: true

    console.log("\nTestando Credencial Inválida...");
    const resultado2 = await validarCredencial(credencialRuim);
    console.log("Permitido?", resultado2); // Esperado: false
})();