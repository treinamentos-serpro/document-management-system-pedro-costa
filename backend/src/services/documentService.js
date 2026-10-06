const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

function createDocumentService({ documentRepository, storageDir }) {
  return {
    async createDocument(file, owner) {
      const document = {
        id: randomUUID(),
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner,
        storageName: file.filename,
      };

      try {
        await documentRepository.create(document);
      } catch (error) {
        await fs.unlink(file.path).catch(() => {});
        throw error;
      }

      return toPublicDocument(document);
    },

    async listDocuments(owner) {
      const documents = await documentRepository.findByOwner(owner);
      return documents.map(toPublicDocument);
    },

    async getDocumentForDownload(id, owner) {
      const document = await documentRepository.findById(id);
      if (!document || document.owner !== owner) {
        return null;
      }

      const filePath = path.join(storageDir, document.storageName);
      try {
        await fs.access(filePath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          return null;
        }
        throw error;
      }

      return { document: toPublicDocument(document), filePath };
    },
  };
}

module.exports = createDocumentService;