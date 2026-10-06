const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const createDocumentRepository = require('../repositories/documentRepository');
const createDocumentService = require('../services/documentService');
const createDocumentController = require('../controllers/documentController');

function createDocumentRouter(options = {}) {
  const backendDir = path.resolve(__dirname, '../..');
  const storageDir = path.resolve(backendDir, options.storageDir ?? process.env.STORAGE_DIR ?? 'storage');
  const maxFileSize = Number(options.maxFileSize ?? process.env.MAX_FILE_SIZE_BYTES ?? 10485760);
  if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
    throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
  }

  const repository = createDocumentRepository(storageDir);
  const service = createDocumentService(repository);
  const controller = createDocumentController(service);
  const storage = multer.diskStorage({
    destination(req, file, callback) {
      repository.prepareStorage().then(
        (directory) => callback(null, directory),
        (error) => callback(error),
      );
    },
    filename(req, file, callback) {
      callback(null, randomUUID());
    },
  });
  const upload = multer({ storage, limits: { fileSize: maxFileSize, files: 1 } });
  const router = express.Router();

  router.post('/upload', controller.identifyUser, upload.single('file'), controller.upload);
  router.get('/documents', controller.identifyUser, controller.list);
  router.get('/documents/:id/download', controller.identifyUser, controller.download);
  router.use(controller.handleError);

  return router;
}

module.exports = createDocumentRouter;