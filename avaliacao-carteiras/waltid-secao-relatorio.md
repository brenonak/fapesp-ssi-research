# Avaliação Operacional e Mapeamento Funcional — Walt.id (Community Stack)

> Ambiente: Windows 11 Pro 25H2 (build 26200), AMD Ryzen 5 8600G (6C/12T), 32 GB RAM.
> Todos os números abaixo são rastreáveis aos logs de terminal indicados entre colchetes.

---

## 1. Ambiente de infraestrutura

### 1.1 Configuração de virtualização

O host foi preparado com os recursos de virtualização do Windows 11 Pro habilitados via
PowerShell: Hyper-V (`Microsoft-Hyper-V-All`), Plataforma de Hipervisor do Windows /
WHPX (`HypervisorPlatform`) e Plataforma de Máquina Virtual (`VirtualMachinePlatform`).

**[MEDIDO]** Tempos de habilitação das features `[02-habilitar-hyperv]`:
- `Microsoft-Hyper-V-All`: 12,53 s
- `HypervisorPlatform` (WHPX): 1,39 s

**[MEDIDO]** Validação pós-reinício `[03-validacao-pos-boot]`:
- As três features retornaram estado `Enabled`.
- Serviço `vmms` (gestão de VM do Hyper-V): `Running` / `Automatic`.
- `hypervisorlaunchtype`: `Auto` (o hipervisor é carregado no boot).
- Versão canônica do SO: build 26200, `DisplayVersion` 25H2.

**[RESSALVA]** O campo `WindowsProductName` retornou "Windows 10 Pro" por
retrocompatibilidade de registro (a Microsoft não atualizou a string `ProductName` na
transição para o Windows 11). O build 26200 confirma Windows 11 Pro. O discriminador
confiável de versão é `[System.Environment]::OSVersion.Version` + `DisplayVersion`, não
`WindowsProductName`.

**[RESSALVA]** A medição de RAM do hipervisor em repouso (baseline 17.652 MB → pós-ativação
17.848 MB) ficou dentro da margem de ruído entre sessões de boot distintas; o custo estático
não é mensurável de forma significativa em repouso. A medição de consumo relevante foi feita
sob carga (Seção 3).

### 1.2 Backend do Docker Desktop: investigação de isolamento

Docker Desktop 4.69.0 (engine 29.4.0), instalação all-users (`C:\Program Files\Docker`,
registro em HKLM) `[B1d-modo-instalacao]`.

Foi conduzida uma investigação para operar o Docker sob backend **Hyper-V** (isolamento por
VM real, hipervisor Tipo 1), em contraste com o padrão **WSL2**. A migração foi realizada
pela UI (Settings → General → "Use the WSL 2 based engine") e validada:

**[MEDIDO]** Prova da migração para Hyper-V `[B1e-validacao-migracao]`:
- `docker info` Kernel: `6.12.76-linuxkit` (antes: `6.6.114.1-microsoft-standard-WSL2`).
- `Get-VM` listou `DockerDesktopVM` em estado `Running` (2048 MB, 12 vCPU).
- Teste funcional `hello-world` executou em 6,3 s.
- Custo de RAM da VM utilitária em repouso: ~1,13 GB (host: 17.652 → 16.491 MB livres).

**[RESSALVA / correção metodológica]** O `Kernel Version` do `docker info` **não** é
discriminador confiável de backend nesta versão: tanto WSL2 quanto Hyper-V reportam
`-linuxkit`. O discriminador confiável é o par `WslEngineEnabled` (settings-store.json) +
estado da `DockerDesktopVM` via `Get-VM`. A string `-microsoft-standard-WSL2` observada
inicialmente pertencia a uma configuração anterior; a versão 29.4 abstrai o kernel.

### 1.3 Achado: instabilidade do backend Hyper-V sob orquestração pesada

Ao tentar subir o stack de 13 contêineres da Walt.id sob backend Hyper-V, o engine do Docker
falhou de forma **consistente e reproduzível**.

**[MEDIDO]** Sintoma `[B2-deploy-waltid]`, `[B2c-retomada-deploy]`:
- Erro `error during connect: ...dockerDesktopLinuxEngine...: EOF` ao criar o 7º–8º contêiner.
- O engine reiniciava a `DockerDesktopVM` (poweroff gracioso confirmado em `init.log`,
  sem OOM nem crash de kernel) `[B2b-diagnostico-falha]`.
