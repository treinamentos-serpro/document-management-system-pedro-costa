const { mkdir, rm, stat } = require('node:fs/promises');
const path = require('node:path');

function createDocumentRepository(storageDir) {
  const documents = new Map();

  return {
    async prepareStorage() {
      await mkdir(storageDir, { recursive: true });
      return storageDir;
    },
    save(document) {
      documents.set(document.id, { ...document });
    },
    findById(id) {
      const document = documents.get(id);
      return document ? { ...document } : undefined;
    },
    findByOwner(owner) {
      return [...documents.values()]
        .filter((document) => document.owner === owner)
        .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
        .map((document) => ({ ...document }));
    },
    async getFilePath(storageName) {
      const filePath = path.join(storageDir, storageName);
      const file = await stat(filePath);
      if (!file.isFile()) {
        const error = new Error('Documento nao encontrado.');
        error.code = 'ENOENT';
        throw error;
      }
      return filePath;
    },
    async removeFile(storageName) {
      await rm(path.join(storageDir, storageName), { force: true });
    },
  };
}

module.exports = createDocumentRepository;