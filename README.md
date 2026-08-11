# Identidade Autossoberana: Avaliação de Carteiras e Plataforma SSIaaS Vertex

Pacote de replicação da pesquisa de Iniciação Científica **"Análise Comparativa de Carteiras Digitais de Software Livre"**, desenvolvida no Instituto de Ciência e Tecnologia da Universidade Federal de São Paulo (ICT-UNIFESP) e financiada pela Fundação de Amparo à Pesquisa do Estado de São Paulo (FAPESP).

- **Processo FAPESP:** 2025/06172-5
- **Beneficiário:** Breno Cerqueira Reis Nakamura
- **Orientador:** Prof. Arlindo Flávio da Conceição
- **Vigência:** 01/08/2025 a 31/07/2026

Este repositório reúne, de forma consolidada, os artefatos produzidos ao longo da pesquisa, com o objetivo de garantir a transparência e a reprodutibilidade dos resultados descritos no Relatório Científico Final.

---

## Sobre a pesquisa

A pesquisa investigou as barreiras à adoção da Identidade Autossoberana (*Self-Sovereign Identity*, SSI) e percorreu três frentes complementares: a caracterização empírica das barreiras de integração enfrentadas por desenvolvedores, a avaliação técnica de carteiras SSI de código aberto e a construção de uma plataforma própria, a **Vertex**, que abstrai a complexidade técnica da emissão e verificação de Credenciais Verificáveis (VCs) segundo os padrões do W3C.

---

## Organização do repositório

```text
fapesp-ssi-research/
├── README.md
├── avaliacao-carteiras/     # Avaliação técnica das carteiras SSI
│   ├── waltid.md
│   ├── eudi.md
│   ├── bifold.md
│   ├── comparativo-final.md
│   └── logs/          # Logs de terminal e capturas de tela
├── estudo-dx/               # Estudo de Developer Experience (DX)
│   ├── Integration_Friction_Assessment_Instrument.pdf      # Instrumento de coleta
│   └── Anonymized_Participant_Responses.csv # Respostas qualitativas e notas quantitativas por tarefa (anonimizadas)
└── codigo/                  # Código-fonte
    ├── web-ssiaas/              # Plataforma SSIaaS Vertex (snapshot)
    │   └── docs/            # Especificação da API, guia de validação, roteiro de demo
    └── processador-opa/     # Processador de credenciais (OPA + Electron)

```

---

## Conteúdo por pasta

### `avaliacao-carteiras/`

Relatórios da avaliação operacional e do mapeamento funcional das três carteiras SSI de código aberto analisadas: **Walt.id**, **EUDI Wallet** e **Bifold**. Cada relatório documenta a metodologia, o modo nativo de distribuição de cada carteira, o consumo de recursos e as funcionalidades mapeadas. O documento `comparativo-final.md` consolida a comparação entre as três. A subpasta `logs/` contém os logs de terminal e as capturas de tela referenciados nos relatórios.

### `estudo-dx/`

Pacote de replicação do estudo empírico sobre a Experiência do Desenvolvedor, que caracterizou o "Gap de Abstração" nas ferramentas de SSI. Inclui o questionário aplicado, os dados quantitativos das escalas Likert e as respostas abertas dos nove participantes.

> **Aviso de privacidade:** todos os dados dos participantes estão anonimizados e identificados apenas por rótulos genéricos (Participante 1, Participante 2, etc.), em conformidade com a Lei Geral de Proteção de Dados (LGPD). Nenhuma informação que permita identificar os respondentes é disponibilizada.

### `codigo/`

Código-fonte dos dois softwares desenvolvidos na pesquisa:

* **`vertex/`** — Plataforma web SSIaaS Vertex, construída com Next.js 15, Node.js, Prisma ORM e PostgreSQL, cobrindo o ciclo de vida de Credenciais Verificáveis nos papéis de Emissor, Titular e Verificador. A subpasta `docs/` reúne a documentação técnica: especificação da API REST, guia de validação com mais de quarenta casos de teste e roteiro de demonstração. Este diretório contém um *snapshot* estável do código; o histórico completo de *commits* é mantido no repositório do grupo de pesquisa (ver seção abaixo).
* **`processador-opa/`** — Protótipo do processador automatizado de credenciais, baseado no Open Policy Agent (OPA), com políticas em Rego e empacotamento em aplicação *desktop* com Electron.

> **Nota de segurança:** Nenhuma credencial real (chaves, tokens, segredos de autenticação) é versionada neste repositório. O arquivo `.env.example` lista as variáveis necessárias, que devem ser preenchidas localmente.

---

## Repositório de desenvolvimento

O histórico completo de commits da plataforma Vertex, que registra a evolução do software ao longo da pesquisa e as práticas de engenharia de software aplicadas, é mantido no repositório oficial do laboratório, sob a tutela do orientador, na pasta `web-ssiaas`:
🔗 https://github.com/arlindoconceicao/vertex

---

## Publicações associadas

* GANGA, T.; NAKAMURA, B. C.; DA CONCEIÇÃO, A. F. **IDook: Empowering Labor Unions with Decentralized Digital Identities**. In: Blockchain Technology and Emerging Applications (BlockTEA 2025), LNICST v. 669, Springer, 2025. p. 98–113. DOI: [10.1007/978-3-032-12335-0_6](https://doi.org/10.1007/978-3-032-12335-0_6)
* NAKAMURA, B. C.; DA CONCEIÇÃO, A. F. **Integration Barriers in Open-Source SSI Frameworks: An Exploratory Developer Experience Probe**. Pré-print: [arXiv:2608.03039](https://arxiv.org/abs/2608.03039)

---

*Pesquisa financiada pela Fundação de Amparo à Pesquisa do Estado de São Paulo
(FAPESP), processo nº 2025/06172-5.*
