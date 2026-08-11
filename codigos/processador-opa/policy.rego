package vertiport.validation

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
