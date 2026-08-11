package vertiport.complex_authz

regras := {
    "system_status": "active",
    "blocked_pilots": [
        "did:pilot:suspenso-01",
        "did:pilot:baderneiro"
    ],
    "blocked_passengers": [
        "cpf:123.456.789-00",
        "passport:AB98765"
    ],
    "approved_mechanics": [
        "did:mech:senior-01",
        "did:mech:senior-02"
    ],
    "trusted_issuers": [
        "did:web:anac.gov.br",
        "did:web:embraer.com",
        "did:web:faa.gov"
    ],
    "required_certs": [
        "COMMERCIAL_PILOT",
        "NIGHT_FLIGHT",
        "URBAN_AIR_MOBILITY_V1"
    ],
    "weather_limits": {
        "Heavy-Lift": {
            "max_wind": 60,
            "min_visibility": 200
        },
        "Light-Sport": {
            "max_wind": 30,
            "min_visibility": 800
        },
        "Passenger": {
            "max_wind": 45,
            "min_visibility": 500
        }
    },
    "aircraft_database": {
        "FutureFlyer-X1": "Passenger",
        "CargoDrone-Z9": "Heavy-Lift",
        "TinyBee-S2": "Light-Sport"
    }
}

default allow = false

# Regra Mestra
allow = true if {
    regras.system_status == "active"
    count(deny) == 0
}

# REGRA 1: Piloto (Blacklist)
deny contains msg if {
    pilot_id := input.pilot.id
    array_contains(regras.blocked_pilots, pilot_id)
    msg := sprintf("CRÍTICO: Piloto %v está SUSPENSO.", [pilot_id])
}

# REGRA 2: Passageiros (Blacklist)
deny contains msg if {
    passageiro := input.passengers[_]
    array_contains(regras.blocked_passengers, passageiro.id)
    msg := sprintf("SEGURANÇA: Passageiro %v está na Lista No-Fly.", [passageiro.id])
}

# REGRA 3: Mecânico (Whitelist)
deny contains msg if {
    input.operation_type == "maintenance"
    mecanico_id := input.mechanic.id
    not array_contains(regras.approved_mechanics, mecanico_id)
    msg := sprintf("ACESSO NEGADO: Mecânico %v não é credenciado.", [mecanico_id])
}

# REGRA 4: Certificações (Sets)
deny contains msg if {
    input.operation_type == "flight"
    required_set := {c | c := regras.required_certs[_]}
    provided_set := {c | c := input.pilot.certs[_]}
    missing_certs := required_set - provided_set
    count(missing_certs) > 0
    msg := sprintf("FALTA CERTIFICAÇÃO: %v", [missing_certs])
}

# REGRA 5: Clima Dinâmico
deny contains msg if {
    input.operation_type == "flight"
    modelo := input.aircraft.model
    categoria := regras.aircraft_database[modelo]
    limites := regras.weather_limits[categoria]
    input.weather.wind_speed > limites.max_wind
    msg := sprintf("PERIGO CLIMÁTICO: Vento excessivo para %v", [categoria])
}

# REGRA 6: Visibilidade
deny contains msg if {
    modelo := input.aircraft.model
    categoria := regras.aircraft_database[modelo]
    limites := regras.weather_limits[categoria]
    vis_atual := input.weather.visibility
    vis_atual < limites.min_visibility
    msg := sprintf("VISIBILIDADE BAIXA: %vm < Mínimo %vm", [vis_atual, limites.min_visibility])
}

# --- NOVO ---
# REGRA 7: Emissor Confiável (Trusted Issuer)
# Verifica se a entidade que assinou a licença do piloto é confiável
deny contains msg if {
    input.operation_type == "flight"
    
    # 1. Extrai o emissor do JSON de entrada
    emissor_da_credencial := input.pilot.credential.issuer
    
    # 2. Verifica se NÃO está na lista de confiáveis
    not array_contains(regras.trusted_issuers, emissor_da_credencial)
    
    msg := sprintf("EMISSOR INVÁLIDO: Credencial emitida por '%v' não é aceita. Exigimos ANAC/Embraer.", [emissor_da_credencial])
}

# Funções Auxiliares
array_contains(arr, elem) if {
    arr[_] == elem
}
