const { test } = require('node:test');
const assert = require('node:assert');
const { mkdtemp, readdir, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const app = require('../src/app');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('a API grava, lista e baixa documentos locais por usuario', async (context) => {
  const storageDir = await mkdtemp(path.join(tmpdir(), 'dms-test-'));
  context.after(() => rm(storageDir, { recursive: true, force: true }));
  const testApp = app.createApp({ storageDir, maxFileSize: 32 });
  const server = testApp.listen(0, '127.0.0.1');
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'X-User-Id': 'usuario-1' };
  const upload = (content, field = 'file', ownerHeaders = headers) => {
    const form = new FormData();
    form.append(field, new Blob([content]), 'relatorio.txt');
    return fetch(`${baseUrl}/upload`, { method: 'POST', headers: ownerHeaders, body: form });
  };

  await context.test('lista vazia e identificacao obrigatoria', async () => {
    const response = await fetch(`${baseUrl}/documents`, { headers });
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), []);
    for (const endpoint of ['/upload', '/documents', '/documents/ausente/download']) {
      const unauthorized = await fetch(`${baseUrl}${endpoint}`, {
        method: endpoint === '/upload' ? 'POST' : 'GET',
      });
      assert.strictEqual(unauthorized.status, 401);
    }
  });

  let document;
  await context.test('upload retorna metadados e grava o conteudo no disco', async () => {
    const response = await upload('conteudo do documento');
    assert.strictEqual(response.status, 201);
    document = await response.json();
    assert.deepStrictEqual(Object.keys(document).sort(), ['id', 'originalName', 'owner', 'size', 'uploadedAt']);
    assert.match(document.id, /^[0-9a-f-]{36}$/);
    assert.strictEqual(document.originalName, 'relatorio.txt');
    assert.strictEqual(document.size, 21);
    assert.strictEqual(document.owner, 'usuario-1');
    assert.ok(Number.isFinite(Date.parse(document.uploadedAt)));
    const files = await readdir(storageDir);
    assert.strictEqual(files.length, 1);
    assert.notStrictEqual(files[0], 'relatorio.txt');
    assert.strictEqual(await readFile(path.join(storageDir, files[0]), 'utf8'), 'conteudo do documento');
  });

  await context.test('listagem e download respeitam o proprietario', async () => {
    const response = await fetch(`${baseUrl}/documents`, { headers });
    assert.deepStrictEqual(await response.json(), [document]);
    const otherHeaders = { 'X-User-Id': 'usuario-2' };
    const otherList = await fetch(`${baseUrl}/documents`, { headers: otherHeaders });
    assert.deepStrictEqual(await otherList.json(), []);
    const downloaded = await fetch(`${baseUrl}/documents/${document.id}/download`, { headers });
    assert.strictEqual(downloaded.status, 200);
    assert.match(downloaded.headers.get('content-disposition'), /attachment.*relatorio\.txt/);
    assert.strictEqual(await downloaded.text(), 'conteudo do documento');
    for (const [identifier, requestHeaders] of [[document.id, otherHeaders], ['ausente', headers]]) {
      const missing = await fetch(`${baseUrl}/documents/${identifier}/download`, { headers: requestHeaders });
      assert.strictEqual(missing.status, 404);
    }
  });

  await context.test('uploads invalidos nao deixam arquivos parciais', async () => {
    const missing = await fetch(`${baseUrl}/upload`, { method: 'POST', headers });
    assert.strictEqual(missing.status, 400);
    assert.strictEqual((await upload('texto', 'unexpected')).status, 400);
    assert.strictEqual((await upload('x'.repeat(33))).status, 413);
    assert.strictEqual((await upload('texto', 'file', {})).status, 401);
    assert.strictEqual((await readdir(storageDir)).length, 1);
  });

  await context.test('arquivo removido do disco retorna 404', async () => {
    const [storageName] = await readdir(storageDir);
    await rm(path.join(storageDir, storageName));
    const response = await fetch(`${baseUrl}/documents/${document.id}/download`, { headers });
    assert.strictEqual(response.status, 404);
  });
});
