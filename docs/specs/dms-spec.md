# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web simples para que usuários possam enviar, listar e baixar seus documentos, mantendo os arquivos no filesystem local e os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Enviar um documento por requisição.
- Listar os documentos associados ao usuário da requisição.
- Baixar um documento pelo identificador, respeitando seu proprietário.
- Exibir no frontend o formulário de envio, a lista de documentos e a ação de download.
- Informar ao usuário estados de carregamento, sucesso e erro das operações.
- Configurar porta, diretório de armazenamento e limite de upload por variáveis de ambiente.

### Fora do escopo

- Armazenamento em nuvem, banco de dados ou provedores externos.
- Persistência dos metadados entre reinicializações do processo.
- Versionamento, edição, exclusão ou compartilhamento de documentos.
- Autenticação, cadastro de usuários, permissões administrativas ou recuperação de senha.
- Upload múltiplo, pré-visualização ou conversão de arquivos.
- Garantia de disponibilidade ou durabilidade dos arquivos locais.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento por vez. | Um arquivo válido enviado como `multipart/form-data` é gravado localmente e retorna seus metadados. |
| RF-02 | O sistema atribui um identificador único ao documento. | O identificador não depende do nome original e permite localizar o registro enquanto o processo estiver ativo. |
| RF-03 | O sistema associa cada documento ao usuário da requisição. | O proprietário é obtido do cabeçalho `X-User-Id`; não é aceito como campo fornecido no corpo do upload. |
| RF-04 | O usuário pode listar seus documentos. | A resposta contém somente documentos cujo `owner` corresponde ao usuário da requisição. |
| RF-05 | O usuário pode baixar um documento pelo identificador. | Um documento existente e pertencente ao usuário é devolvido como conteúdo binário com cabeçalhos de download. |
| RF-06 | O sistema rejeita requisições sem arquivo ou sem identificação do usuário. | A API responde com erro `400` para arquivo ausente e `401` quando `X-User-Id` está ausente ou vazio. |
| RF-07 | O sistema rejeita arquivos acima do limite configurado. | A API responde com `413` e não mantém arquivo parcial no armazenamento. |
| RF-08 | O usuário recebe respostas compreensíveis para falhas da API. | O frontend informa falhas de envio, listagem e download sem apresentar caminhos internos ou stack traces. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados exclusivamente no filesystem local, usando `multer` com `diskStorage` no diretório `backend/storage` por padrão. |
| RNF-02 | Os metadados são mantidos em memória nesta fase. Reiniciar o backend apaga os registros, mas não necessariamente os arquivos já gravados. |
| RNF-03 | A configuração operacional é feita por variáveis de ambiente, seguindo o princípio 12-Factor. |
| RNF-04 | Nome e caminho físico de armazenamento são gerados ou controlados pelo servidor. O nome original nunca é concatenado a um caminho de filesystem. |
| RNF-05 | O backend segue o fluxo `routes -> controllers -> services -> repositories`; camadas internas não dependem de Express ou de detalhes HTTP. |
| RNF-06 | O frontend consome a API via `fetch` usando o prefixo `/api`; em desenvolvimento o proxy Vite remove esse prefixo antes de encaminhar ao backend. |
| RNF-07 | A listagem e o download verificam o proprietário do documento. Identificadores inexistentes e documentos de outro proprietário retornam a mesma resposta `404`. |
| RNF-08 | Erros não expõem stack traces, caminhos absolutos, nomes internos de armazenamento ou detalhes sensíveis. |
| RNF-09 | O backend pode ser iniciado e testado com as dependências já previstas: Node.js, Express e Multer; os testes usam `node:test`. |

## 5. Modelo de dados

### Metadados do documento

| Campo | Tipo | Exposição | Descrição |
| --- | --- | --- | --- |
| `id` | string | Público | Identificador único gerado pelo servidor, preferencialmente UUID. |
| `originalName` | string | Público | Nome original enviado pelo cliente; usado apenas como metadado e nome sugerido no download. |
| `size` | number | Público | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Público | Data e hora do recebimento em ISO 8601, UTC. |
| `owner` | string | Público | Identificador recebido no cabeçalho `X-User-Id`. |
| `storageName` | string | Interno | Nome gerado pelo servidor para localizar o arquivo no diretório local. Nunca é retornado pela API. |

Os registros são mantidos em memória no repositório, indexados por `id`. Os cinco campos públicos compõem o contrato de metadados da API; `storageName` é detalhe interno de persistência. O caminho absoluto deve ser derivado do diretório de armazenamento configurado e de `storageName`, nunca de entrada livre do cliente.

### Configuração

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local para gravação dos arquivos. O caminho relativo deve ser resolvido a partir de uma base estável do backend, não do diretório de execução do shell. |
| `MAX_FILE_SIZE_BYTES` | `10485760` (10 MiB) | Tamanho máximo de um arquivo por upload. Deve ser aplicado pelo Multer. |

## 6. Contratos de API

Os caminhos abaixo são os caminhos internos do backend. O frontend chama os mesmos caminhos com o prefixo `/api`; por exemplo, `/api/documents` é encaminhado pelo proxy Vite para `/documents` no backend.

### Convenções comuns

- Requisições de usuário devem incluir `X-User-Id` com um identificador não vazio.
- `X-User-Id` é somente uma identificação para o MVP e pode ser falsificado pelo cliente. Não representa autenticação nem deve ser usado como proteção de uma implantação pública.
- Respostas JSON usam `Content-Type: application/json; charset=utf-8`.
- Formato sugerido de erro: `{ "error": { "code": "...", "message": "..." } }`.
- O backend deve mapear erros conhecidos para status HTTP; erros inesperados resultam em `500` com mensagem genérica.

