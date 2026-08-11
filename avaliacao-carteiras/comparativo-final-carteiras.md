# Análise Comparativa das Três Carteiras SSI — Walt.id, EUDI Wallet e Bifold

> Consolida os dados coletados nas avaliações individuais (seções Walt.id, EUDI e Bifold).
> Ambiente único de teste: Windows 11 Pro 25H2 (build 26200), AMD Ryzen 5 8600G (6C/12T,
> iGPU Radeon 760M), 32 GB RAM. Todos os dados são rastreáveis aos logs de terminal citados
> nas seções individuais.

---

## 1. Identificação e governança

| Dimensão | Walt.id | EUDI Wallet | Bifold |
|---|---|---|---|
| Mantenedor | walt.id (empresa) | Comissão Europeia | OpenWallet Foundation (Linux Foundation Europe) |
| Origem | Community Stack | ARF / eIDAS 2 | Ex-Hyperledger Aries Bifold |
| Repositório | `walt-id/waltid-identity` | `eu-digital-identity-wallet/eudi-app-android-wallet-ui` | `openwallet-foundation/bifold-wallet` |
| Versão avaliada | APIs 0.22.0 | 2026.07.39-Demo | 1.0 Build 1 (`com.ariesbifold`) |
| Natureza | Backend + web wallet (kit) | App de referência (produto) | Framework/monorepo (biblioteca) |

---

## 2. Arquitetura técnica

| Dimensão | Walt.id | EUDI Wallet | Bifold |
|---|---|---|---|
| Plataforma-alvo | Web / PWA | Android nativo | Android/iOS (React Native) |
| Linguagem/stack backend | Kotlin/JVM | Kotlin (Android) | TypeScript + Credo + Rust |
| Frontend | Nuxt (Vue) + Next.js (React), Tailwind | Nativo Android | React Native |
| Dependências nativas | Não (contêineres) | Nativo Android | **Rust** (anoncreds, indy-vdr, askar) → exige NDK |
| Base de credenciais | Credo-independente | — | Credo (ex-Aries Framework JS) |

**[INTERPRETAÇÃO]** Três paradigmas distintos de SSI: Walt.id como kit de APIs JVM orientado a
OID4VC; EUDI como app nativo Android alinhado ao eIDAS 2; Bifold como agente React Native de
tradição Hyperledger Aries/Indy. A Bifold é a única com dependências nativas Rust, o que eleva a
complexidade de build.

---

## 3. Modelo de distribuição e fricção de entrada (DX)

| Dimensão | Walt.id | EUDI Wallet | Bifold |
|---|---|---|---|
| Forma de obtenção | Imagens Docker prontas | APK pré-compilado | Código-fonte (compilar) |
| Ação de deploy | `docker compose up` | `adb install` | Build completo (Gradle + workspaces) |
| Nº de barreiras documentadas | ~3 (config, repo, backend) | ~0 (download + install) | **9** (toolchain completa) |
| Tempo até rodar | ~146 s (deploy) | ~4,5 s (install) | ~13 min (build nativo) + setup |
| Emulador/virtualização | — (roda no navegador) | Emulador Android (WHPX) | Emulador Android (WHPX) |

**[INTERPRETAÇÃO — escala de fricção]** A progressão de esforço de integração é clara e mensurável:
**orquestrar imagem (Walt.id) << instalar APK (EUDI) << compilar do código-fonte (Bifold)**. A
Bifold acumulou nove pontos de fricção distintos (JDK incompatível, variáveis de ambiente, Yarn,
monorepo, versão de Node, falha do winget com GitHub, Corepack interativo, NDK ausente, compilação
de workspaces), contra a instalação praticamente sem atrito da EUDI.

---

## 4. Consumo de recursos (medições no host)

| Métrica | Walt.id | EUDI Wallet | Bifold |
|---|---|---|---|
| Artefato em disco | ~7,5 GB (13 imagens) | 363 MB (APK) | 203 MB (APK debug) + ~721 MiB deps |
| RAM em execução (repouso) | ~1,76 GB (13 contêineres) | ~3,7 GB (emulador QEMU) | ~3,7 GB (emulador QEMU) |
| Impacto no host | ~6,2 GB | ~4,7 GB | ~4,7 GB + build |
| Maior consumidor unitário | wallet-api (360 MB, JVM) | processo QEMU | processo QEMU |

**[INTERPRETAÇÃO]** A carteira web containerizada (Walt.id) tem contêineres individualmente leves,
mas o stack completo (13 serviços + VM WSL2) pesa mais no host que um emulador único. As carteiras
mobile custam ~3,7 GB por emulador — o custo de emulação domina. Distinção metodológica registrada:
"consumo dos contêineres" (via `docker stats`) ≠ "impacto no host" (via RAM livre).

---

## 5. Funcionalidades e padrões suportados

| Dimensão | Walt.id | EUDI Wallet | Bifold |
|---|---|---|---|
| Método de mapeamento | API (OpenAPI/Swagger) | Navegação de interface | Navegação de interface |
| Nº de funcionalidades | 118 endpoints (77+28+13) | por telas | por telas |
| Emissão | OID4VCI | (recebe via QR/list) | OID4VCI, DIDComm |
| Apresentação | OID4VP | In person (18013-5) + Online (OID4VP) | Scan/QR (DIDComm/OID4VP) |
| Assinatura eletrônica | Não (na interface) | **Sim** (eIDAS 2 QES) | Não |
| Conexões persistentes | Não | Não | **Sim** (Contacts / DIDComm) |
| Formatos de credencial | W3C VC, SD-JWT, mDoc | SD-JWT VC, mso_mdoc | AnonCreds, SD-JWT, mDoc, W3C VCDM |
| Métodos DID | 7 (key, jwk, web, ebsi, cheqd, iota, import) | (PID/mDL) | 6 (indy, web, key, jwk, peer, webvh) |
| Emissão em lote | Sim (`issueBatch`) | Sim (batch counter) | — |
| Biometria | — | Sim | Sim |

