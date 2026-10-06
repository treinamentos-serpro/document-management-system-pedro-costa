async function readError(response) {
  const body = await response.json().catch(() => null);
  return body?.error?.message || 'Não foi possível concluir a operação.';
}

async function ensureSuccess(response) {
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return response;
}

export async function listDocuments(userId) {
  const response = await fetch('/api/documents', {
    headers: { 'X-User-Id': userId },
  });
  await ensureSuccess(response);
  return response.json();
}

export async function createDocument(file, userId) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'X-User-Id': userId },
    body: formData,
  });
  await ensureSuccess(response);
  return response.json();
}

export async function downloadDocument(id, userId) {
  const response = await fetch(`/api/documents/${encodeURIComponent(id)}/download`, {
    headers: { 'X-User-Id': userId },
  });
  await ensureSuccess(response);
  return response.blob();
}