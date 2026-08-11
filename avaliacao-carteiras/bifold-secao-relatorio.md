# Avaliação Operacional e Mapeamento Funcional — Bifold Wallet (OpenWallet Foundation)

> Ambiente: Windows 11 Pro 25H2 (build 26200), AMD Ryzen 5 8600G, 32 GB RAM.
> Artefato: `openwallet-foundation/bifold-wallet` (sample app `com.ariesbifold`, Version 1.0 Build 1),
> compilado do código-fonte. Ex-Hyperledger Aries Bifold; React Native + Credo.

---

## 1. Enquadramento metodológico

A Bifold difere das outras duas carteiras por **não distribuir APK pronto**: o repositório de
referência é um **monorepo de bibliotecas** (React Native) para desenvolvedores construírem sua
própria carteira. O app compilável está em `samples/app`.

**[DECISÃO METODOLÓGICA]** Manteve-se a simetria de "avaliar cada carteira pelo seu modo nativo de
distribuição": Walt.id (imagens Docker prontas → orquestração), EUDI (APK pronto → instalação),
Bifold (código-fonte → **compilação**). A necessidade de compilar é, ela própria, o achado central
de barreira de entrada da Bifold.

---

## 2. Escala de fricção da toolchain (achado central de DX)

A preparação do ambiente exigiu instalações/configurações em cadeia, cada uma uma barreira:

| # | Barreira encontrada | Resolução | Evidência |
|---|---|---|---|
| 1 | JDK do sistema (v8) incompatível com React Native | Instalar JDK 17 | `[B2-toolchain]` |
| 2 | `JAVA_HOME`/`ANDROID_HOME` não configuradas | Definir variáveis de usuário | `[B2-toolchain]` |
| 3 | Yarn ausente | Corepack (Yarn 4.9.2) | `[B3]`,`[B6]` |
| 4 | Repo é monorepo de biblioteca, não app | Localizar `samples/app` | `[B4-instrucoes-build]` |
| 5 | Node do sistema (v22) ≠ exigido (v20.19.2) | Node 20 portátil isolado | `[B4]`,`[B6]` |
| 6 | winget falha ao baixar do GitHub (`0x80072f0d`) | Download manual/portátil | `[B5-nvm]` |
| 7 | Corepack em modo interativo trava o build | Confirmação manual [Y] | `[B7-yarn-install]` |
| 8 | NDK (toolchain nativo C/C++) ausente | Gradle baixou automaticamente | `[B8-build-android]` |
| 9 | Pacotes internos do monorepo não compilados | `yarn build` dos workspaces | `[B9-build-workspaces]` |

**[INTERPRETAÇÃO]** A Bifold apresentou a **maior barreira de entrada das três carteiras por larga
margem**: 9 pontos de fricção distintos vs. instalação direta da EUDI e `docker compose` da Walt.id.
Isto quantifica a escala de esforço de integração: *orquestrar imagem << instalar APK << compilar do
código-fonte*.

---

## 3. Dependências nativas (arquitetura confirmada pelo build)

**[MEDIDO]** O `yarn install` `[B7]` expôs a árvore de dependências: `@credo-ts/core`,
`@credo-ts/anoncreds`, `@credo-ts/askar`, `@credo-ts/didcomm`, `@credo-ts/indy-vdr`,
`@hyperledger/anoncreds-shared`, `@hyperledger/indy-vdr-shared`, `@openwallet-foundation/askar-shared`.
1.680 pacotes, 721 MiB. Três libs nativas exigiram build (`YN0007`): `anoncreds-react-native`,
`indy-vdr-react-native`, `askar-react-native` (bibliotecas Rust).

**[INTERPRETAÇÃO]** A Bifold é construída sobre **Credo (ex-Aries Framework JS)** + bibliotecas
**Rust** do ecossistema Hyperledger/OpenWallet. É a única das três com dependências nativas Rust
(exigindo NDK), o que explica a complexidade superior do build. O DNA Aries/Indy/AnonCreds a
distingue arquiteturalmente das outras (Walt.id em Kotlin/JVM; EUDI em Kotlin nativo Android).

---

## 4. Métricas de build (dados de A5)

**[MEDIDO]**
- `yarn install`: 180,4 s; 1.680 pacotes; 778 subpastas em node_modules; ~4,5 GB de RAM `[B7]`.
- Build nativo Android (Gradle): **BUILD SUCCESSFUL in 12m 34s**; 867 tarefas; incluiu download
  automático do NDK 27.1 e compilação das libs Rust `[B8]`.
