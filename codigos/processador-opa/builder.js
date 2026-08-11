const fs = require('fs');
const { execSync } = require('child_process');

// 1. CONTEÚDO DO JSON (UTF-8 Garantido)
const jsonContent = {
    "battery_cycles": {
        "max": 1000,
        "error": "Bateria velha demais"
    },
    "weight": {
        "max": 2500,
        "error": "Peso excedido"
    },
    "automationLevel": {
        "allowed": ["onboard pilot", "remote pilot"],
        "error": "Automacao proibida"
    }
};

// 2. CONTEÚDO DO REGO (Endereço correto dos dados)
const regoContent = `package vertiport.validation

default allow = false

# Permite se nao houver negacoes
allow = true if {
    count(deny) == 0
}

# Regra para MAXIMO
deny contains msg if {
    some field
    # Acessa diretamente o JSON carregado em data.regras_vertiport
    rule := data.regras_vertiport[field]
    rule.max
    
    input_value := input[field]
    input_value > rule.max
    
    msg := sprintf("FALHA MAX em %v: Valor %v > %v", [field, input_value, rule.max])
}

# Regra para LISTA
deny contains msg if {
    some field
    rule := data.regras_vertiport[field]
    rule.allowed
    
    input_value := input[field]
    not array_contains(rule.allowed, input_value)
    
    msg := sprintf("FALHA LISTA em %v: Valor '%v' nao aceito", [field, input_value])
}

array_contains(arr, elem) if {
    arr[_] == elem
}
`;

console.log("1. Criando arquivos com codificação UTF-8...");
fs.writeFileSync('regras_vertiport.json', JSON.stringify(jsonContent, null, 2), 'utf8');
fs.writeFileSync('policy.rego', regoContent, 'utf8');

console.log("2. Executando OPA Build...");
try {
    // Roda o comando do OPA
    execSync('.\\opa.exe build -t wasm -e "vertiport/validation/allow" policy.rego regras_vertiport.json');
    console.log("   Build Sucesso!");
} catch (e) {
    console.error("   Erro no Build:", e.message);
    process.exit(1);
}

console.log("3. Extraindo policy.wasm...");
try {
    // Tenta extrair. Se falhar com barra, tenta sem.
    try {
        execSync('tar -xzvf bundle.tar.gz policy.wasm');
    } catch {
        execSync('tar -xzvf bundle.tar.gz /policy.wasm');
    }
    console.log("   Extração Sucesso!");
} catch (e) {
    console.error("   Erro no Tar:", e.message);
}