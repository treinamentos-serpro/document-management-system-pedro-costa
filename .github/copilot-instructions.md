# Instruções do projeto - Document Management System (DMS)

Use estas instruções para preservar as convenções do DMS. Consulte a
[especificação](../docs/specs/dms-spec.md) para escopo, modelo de dados,
contratos de API, configuração e critérios de aceite. O backend e o frontend
já implementam upload, listagem e download; não os trate como seed vazio.

## Stack

- Backend: Node.js + Express (CommonJS)
- Frontend: React + Vite (ESM)
- Testes backend: runner nativo do Node (`node:test`)
- Sem TypeScript nesta fase (JavaScript puro)
- Use Node.js 24 ou superior, conforme exigido pelo frontend.

## Comandos e validação

Execute a partir da raiz do repositório; não há `package.json` na raiz:

| Objetivo | Comando |
| --- | --- |
| Instalar dependências do backend | `npm --prefix backend install` |
| Instalar dependências do frontend | `npm --prefix frontend install` |
| Testar backend | `npm --prefix backend test` |
| Compilar frontend | `npm --prefix frontend run build` |
| Iniciar backend | `npm --prefix backend start` |
| Iniciar frontend no dev container | `npm --prefix frontend run dev -- --host 0.0.0.0` |

- Após alterar backend, execute seus testes; após alterar frontend, execute o
  build e verifique o fluxo afetado com o backend ativo.
- Não há script de testes ou lint no frontend. Não invente comandos existentes
  nem acrescente um framework de testes sem necessidade do trabalho solicitado.
- Verifique portas ocupadas antes de iniciar servidores. O backend usa `3000`
  e o frontend `5173` por padrão; confira a URL realmente anunciada pelo Vite.
- Se não conseguir executar uma verificação, informe o bloqueio. Build não
  substitui teste funcional ou visual; Playwright depende de bibliotecas de
  sistema, e este container já apresentou ausência de `libnspr4.so`.

## Princípios obrigatórios

- SOLID, DRY, KISS, YAGNI
- 12-Factor App (configuração via variáveis de ambiente)
- Código legível tem prioridade sobre código complexo
- Sem overengineering e sem abstrações desnecessárias

## Arquitetura do backend (Clean Architecture simples)

Separe responsabilidades em quatro camadas dentro de `backend/src`:

- `routes/`: definem os endpoints e delegam para os controllers
- `controllers/`: tratam entrada/saída HTTP e validação básica
- `services/`: concentram as regras de negócio
- `repositories/`: cuidam da persistência

Fluxo de dependência: `routes -> controllers -> services -> repositories`.
Camadas internas não conhecem camadas externas.

- Preserve a composição das camadas no
  [roteador de documentos](../backend/src/routes/documentRoutes.js), sem
  importar Express ou Multer em services e repositories.
- Preserve a exportação do app Express e `createApp(options)` em
  [app.js](../backend/src/app.js); abrir a porta somente quando executado
  diretamente permite testar o app sem iniciar um servidor global.
- Siga os [testes existentes](../backend/test/app.test.js): crie apps isolados
  com `storageDir` temporário, `maxFileSize` explícito e porta efêmera; feche o
  servidor e remova somente os arquivos criados pelo teste.
- Preserve `/health` e os contratos da especificação. `X-User-Id` é obrigatório
  nas operações de documentos, mas é controlado pelo cliente: não é autenticação.

## Armazenamento (restrição importante)

- Grave uploads com `multer.diskStorage` em `backend/storage` por padrão.
  `STORAGE_DIR` relativo é resolvido a partir de `backend/`, não do diretório
  atual do terminal; use `storage`, não `backend/storage`, para esse padrão.
- Mantenha metadados em memória por instância do app. Reinicializar o processo
  perde registros, mas não remove automaticamente arquivos do disco.
- Nunca use o nome original como caminho físico nem exponha `storageName` na
  API. Preserve a limpeza do arquivo quando falhar o registro dos metadados.
- Não utilize provedores de armazenamento externos ou serviços de upload de
  terceiros. O armazenamento é estritamente local à aplicação.

## Convenções do frontend

- Componentes funcionais com React Hooks
- Organização baseada em componentes: `components/`, `pages/`, `services/`
- Centralize `fetch` no [cliente de API](../frontend/src/services/documentApi.js),
  com prefixo `/api`, `X-User-Id` e tratamento compartilhado de erros.
- O [proxy Vite](../frontend/vite.config.js) remove `/api` antes de encaminhar ao
  backend em `localhost:3000`. Não duplique esse prefixo nas rotas; se mudar
  `PORT`, mantenha o destino do proxy coerente. O proxy é de desenvolvimento,
  não uma configuração automática para o build de produção.
- Upload usa `FormData` com campo `file`; deixe o navegador definir
  `Content-Type` e o boundary. Download usa `fetch` e Blob para enviar o
  cabeçalho do usuário, não um link direto para a API.
- Preserve cancelamento via `AbortController` no desmontar e ao trocar usuário,
  evitando resultados antigos na nova lista. Revogue URLs temporárias de Blob.
- Reutilize componentes e evite duplicação

## Estilo de código

- Nomes descritivos em inglês para símbolos de código
- Mensagens ao usuário e comentários em português
- Funções pequenas e com responsabilidade única
- Trate erros nos limites do sistema (entrada HTTP, leitura/escrita de arquivos)

## Restrições gerais

- Não quebrar funcionalidades existentes
- Manter a aplicação simples e evolutiva
- Preferir dependências já presentes no `package.json`
- Respeitar a etapa solicitada: pedidos de documentação ou plano não autorizam
  implementar código de etapas seguintes. Não altere testes apenas para obter
  resultados verdes; corrija a implementação conforme o contrato acordado.