- Falha independente do contêiner específico (ocorreu em `caddy` e em `wallet-api2`).

**[INTERPRETAÇÃO]** A falha não decorreu de falta de recurso (a VM tinha teto de RAM de
1 TB, `DynamicMemory: False`) nem de contêiner específico, mas do ato de **criar múltiplos
contêineres em rajada**. Consulta ao repositório oficial `docker/for-win` confirmou tratar-se
de fragilidade conhecida e recorrente do backend Hyper-V em versões recentes do Docker Desktop
(múltiplas issues abertas com a mesma assinatura `EOF` no pipe `dockerDesktopLinuxEngine`).

**[INTERPRETAÇÃO — barreira de DX]** O backend Hyper-V, por usar uma VM utilitária com
alocação de memória fixa e file-sharing negociado por bind-mount (mutagen), mostrou-se menos
tolerante a picos de criação de contêineres do que o WSL2 (memória dinâmica, filesystem
compartilhado nativamente). Trata-se de um trade-off real entre **isolamento** (VM Tipo 1) e
**elasticidade/estabilidade** (WSL2) — dado qualitativo relevante para avaliação de Developer
Experience.

**[DECISÃO METODOLÓGICA]** Diante da impossibilidade de orquestrar o stack sob Hyper-V, o
backend foi revertido para WSL2 para cumprir o objetivo primário (avaliar as carteiras). A
justificativa da licença Pro permanece sustentada por: (a) exigência de instalação all-users
privilegiada para o backend Hyper-V; (b) necessidade da Plataforma de Hipervisor do Windows
(WHPX) para os emuladores Android das etapas seguintes (EUDI, Bifold).

---

## 2. Deploy do backend (WSL2)

Repositório: `walt-id/waltid-identity` (o antigo `waltid-walletkit` foi descontinuado em
Q3/2024). Fluxo: `git clone` → `cd docker-compose` → `docker compose up -d`.

**[MEDIDO]** Deploy `[B3-deploy-waltid-wsl2]`:
- Clone do repositório: 10,1 s (4.104 arquivos).
- Imagens totais em disco: ~7,5 GB (13 serviços). Maior: `waltid/wallet-api` (1,1 GB).
- Tempo de `compose up` (imagens em cache): 146,3 s (provisionamento completo).
- Resultado: **13 de 13 contêineres `Up`**, Postgres `(healthy)`, zero `EOF`.

**[MEDIDO]** Warm-start (religar pós-reinício do host) `[B5-religar-pos-reinicio]`: 1,6 s.

**[INTERPRETAÇÃO]** O contraste 146,3 s (cold provisioning) vs 1,6 s (warm restart)
quantifica a diferença entre *provisionar* (criar rede, volumes e contêineres do zero) e
*religar* (reiniciar contêineres existentes). O `docker compose up -d` demonstrou-se
idempotente e resiliente a reinício abrupto do host (contêineres em `Exited (255)` retomados
sem intervenção manual).

### 2.1 Serviços e portas mapeados

| Serviço | Porta | Função |
|---|---|---|
| wallet-api | 7001 | API de gestão de carteira (custodial) — expõe Swagger UI |
| issuer-api | 7002 | API de emissão de credenciais |
| verifier-api | 7003 | API de verificação de credenciais |
| waltid-web-wallet | 7101 | Frontend da carteira (PWA) |
| web-portal | 7102 | Portal de issuer/verifier |
| dev-wallet | 7104 | Variante de desenvolvimento da carteira |
| postgres | 5432 | Banco de dados |
| caddy | 7001-7006, 7101-7105, 8080 | Reverse-proxy (ponto de entrada) |
| vc-repo | 3000 (interno) | Repositório de credenciais |

**[MEDIDO]** Prova de vida das APIs core (HTTP 200): 7001, 7002, 7003 `[B3, B5]`.

---

## 3. Consumo de recursos (sob WSL2, stack ocioso)

**[MEDIDO]** `docker stats` — snapshot em repouso pós-boot `[B3-deploy-waltid-wsl2]`:

