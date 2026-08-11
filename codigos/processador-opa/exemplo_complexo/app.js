const fs = require('fs');
const opa = require('@open-policy-agent/opa-wasm');

// Verifica se o arquivo 'policy.wasm' existe
if (!fs.existsSync('policy.wasm')) {
    console.error("ERRO: 'policy.wasm' não encontrado. Rode 'node builder.js' primeiro.");
    process.exit(1);
}

const policyWasm = fs.readFileSync('policy.wasm');

// Função auxiliar para carregar e avaliar
async function validarAcesso(inputData) {
    const policy = await opa.loadPolicy(policyWasm);
    const results = policy.evaluate(inputData);
    return results[0].result;
}

// CENÁRIOS DE TESTE

// 1. Piloto Perfeito, Tempo Bom, Credencial da ANAC -> DEVE PASSAR
const vooNormal = {
    "operation_type": "flight",
    "pilot": { 
        "id": "did:pilot:joao-silva", 
        "certs": ["COMMERCIAL_PILOT", "NIGHT_FLIGHT", "URBAN_AIR_MOBILITY_V1"],
        
        // [NOVO] A credencial agora é obrigatória para passar na Regra 7
        "credential": {
            "type": "PilotLicense",
            "issuer": "did:web:anac.gov.br", // <--- VÁLIDO (Está na lista do builder.js)
            "expiration": "2030-12-31"
        }
    },
    "passengers": [
        { "id": "cpf:111.222.333-44" }, 
        { "id": "passport:OK12345" }    
    ],
    "aircraft": { "model": "FutureFlyer-X1" }, 
    "weather": { 
        "wind_speed": 10,  
        "visibility": 1000 
    }
};

// 2. PASSAGEIRO NA BLACKLIST (Deve falhar)
const vooComCriminoso = {
    ...vooNormal, // Copia tudo do voo normal
    "passengers": [
        { "id": "cpf:111.222.333-44" },
        { "id": "cpf:123.456.789-00" } // <--- ESTE ESTÁ NA BLACKLIST
    ]
};

// 3. MANUTENÇÃO: MECÂNICO AUTORIZADO (Deve passar)
const manutencaoOk = {
    "operation_type": "maintenance",
    "mechanic": { "id": "did:mech:senior-01" }, // <--- ESTÁ NA WHITELIST
    "aircraft": { "model": "CargoDrone-Z9" }
};

// 4. MANUTENÇÃO: ESTAGIÁRIO (Deve falhar)
const manutencaoProibida = {
    "operation_type": "maintenance",
    "mechanic": { "id": "did:mech:estagiario-junior" }, // <--- NÃO ESTÁ NA WHITELIST
    "aircraft": { "model": "CargoDrone-Z9" }
};

// 5. FALHA DE VISIBILIDADE (Regra Climática)
const vooSemVisibilidade = {
    ...vooNormal,
    "weather": {
        "wind_speed": 10,
        "visibility": 200 // <--- MUITO BAIXO
    }
};

// EMISSOR DA CREDENCIAL DESCONHECIDO (Deve falhar)
// Tudo está perfeito, mas a carteira foi emitida por "Escola Pirata"
const vooEmissorFalso = {
    ...vooNormal,
    "pilot": {
        ...vooNormal.pilot,
        "credential": {
            "type": "PilotLicense",
            "issuer": "did:web:escola-de-voo-pirata", // <--- NÃO ESTÁ NA LISTA DE CONFIANÇA
            "expiration": "2030-12-31"
        }
    }
};

// --- EXECUÇÃO DOS TESTES ---
(async () => {
    console.log("\n SISTEMA DE CONTROLE DE VERTIPORTO (UATM) \n");

    const executarTeste = async (nome, input, esperado) => {
        const resultado = await validarAcesso(input);
        const icon = resultado === esperado ? "✅" : "❌ ERRO";
        const statusTexto = resultado ? "AUTORIZADO" : "NEGADO";
        console.log(`${icon} ${nome}: ${statusTexto} (Esperado: ${esperado})`);
    };


    await executarTeste("Voo Comercial Padrão (ANAC)", vooNormal, true);
    await executarTeste("Segurança: Passageiro Bloqueado", vooComCriminoso, false);
    await executarTeste("Manutenção: Mecânico Senior", manutencaoOk, true);
    await executarTeste("Manutenção: Mecânico Não Listado", manutencaoProibida, false);
    await executarTeste("Clima: Visibilidade Baixa", vooSemVisibilidade, false);
    await executarTeste("Governança: Emissor Não Confiável", vooEmissorFalso, false);

    console.log("\n------------------------------------------------");
})();
