const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const express = require('express');
const multer = require('multer');
const createDocumentController = require('../controllers/documentController');

function createDocumentRouter({ documentService, storageDir, maxFileSizeBytes }) {
  const router = express.Router();
  const controller = createDocumentController(documentService);
  const upload = multer({
    storage: multer.diskStorage({
      destination(req, file, callback) {
        fs.mkdir(storageDir, { recursive: true }, (error) => callback(error, storageDir));
      },
      filename(req, file, callback) {
        callback(null, randomUUID());
      },
    }),
    limits: { fileSize: maxFileSizeBytes, files: 1 },
  });

  router.post('/upload', controller.validateUser, upload.single('file'), controller.upload);
  router.get('/documents', controller.validateUser, controller.list);
  router.get('/documents/:id/download', controller.validateUser, controller.download);

  return router;
}

module.exports = createDocumentRouter;