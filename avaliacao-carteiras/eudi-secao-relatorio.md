# Avaliação Operacional e Mapeamento Funcional — EUDI Wallet (Reference Implementation)

> Ambiente: Windows 11 Pro 25H2 (build 26200), AMD Ryzen 5 8600G, 32 GB RAM.
> Artefato avaliado: `eu.europa.ec.euidi` versão **2026.07.39-Demo** (build de referência oficial da
> União Europeia, repositório `eu-digital-identity-wallet/eudi-app-android-wallet-ui`).

---

## 1. Infraestrutura mobile (emulador Android + WHPX)

### 1.1 Instalação do ambiente

**[MEDIDO]** Android Studio 2026.1.2.10 instalado via winget em 219,9 s `[E1-preparacao-android]`.
SDK localizado em `C:\Users\breno\AppData\Local\Android\Sdk`; emulador versão 36.6.11
`[E2-inventario-sdk]`.

**[MEDIDO]** Emulador (AVD) criado via GUI do Android Studio:
- Hardware: Pixel 8
- Imagem: Google APIs x86_64, **API 35 (Android 15 "VanillaIceCream")**
- Cold boot bem-sucedido até a home screen do Android.

### 1.2 Prova do WHPX (pilar mobile da justificativa Windows 11 Pro)

**[MEDIDO]** Diagnóstico de aceleração `[E3-prova-whpx]`:
```
WHPX(10.0.26200) is installed and usable.
```
- `adb devices`: `emulator-5554 device` (emulador reconhecido).
- Identidade: Android 15, API 35, `sdk_gphone64_x86_64`, hardware `ranchu` (QEMU).

**[INTERPRETAÇÃO]** O emulador declara explicitamente uso do **Windows Hypervisor Platform
(WHPX)** como acelerador. Como o hipervisor do Windows (Hyper-V) está ativo e monopoliza a
virtualização de hardware, o emulador não pode usar o acelerador nativo da AMD (AEHD); o WHPX
é a ponte obrigatória. WHPX é recurso exclusivo de Windows Pro/Enterprise/Education. Este é o
segundo pilar da justificativa da licença Pro (o primeiro, Hyper-V Tipo 1, foi documentado na
seção Walt.id).

**[MEDIDO]** Consumo de recursos do emulador `[E3-prova-whpx]`:
- Processo `qemu-system-x86_64`: **3.736 MB de RAM**, 440,6 s de CPU acumulada.
- Impacto no host: RAM livre 17.652 MB (baseline) → 12.939 MB (~4,7 GB consumidos).

**[INTERPRETAÇÃO]** Um único emulador Android (~3,7 GB) consome ordens de magnitude mais RAM
que qualquer contêiner isolado da Walt.id (maior: wallet-api, 360 MB). A avaliação de carteira
mobile via emulação é significativamente mais custosa em recursos que a de carteira web
containerizada.

### 1.3 Nota técnica: imagem "Intel x86_64" em CPU AMD

**[RESSALVA]** A imagem de sistema chama-se "Google APIs Intel x86_64 Atom", mas "x86_64" é a
arquitetura de instruções (implementada tanto por Intel quanto por AMD); o "Intel" no nome é
herança histórica. Na CPU AMD Ryzen, a imagem roda nativamente via WHPX, sem incompatibilidade.

---

## 2. Instalação do aplicativo (APK)

Simetria metodológica com a Walt.id: assim como se orquestraram imagens já compiladas (não
build do código-fonte), aqui instalou-se o APK pré-compilado (não compilação via Gradle).

**[MEDIDO]** Instalação `[E4-instalacao-apk]`:
- APK: `eudi-wallet.apk`, 363,21 MB, versão 2026.07.39-Demo.
- `adb install -r`: `Success` em 4,5 s.
- Pacote: `eu.europa.ec.euidi` (namespace European Commission).
- Metadados: `versionCode=39`, `minSdk=29` (Android 10), `targetSdk=37`, `versionName=2026.07.39`.

**[INTERPRETAÇÃO]** Contraste de distribuição com a Walt.id: um único APK de 363 MB (instalado
em 4,5 s) vs 13 imagens somando ~7,5 GB. A carteira mobile é artefato de distribuição muito mais
compacto, embora exija ~4,7 GB de emulador para execução.

---

## 3. Mapeamento funcional (A6) — por navegação da interface

Método: exploração estruturada da interface no emulador (o app é de usuário final, sem API
pública documentada como a Walt.id; o mapeamento é por fluxos de uso). Setup inicial: criação de
PIN. Evidência visual: capturas de tela de cada área.