| Contêiner | RAM | Observação |
|---|---|---|
| wallet-api-1 | 360,7 MiB | JVM (Kotlin) — maior consumidor |
| verifier-api2-1 | 263,9 MiB | JVM |
| issuer-api-1 | 265,3 MiB | JVM |
| wallet-api2-1 | 241,0 MiB | JVM |
| issuer-api2-1 | 205,4 MiB | JVM |
| verifier-api-1 | 188,0 MiB | JVM |
| postgres-1 | 63,9 MiB | banco |
| waltid-dev-wallet-1 | 46,7 MiB | frontend Nuxt |
| waltid-demo-wallet-1 | 46,1 MiB | frontend Nuxt |
| web-portal-1 | 28,2 MiB | frontend Next |
| vc-repo-1 | 27,2 MiB | Node |
| web-portal2-1 | 12,1 MiB | frontend Next |
| caddy-1 | 11,4 MiB | proxy |
| **Soma dos contêineres** | **≈ 1,76 GB** | CPU ~0% (ocioso) |

**[MEDIDO]** Impacto no host `[B3]`: RAM livre 15.963 → 9.771 MB (delta ≈ 6,2 GB).

**[INTERPRETAÇÃO — distinção importante]** "Consumo dos contêineres" (≈1,76 GB, via
`docker stats`) ≠ "impacto no host" (≈6,2 GB, via RAM livre). A diferença (~4,4 GB) é a
própria VM do WSL2 (`vmmem`): kernel Linux, engine e overhead de cache/build. Confundir as
duas métricas é erro comum; separá-las é necessário para rigor.

**[INTERPRETAÇÃO]** Os quatro maiores consumidores são as APIs Kotlin/JVM (wallet e issuer),
o que era esperado dado o footprint de memória da JVM. Os frontends (Nuxt e Next) e o proxy
são leves (11–47 MiB).

---

## 4. Mapeamento funcional dos frontends (raio-x arquitetural)

Método: impressão digital tecnológica via `Invoke-WebRequest` (headers, HTML inicial, assets)
`[B4-frontend-fingerprint]`, complementada por inspeção manual no DevTools (Console + Elements).

### 4.1 Achado central: duas stacks distintas no mesmo monorepo

**[MEDIDO]** Web Wallet (7101) e dev-wallet (7104):
- Header `X-Powered-By: Nuxt`; assets em `/_nuxt/`; runtime `node server/index.mjs` (Nitro).
- Console: `window.__NUXT__` retornou objeto (crava Nuxt).
- Elements: atributo `data-v-8ed1ef4b` (Vue scoped CSS); classes 100% Tailwind
  (ex.: `bg-gradient-to-br from-[#0573F0] flex w-full rounded-xl px-3 py-2`).
- HTML inicial ~7,1 KB.

**[MEDIDO]** Web Portal (7102):
- Header `X-Powered-By: Next.js`; assets em `/_next/static/`; bundler **Turbopack**;
  runtime `node server.js`.
- Console: `window.__NEXT_DATA__` retornou objeto; `buildId: xfMcwVEh64WqDxQt6BBqy`;
  `nextExport: true`, `autoExport: true` (indica **SSG**, não SSR).
- Elements: classes 100% Tailwind com tema customizado e valores arbitrários
  (ex.: `bg-gradient-to-r from-primary-400 to-primary-600 h-[225px] w-[360px] z-[-2]`).
- HTML inicial ~3,3 KB.

### 4.2 Tabela de arquitetura consolidada

| Dimensão | Web Wallet (7101) | Web Portal (7102) |
|---|---|---|
| Base | Vue | React |
| Framework | Nuxt | Next.js |
| Renderização | SSR (dinâmico por usuário) | SSG (`nextExport: true`) |
| Bundler | Vite (interno do Nuxt) | Turbopack |
| Motor de servidor | Nitro (`server/index.mjs`) | `node server.js` (serve estáticos) |
| Escopo de CSS | `<style scoped>` (`data-v-`) | sem scoped (React) |
| Estilização | Tailwind (utilitário) | Tailwind (utilitário) |
| Lib de componentes | Nenhuma (UI construída manualmente) | Nenhuma (UI construída manualmente) |
| Confirmador | `window.__NUXT__` | `window.__NEXT_DATA__` |