- APK debug gerado: **203,3 MB** `[B9pre-retomada]`.
- `yarn build` dos workspaces (compilar pacotes TS internos): 38,2 s `[B9]`.

**[RESSALVA]** O primeiro `run-android` compilou o APK nativo com sucesso, mas o app exibiu tela
vermelha (Metro erro 500) por dois motivos sequenciais, ambos resolvidos: (a) pacotes internos do
monorepo não compilados → resolvido com `yarn build`; (b) Metro não estava em execução → resolvido
com `yarn start` + `adb reverse tcp:8081`. Documenta a fricção de que o build nativo bem-sucedido
não basta: o monorepo exige compilação de workspaces + dev server ativo.

**[RESSALVA — estabilidade do host]** Durante a jornada Bifold houve reinícios inesperados da
máquina (travamentos + queda de energia). O trabalho pesado (yarn install, APK compilado)
persistiu em disco e foi retomável sem recompilação, mas registra-se que builds longos sob
virtualização pesada estressam o host.

---

## 5. Mapeamento funcional (A6) — app em execução

Método: exploração da interface do sample app rodando no emulador (Android 15/API 35, acelerado
por WHPX). PIN de teste configurado.

### 5.1 Fluxo de onboarding e segurança

| Tela | Função |
|---|---|
| Onboarding | Introdução (conteúdo placeholder "Lorem ipsum" — é app de referência) |
| Terms & Conditions | Aceite de termos obrigatório |
| Create a PIN | PIN de 6 dígitos obrigatório ("Secure your Aries wallet") |
| Biometrics | Desbloqueio biométrico opcional (indisponível no emulador sem biometria) |

**[INTERPRETAÇÃO]** O conteúdo placeholder confirma que `samples/app` é prova de conceito para
integradores customizarem, não produto final — coerente com a natureza de framework da Bifold.

### 5.2 Estrutura principal

| Área | Função | Padrão associado |
|---|---|---|
| Notifications | Avisos e ofertas recebidas | DIDComm |
| Scan (central) | Ler QR para receber/apresentar credencial | QR / DIDComm / OID4VCI |
| Credentials | Carteira de credenciais armazenadas | AnonCreds / W3C VC |
| Contacts (Settings) | Conexões persistentes com emissores/verificadores | **DIDComm** |

**[INTERPRETAÇÃO — achado distintivo]** A presença de **"Contacts"** (conexões persistentes) é
marca do paradigma **DIDComm/Aries**: diferente do modelo transacional OID4VP da EUDI, a Bifold
estabelece relações duráveis entre agentes. O centro da UI é o **Scan (QR)**, refletindo o fluxo
de conexão via QR do ecossistema Aries — contraste com a EUDI (centrada em Authenticate/Sign).

### 5.3 Configurações e formatos

**[MEDIDO]** Settings: Contacts, Biometrics (Off), Change PIN, Language (English), Auto lock time
(5 min). Version 1.0 Build (1).

**[MEDIDO/documentação]** Especificações suportadas (README): protocolos DIDComm v1 (AIP 2),
OID4VCI, OID4VP 1.0, ISO 18013-7; formatos AnonCreds, SD-JWT, mDoc (ISO 18013-5), W3C VCDM 1.1/2.0;
métodos DID did:indy, did:web, did:key, did:jwk, did:peer, did:webvh.

**[RESSALVA]** Formatos da documentação; catalogação de interface + capacidades declaradas, sem
teste E2E de emissão (carteira permaneceu vazia — simetria com Walt.id e EUDI).

---

## 6. Síntese da etapa Bifold

- Build do código-fonte **bem-sucedido** (APK nativo 203 MB compilado; app rodando no emulador).
- Maior barreira de entrada das três carteiras: 9 pontos de fricção documentados.
- Única com dependências nativas Rust (Credo + Hyperledger anoncreds/indy-vdr/askar), exigindo NDK.
- Diferencial funcional: modelo **DIDComm/Aries** com Contacts (conexões persistentes) e UI
  centrada em Scan/QR.
- App de referência com conteúdo placeholder (framework para customização, não produto final).

**Evidências (logs):** `B1-recon-ambiente-build`, `B2-toolchain`, `B3-validacao-clone`,
`B4-instrucoes-build`, `B5-nvm-node20`, `B6-node-portatil`, `B6b-reinjetar-node20`,
`B7-yarn-install` (+RAW), `B8-build-android` (+RAW), `B9pre-retomada`, `B9-build-workspaces` (+RAW).
**Marcos visuais:** Metro bundler; telas vermelhas (fricção de build); onboarding, Create PIN,
Biometrics, Notifications, Settings, Credentials do app rodando.