### 3.1 Arquitetura de navegação

Três abas principais (barra inferior) + menu lateral:

| Área | Acesso | Função |
|---|---|---|
| Home | aba | Ponto de entrada dos casos de uso (Authenticate, Sign) |
| Documents | aba | Gestão de credenciais armazenadas |
| History | aba | Auditoria de transações |
| My EU Wallet | menu lateral (☰) | Change PIN + Settings |

### 3.2 Funcionalidades por área

**Home — casos de uso centrais**

| Funcionalidade | Modos | Padrão associado |
|---|---|---|
| Authenticate | In person (proximidade) / Online (remoto) | ISO 18013-5 / OpenID4VP |
| Sign (assinatura eletrônica) | From device / Scan QR | eIDAS 2 (QES) |

**[INTERPRETAÇÃO]** A EUDI inclui **assinatura eletrônica de documentos** (Sign), funcionalidade
ausente da interface da Walt.id. Alinha-se ao regulamento eIDAS 2, que exige identificação +
assinatura qualificada. A autenticação cobre os dois canais de apresentação: proximidade física
(In person) e remoto (Online).

**Documents — gestão de credenciais**

- Adicionar credencial: **From list** (catálogo de emissores de teste) ou **Scan QR** (OID4VCI).
- Busca e filtros: por **Expiry Period** e **State** (credenciais têm validade e estado/ciclo de vida).

**History — auditoria e transparência**

- Registro de transações com filtros por **Date, Status, Relying Party, Transaction Type**.

**[INTERPRETAÇÃO]** O filtro por "Relying Party" (parte que solicita dados) evidencia registro de
*quem* requisitou credenciais e *quando* — funcionalidade de transparência/privacidade enfatizada
pelo regulamento europeu. É a contraparte de auditoria que fortalece o controle do usuário.

**Settings — configuração**

| Opção | Tipo | Observação |
|---|---|---|
| Authenticate with biometrics | toggle | Autenticação biométrica (desativada por padrão) |
| Batch issuance counter | toggle | Emissão em lote de credenciais (ativada) |
| Retrieve logs | ação | Exportação de logs |
| Changelog | ação | Histórico de versões |

**[INTERPRETAÇÃO — achado comparativo]** "Batch issuance counter" conecta diretamente com o
endpoint `issueBatch` catalogado na Walt.id: ambas suportam emissão em lote (múltiplas cópias de
uma credencial para preservar unlinkability/privacidade). O mesmo conceito de privacidade aparece
nas duas implementações, por caminhos distintos (config no app mobile vs endpoint de API).

### 3.3 Formatos e padrões (da documentação de referência)

**[MEDIDO/documentação]** Segundo o repositório oficial, a EUDI suporta: PID (Personal
Identification Data) e mDL (mobile Driving Licence) nos formatos **SD-JWT VC** e **mso_mdoc**
(ISO 18013-5); apresentação remota via **OpenID4VP (draft 24)** com Presentation Exchange 2.0 e
DCQL; emissão via **OID4VCI**; proximidade via NFC/BLE.

**[RESSALVA]** Os formatos acima vêm da documentação do projeto, não de teste E2E de emissão
nesta sessão (a aba Documents permaneceu vazia — nenhuma credencial foi emitida). É catalogação
de capacidades declaradas + mapeamento de interface, não bateria de testes funcionais.

---

## 4. Síntese da etapa EUDI

- Infraestrutura mobile estabelecida: emulador Android 15 acelerado por WHPX (prova textual
  `WHPX is installed and usable` + marcos visuais).
- App de referência oficial (v2026.07.39) instalado via APK (simetria metodológica com Walt.id).
- Funcionalidades mapeadas por navegação: autenticação (proximidade + remoto), assinatura
  eletrônica, gestão de credenciais com ciclo de vida, auditoria por Relying Party, emissão em
  lote, biometria.
- Diferencial vs Walt.id: assinatura eletrônica de documentos (eIDAS 2) exposta na interface.
- Ponto comum vs Walt.id: emissão em lote (privacidade/unlinkability).

**Evidências (logs):** `E1-preparacao-android`, `E2-inventario-sdk`, `E3-prova-whpx`,
`E4-instalacao-apk`.
**Marcos visuais:** home do Android no emulador; dashboard da EUDI; telas de Authenticate, Sign,
Documents, History, Settings; versão 2026.07.39 no rodapé.
