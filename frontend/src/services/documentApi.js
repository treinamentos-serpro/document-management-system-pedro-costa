async function request(path, owner, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { ...options.headers, 'X-User-Id': owner },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || 'Nao foi possivel concluir a operacao.');
  }
  return response;
}

export async function listDocuments(owner, signal) {
  const response = await request('/documents', owner, { signal });
  return response.json();
}

export async function uploadDocument(file, owner, signal) {
  const body = new FormData();
  body.append('file', file);
  const response = await request('/upload', owner, { method: 'POST', body, signal });
  return response.json();
}

export async function downloadDocument(id, owner, signal) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, owner, { signal });
  return response.blob();
}