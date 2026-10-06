const { randomUUID } = require('node:crypto');

function publicMetadata(document) {
  const { id, originalName, size, uploadedAt, owner } = document;
  return { id, originalName, size, uploadedAt, owner };
}

function notFound() {
  const error = new Error('Documento nao encontrado.');
  error.code = 'DOCUMENT_NOT_FOUND';
  return error;
}

function createDocumentService(repository) {
  return {
    async upload(file, owner) {
      const document = {
        id: randomUUID(),
        originalName: file.originalName,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner,
        storageName: file.storageName,
      };
      try {
        await repository.save(document);
      } catch (error) {
        await repository.removeFile(document.storageName);
        throw error;
      }
      return publicMetadata(document);
    },
    async list(owner) {
      const documents = await repository.findByOwner(owner);
      return documents.map(publicMetadata);
    },
    async download(id, owner) {
      const document = await repository.findById(id);
      if (!document || document.owner !== owner) {
        throw notFound();
      }
      try {
        const filePath = await repository.getFilePath(document.storageName);
        return { filePath, originalName: document.originalName };
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw notFound();
        }
        throw error;
      }
    },
  };
}

module.exports = createDocumentService;