### 4.3 Interpretação arquitetural

**[INTERPRETAÇÃO]** A equipe manteve **coerência na filosofia de estilização** (Tailwind
utilitário em todo o monorepo, com rejeição explícita de bibliotecas de componentes
declarativas como Material-UI ou Vuetify) sobreposta a uma **diversidade de motores** (Vue/Nuxt
no Wallet, React/Next no Portal) e de **estratégias de renderização** (SSR no Wallet, SSG no
Portal). A escolha de renderização acompanha o caso de uso: carteira é conteúdo dinâmico por
usuário (SSR); portal de issuer/verifier tem telas relativamente fixas (SSG, mais leve e
cacheável).

**[INTERPRETAÇÃO — comparação com o ecossistema React/Next/MUI]** Nuxt e Next são frameworks
análogos (SSR/SSG, file-based routing, hidratação, code-splitting); diferem na base (Vue SFC
vs React JSX). Quanto à estilização, a Walt.id optou pela filosofia oposta ao MUI: em vez de
importar componentes prontos e declarativos, compôs a UI com classes utilitárias do Tailwind
— maior controle e bundle potencialmente menor, ao custo de mais código manual.

**[RESSALVA]** O marcador "Vite PRESENTE" nos frontends Nuxt foi um falso-positivo do script
de detecção (casou com `type="module"`, não exclusivo do Vite). O Nuxt 3 de fato usa Vite
internamente, mas a detecção foi por coincidência de padrão, não por prova direta.

**[RESSALVA]** O card inspecionado no Portal (`AlpsTourReservation`) é dado de
demonstração/seed (cenário fictício de reserva de tour), não funcionalidade estrutural do
portal.

---

## 5. Catalogação de funcionalidades (A6)

Método: inventário direto da instância em execução, extraindo a especificação OpenAPI de
cada serviço em `http://localhost:<porta>/api.json` `[B6b-localizar-spec]`,
`[B6c-inventario-final]`. As categorias abaixo são as próprias *tags* definidas pela Walt.id
na spec (não classificação do autor). Specs JSON cruas salvas como anexo
(`spec-ISSUER-porta7002.json`, `spec-VERIFIER-porta7003.json`, `spec-WALLET-porta7001.json`).

**[MEDIDO]** Contagem total de funcionalidades expostas (endpoints):

| Serviço | Versão da API | Funcionalidades |
|---|---|---|
| Wallet (Carteira) | 0.22.0 | 77 |
| Issuer (Emissor) | 0.22.0 | 28 |
| Verifier (Verificador) | 0.22.0 | 13 |
| **Total** | — | **118** |

**[INTERPRETAÇÃO]** A Carteira concentra 65% das funcionalidades (77/118), coerente com o
modelo SSI: o backend de carteira gerencia o ciclo de vida completo (chaves, DIDs, credenciais,
categorias, histórico, autenticação), enquanto Emissor e Verificador têm escopo mais focado. A
emissão expõe mais que a verificação (28 vs 13) por incluir todo o aparato de servidor OIDC.

### 5.1 Emissor (Issuer) — funcionalidades por categoria

| Categoria | Nº | Funcionalidades-chave |
|---|---|---|
| Credential Issuance | 6 | Emitir JWT (W3C), SD-JWT, mDoc; variantes em lote (`issueBatch`) |
| oidc | 16 | Maquinaria do protocolo OID4VCI (token, authorize, credential, well-known) |
| Onboarding Service | 3 | Onboard de emissor; IACAs e document-signers para ISO mDL |
| Feature management | 2 | Consulta de features registradas/estado |

**[INTERPRETAÇÃO]** Suporte comprovado aos três formatos de credencial: W3C VC (JWT),
SD-JWT VC (divulgação seletiva) e mDoc (ISO/IEC 18013-5, mDL). Os endpoints `oidc` são a
implementação do protocolo OID4VCI, não funcionalidades de usuário.

### 5.2 Verificador (Verifier) — funcionalidades por categoria

