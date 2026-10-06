const { afterEach, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const app = require('../src/app');

let server;
let storageDir;
let baseUrl;

beforeEach(async () => {
  storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  server = app.createApp({ storageDir, maxFileSizeBytes: 16 });
  await new Promise((resolve) => {
    const listener = server.listen(0, '127.0.0.1', resolve);
    server = listener;
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await fs.rm(storageDir, { recursive: true, force: true });
});

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download funcionam para o proprietário', async () => {
  const form = new FormData();
  form.append('file', new Blob(['conteudo local'], { type: 'text/plain' }), 'nota.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
    body: form,
  });
  assert.equal(uploadResponse.status, 201);
  const document = await uploadResponse.json();
  assert.equal(document.originalName, 'nota.txt');
  assert.equal(document.size, 14);
  assert.equal(document.owner, 'usuario-1');
  assert.equal('storageName' in document, false);

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-1' },
  });
  assert.deepEqual(await listResponse.json(), [document]);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'usuario-1' },
  });
  assert.equal(downloadResponse.status, 200);
  assert.equal(await downloadResponse.text(), 'conteudo local');
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);

  const storedFiles = await fs.readdir(storageDir);
  assert.equal(storedFiles.length, 1);
});

test('lista somente documentos do usuário solicitante', async () => {
  const form = new FormData();
  form.append('file', new Blob(['privado']), 'privado.txt');
  await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
    body: form,
  });

  const response = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-2' },
  });
  assert.deepEqual(await response.json(), []);
});

test('retorna o mesmo 404 para documento inexistente ou de outro usuário', async () => {
  const missing = await fetch(`${baseUrl}/documents/inexistente/download`, {
    headers: { 'X-User-Id': 'usuario-2' },
  });
  assert.equal(missing.status, 404);

  const form = new FormData();
  form.append('file', new Blob(['privado']), 'privado.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
    body: form,
  });
  const document = await uploadResponse.json();

  const forbidden = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'usuario-2' },
  });
  assert.equal(forbidden.status, 404);
  assert.deepEqual(await forbidden.json(), await missing.clone().json());
});

test('valida usuário e arquivo obrigatório antes de gravar', async () => {
  const missingUser = await fetch(`${baseUrl}/upload`, { method: 'POST' });
  assert.equal(missingUser.status, 400);

  const missingFile = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
  });
  assert.equal(missingFile.status, 400);
  assert.deepEqual(await fs.readdir(storageDir), []);
});

test('recusa arquivo acima do limite configurado', async () => {
  const form = new FormData();
  form.append('file', new Blob(['conteudo muito maior que dezesseis bytes']), 'grande.txt');

  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
    body: form,
  });
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error.code, 'FILE_TOO_LARGE');
});