### `POST /upload`

- **Finalidade:** gravar um documento localmente e registrar seus metadados.
- **Cabeçalho obrigatório:** `X-User-Id`.
- **Entrada:** `multipart/form-data` com um único campo de arquivo chamado `file`.
- **Sucesso:** `201 Created`; corpo com os metadados públicos do documento.

```json
{
  "id": "uuid-gerado-pelo-servidor",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-10-06T12:00:00.000Z",
  "owner": "usuario-123"
}
```

- **Erros:** `400` arquivo ausente ou campo inválido; `401` usuário ausente; `413` arquivo acima do limite; `500` falha inesperada ao gravar ou registrar o documento.
- O servidor gera `id` e `storageName`. Se a gravação ocorrer, mas o registro em memória falhar, o arquivo recém-gravado deve ser removido para evitar órfão.

### `GET /documents`

- **Finalidade:** listar os documentos do usuário.
- **Cabeçalho obrigatório:** `X-User-Id`.
- **Sucesso:** `200 OK`; corpo é uma lista de metadados públicos. Sem documentos, retorna `[]`.

```json
[
  {
    "id": "uuid-gerado-pelo-servidor",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-10-06T12:00:00.000Z",
    "owner": "usuario-123"
  }
]
```

- **Erros:** `401` usuário ausente; `500` falha inesperada ao consultar o repositório.
- A lista deve ser isolada por proprietário e ordenada por `uploadedAt` decrescente; empates podem manter a ordem de inserção.

### `GET /documents/:id/download`

- **Finalidade:** transmitir o arquivo correspondente ao identificador.
- **Cabeçalho obrigatório:** `X-User-Id`.
- **Sucesso:** `200 OK`, corpo binário, `Content-Disposition: attachment` com o nome original tratado como valor de cabeçalho e `Content-Type` apropriado ou `application/octet-stream` quando desconhecido.
- **Erros:** `401` usuário ausente; `404` identificador inexistente, arquivo ausente ou documento pertencente a outro usuário; `500` falha inesperada de leitura.
- O nome original não pode permitir injeção de cabeçalho nem alterar o caminho físico lido.

## 7. Decisões arquiteturais e operacionais

- **Backend:** Node.js em CommonJS e Express. As rotas definem endpoints e delegam aos controllers; controllers tratam HTTP e validação de entrada; services aplicam regras de negócio; repositories mantêm metadados e acessam o filesystem.
- **Upload:** Multer com `diskStorage`. O destino padrão é `backend/storage`; arquivos recebem nomes internos gerados pelo servidor. O diretório deve existir ou ser criado pelo mecanismo de inicialização previsto na implementação.
- **Persistência:** arquivos no disco local e metadados em memória. Não introduzir banco de dados ou serviço externo nesta fase.
- **Identidade do usuário:** `X-User-Id` é uma convenção provisória para associar e filtrar documentos no MVP local. Uma implantação acessível a terceiros exige autenticação e obtenção confiável do proprietário antes de ser considerada segura.
- **Frontend:** React com componentes funcionais e Hooks; um serviço de frontend concentra chamadas `fetch` para `/api`. A interface deve refletir carregamento, lista vazia, falha e sucesso.
- **Proxy:** o Vite já remove `/api` ao encaminhar para `http://localhost:3000`. Assim, o backend implementa `/upload` e `/documents`, sem duplicar o prefixo.
- **Consistência:** se a inclusão do registro falhar após gravar um arquivo, remover o arquivo como compensação. A perda dos registros após reinício e a possibilidade de arquivos antigos sem metadados são limitações conhecidas do MVP.
- **Limites de upload:** o padrão inicial é 10 MiB por arquivo, configurável via `MAX_FILE_SIZE_BYTES`. Erros de limite devem ser convertidos em `413` e não deixar arquivos parciais.

## 8. Plano de execução

Este plano descreve trabalho futuro; a entrega desta etapa é somente este documento.

1. **Especificação:** registrar requisitos, modelo de dados, contratos, decisões e critérios de aceite em `docs/specs/dms-spec.md`.
2. **Backend - persistência e regras:** implementar repositório em memória para metadados e acesso ao filesystem local com nomes internos gerados pelo servidor.
3. **Backend - fluxo de upload:** configurar Multer com `diskStorage`, limite configurável e tratamento de falhas/limpeza de arquivo parcial.
4. **Backend - API:** implementar routes, controllers e services para upload, listagem filtrada por proprietário e download, além de mapeamento consistente de erros.
5. **Frontend - integração:** criar serviço `fetch` usando `/api`, interface de upload, listagem e download, e estados de carregamento, vazio e erro.
6. **Verificação:** adicionar testes de API para sucesso, validação, limite, isolamento por usuário, arquivo inexistente e erros de filesystem; validar também build do frontend.
7. **Documentação operacional:** documentar variáveis de ambiente, inicialização, diretório de arquivos, limitações da persistência em memória e a ausência de autenticação.

## 9. Critérios de conclusão do MVP

- Um usuário envia um arquivo dentro do limite e recebe metadados válidos.
- A listagem mostra somente os documentos associados ao identificador enviado em `X-User-Id`.
- O download devolve o arquivo correto apenas para o proprietário correspondente.
- Arquivos são gravados localmente via Multer, sem uso de armazenamento externo e sem usar o nome original como caminho.
- Erros de validação, limite e ausência de arquivo/documento retornam os status especificados.
- O frontend consome a API por `/api` e apresenta os estados essenciais do fluxo.
- Testes do backend passam com o runner nativo `node:test` e o frontend compila com o script de build existente.
- A documentação deixa explícitos os limites de metadados em memória e a ausência de autenticação.