| Categoria | Nº | Funcionalidades-chave |
|---|---|---|
| Credential Verification | 4 | `verify`, consultar sessão, ver credenciais apresentadas, `policy-list` |
| OIDC | 3 | Fluxo OID4VP (verify por estado, presentation definition, request) |
| Ebsi | 3 | Suporte ao ecossistema europeu EBSI |
| Feature management | 2 | Consulta de features |

**[INTERPRETAÇÃO]** A verificação é baseada em **políticas configuráveis** (`policy-list`),
não apenas validação binária — funcionalidade relevante para casos de uso com regras de
confiança. Suporte a OID4VP e ao ecossistema EBSI.

### 5.3 Carteira (Wallet) — funcionalidades por categoria

| Categoria | Nº | Funcionalidades-chave |
|---|---|---|
| WalletCredentials | 11 | Guardar, aceitar, rejeitar, restaurar, categorizar, status |
| DIDs | 11 | Criar DIDs de 7 métodos (`key`, `jwk`, `web`, `ebsi`, `cheqd`, `iota`, import) |
| Keys | 10 | Gerar, importar, exportar, assinar, verificar chaves |
| Credential exchange | 9 | Fluxos OID4VCI/OID4VP (receber/apresentar credenciais) |
| Authentication | 5 | Registro, login, logout, sessão nativos |
| Issuers | 5 | Gerenciar emissores confiáveis |
| Keycloak Authentication | 4 | Autenticação via IdP externo (OIDC/Keycloak) |
| WalletCategories | 4 | Organizar credenciais em categorias |
| WalletCredential manifest | 4 | Exibição/metadados de credenciais |
| Outros | 14 | Accounts, DID Web Registry, Event Log, History, Settings, Reports, Utilities (`parseMDoc`), Transaction Data |

**[INTERPRETAÇÃO]** A Carteira cobre o ciclo de vida SSI completo. Dois achados relevantes
para a comparação futura com EUDI/Bifold: (a) suporte a **7 métodos DID distintos** — amplitude
alta; (b) **dois modelos de autenticação** (nativo + Keycloak/OIDC externo), indicando
flexibilidade de integração com provedores de identidade corporativos.

**[RESSALVA]** Esta catalogação reflete os endpoints *expostos* pela API na versão 0.22.0
instalada; não constitui teste de que cada endpoint funciona end-to-end (isso exigiria
execução individual de cada fluxo). É um inventário de superfície de API, primário e
reproduzível, não uma bateria de testes funcionais.

---

## 6. Síntese da etapa Walt.id

- Backend containerizado (13 serviços) operacional e estável sob WSL2; instável sob Hyper-V.
- Consumo em repouso: ~1,76 GB (contêineres) / ~6,2 GB (impacto no host).
- Frontends: arquitetura híbrida Vue/Nuxt (Wallet) + React/Next (Portal), unificada por
  Tailwind, sem bibliotecas de componentes declarativas.
- Funcionalidades catalogadas: 118 endpoints (77 Wallet + 28 Issuer + 13 Verifier), suporte a W3C VC, SD-JWT e mDoc, 7 métodos DID.
- Barreiras de entrada catalogadas: descontinuação do repositório antigo; mudança de
  local/nome do arquivo de config do Docker entre versões; instabilidade do backend Hyper-V
  para orquestração pesada; file-sharing negociado por bind-mount sob Hyper-V.

**Evidências (logs de terminal):** `00-baseline`, `02-habilitar-hyperv`, `03-validacao-pos-boot`, `04-hyperv-manager`, `B1d-modo-instalacao`, `B1e-validacao-migracao`, `B2-deploy-waltid`, `B2b-diagnostico-falha`, `B2c-retomada-deploy`, `B3-deploy-waltid-wsl2`, `B4-frontend-fingerprint`, `B5-religar-pos-reinicio`, `B6b-localizar-spec`, `B6c-inventario-final`.
`03-validacao-pos-boot`, `04-hyperv-manager`, `B1d-modo-instalacao`, `B1e-validacao-migracao`,
`B2-deploy-waltid`, `B2b-diagnostico-falha`, `B2c-retomada-deploy`, `B3-deploy-waltid-wsl2`,
`B4-frontend-fingerprint`, `B5-religar-pos-reinicio`.
**Marcos visuais:** `PRINT-01-hyperv-manager`.
