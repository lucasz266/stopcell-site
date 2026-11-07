# Stopcell — Site Comercial Profissional (v2.0)

Site responsivo de alta conversão com a identidade visual oficial da **Stopcell**: preto/grafite metálico, vermelho vibrante (`#ff2638`) e tipografia industrial tecnológica (`Barlow Condensed` + `DM Sans`).

## Principais Melhorias Aplicadas (v2.0)
- **Identidade Visual Fiel à Marca**: Preservação e refinamento do tema Grafite/Preto + Vermelho com a logo oficial em `public/assets/stopcell-logo-referencia.jpg`.
- **UI/UX de Alta Conversão**:
  - Header fixo com efeito *glassmorphism* (`backdrop-filter`).
  - Seleção inteligente de serviços: clicar em qualquer um dos 6 cards de serviço já seleciona automaticamente a categoria no formulário de orçamento.
  - Formulário enriquecido com máscara automática de WhatsApp `(49) 99999-9999` e campos de Marca/Modelo do celular.
  - Botão flutuante de acesso rápido ao orçamento e animações suaves de entrada (`IntersectionObserver`).
- **SEO Local (Lages – SC)**: Dados estruturados `Schema.org` (`MobilePhoneStore`), metadados Open Graph e HTML5 semântico.
- **Backend Node.js Nativo Otimizado (`server.js`)**:
  - Zero dependências externas (`node:http`, `node:fs`, `node:path`, `node:zlib`).
  - Compressão Gzip automática para entrega rápida de HTML, CSS e JS.
  - Proteção de Rate Limit em memória no endpoint `POST /api/orcamento` e cabeçalhos de segurança (`CSP`, `X-Frame-Options`, `X-Content-Type-Options`).

## Estrutura de Pastas
```text
stopcell-site/
├── config.js
├── package.json
├── README.md
├── server.js
└── public/
    ├── app.js
    ├── index.html
    ├── styles.css
    └── assets/
        └── stopcell-logo-referencia.jpg
```

## Como Executar Localmente
Requisitos: Node.js 20 ou superior.

```bash
npm start
```

Acesse `http://localhost:3000`.