**[INTERPRETAÇÃO — convergências e divergências]**
- **Convergência:** todas suportam SD-JWT e mDoc (ISO 18013-5) e o par OID4VCI/OID4VP; Walt.id e
  EUDI compartilham emissão em lote (privacidade/unlinkability); EUDI e Bifold compartilham biometria.
- **Divergência 1 (assinatura):** apenas a EUDI expõe assinatura eletrônica qualificada, refletindo
  seu vínculo com o eIDAS 2.
- **Divergência 2 (conexões):** apenas a Bifold tem "Contacts" (conexões DIDComm persistentes),
  marca do paradigma Aries — modelo relacional vs. o modelo transacional das outras.
- **Divergência 3 (AnonCreds):** apenas a Bifold suporta AnonCreds, herança Hyperledger/Indy.

**[RESSALVA]** As funcionalidades da EUDI e Bifold foram mapeadas por navegação de interface +
documentação; as da Walt.id por inventário de API (superfície de endpoints). Nenhuma passou por
teste E2E de emissão/verificação nesta etapa (simetria metodológica: carteiras mantidas vazias).
A comparação numérica (118 endpoints Walt.id vs. telas das mobile) reflete métodos distintos de
mapeamento adequados a cada tipo de carteira (kit de API vs. app de usuário), não é diretamente
equiparável.

---

## 6. Justificativa da licença Windows 11 Pro (tese de infraestrutura)

| Recurso Pro | Onde foi exercitado | Evidência | Status |
|---|---|---|---|
| Hyper-V (hipervisor Tipo 1) + Manager | Backend Docker (Walt.id) | PRINT-01, `Get-VM DockerDesktopVM`, `[B1e]` | ✅ |
| Instalação all-users privilegiada | Docker backend Hyper-V | `[B1d-modo-instalacao]` | ✅ |
| WHPX (Windows Hypervisor Platform) | Emuladores Android (EUDI, Bifold) | `WHPX is installed and usable` `[E3]` | ✅ |

**[INTERPRETAÇÃO]** A tese sustenta-se em dois pilares independentes e comprovados: (a) o backend
Hyper-V do Docker exige instalação all-users e o hipervisor Tipo 1, recursos ausentes na edição
Home; (b) os emuladores Android das carteiras mobile dependem do WHPX para aceleração de hardware,
recurso exclusivo de Pro/Enterprise/Education (confirmado textualmente por
`WHPX(10.0.26200) is installed and usable`).

**[RESSALVA]** O subconjunto do trabalho baseado em WSL2 (o deploy final da Walt.id) seria
replicável na edição Home. A necessidade da licença Pro refere-se à **metodologia completa** —
isolamento por VM real (Hyper-V) e emulação mobile acelerada (WHPX) — não a cada tarefa
isoladamente. Achado adicional: o backend Hyper-V do Docker mostrou-se instável para orquestração
pesada (falha de engine ao subir 13 contêineres), o que motivou o uso do WSL2 para o deploy — um
trade-off documentado entre isolamento e estabilidade.

---

## 7. Síntese qualitativa

| Perfil | Walt.id | EUDI Wallet | Bifold |
|---|---|---|---|
| Público-alvo | Desenvolvedor/integrador (kit) | Usuário final (referência EU) | Desenvolvedor (framework) |
| Curva de entrada | Baixa (compose) | Muito baixa (APK) | Alta (build completo) |
| Grau de acabamento (UI) | Funcional (2 frontends) | Polido (produto de referência) | Placeholder (prova de conceito) |
| Paradigma SSI | OID4VC / API-first | eIDAS 2 / identidade + assinatura | DIDComm / Aries / AnonCreds |
| Melhor caso de uso | Prototipagem de emissor/verificador | Referência de conformidade UE | Base para carteira Aries customizada |

**[INTERPRETAÇÃO FINAL]** As três carteiras, embora resolvam o mesmo problema (gestão de credenciais
verificáveis), representam três filosofias e três públicos distintos. A Walt.id prioriza acesso
rápido via API para integradores; a EUDI entrega um produto de referência polido e alinhado à
regulação europeia; a Bifold oferece máxima flexibilidade de customização ao custo da maior barreira
de entrada. Para uma organização escolhendo entre elas, o critério decisivo não é capacidade técnica
(todas cobrem os padrões centrais), mas **modelo de adoção**: consumir API (Walt.id), adotar/adaptar
um app pronto (EUDI) ou construir sobre um framework (Bifold).

---

## Anexos de evidência

- **Logs de terminal:** ~30 arquivos de transcrição PowerShell, organizados por fase
  (`01-ambiente`, `02-docker`, `03-waltid`, `04-eudi`, `05-bifold`).
- **Specs de API (Walt.id):** `spec-ISSUER`, `spec-VERIFIER`, `spec-WALLET` (JSON OpenAPI).
- **Marcos visuais:** Hyper-V Manager ativo; emulador Android + log WHPX; telas das três carteiras
  em execução; telas vermelhas de fricção de build da Bifold.
- **Seções individuais:** `waltid-secao-relatorio.md`, `eudi-secao-relatorio.md`,
  `bifold-secao-relatorio.md`.
