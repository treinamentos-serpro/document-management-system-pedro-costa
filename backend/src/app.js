const express = require('express');
const path = require('node:path');
const InMemoryDocumentRepository = require('./repositories/inMemoryDocumentRepository');
const createDocumentService = require('./services/documentService');
const createDocumentRouter = require('./routes/documentRoutes');

const PORT = process.env.PORT || 3000;
const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function getMaxFileSizeBytes(value = process.env.MAX_FILE_SIZE_BYTES) {
  const maxFileSizeBytes = Number(value);
  return Number.isSafeInteger(maxFileSizeBytes) && maxFileSizeBytes > 0
    ? maxFileSizeBytes
    : DEFAULT_MAX_FILE_SIZE_BYTES;
}

function createApp(options = {}) {
  const app = express();
  const storageDir = path.resolve(
    options.storageDir || process.env.STORAGE_DIR || path.join(__dirname, '../storage')
  );
  const maxFileSizeBytes = getMaxFileSizeBytes(options.maxFileSizeBytes);
  const documentRepository = options.documentRepository || new InMemoryDocumentRepository();
  const documentService = createDocumentService({ documentRepository, storageDir });

  app.use(express.json());
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/', createDocumentRouter({ documentService, storageDir, maxFileSizeBytes }));
  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o limite permitido.' },
      });
    }

    if (error.name === 'MulterError') {
      return res.status(400).json({
        error: { code: 'INVALID_UPLOAD', message: 'A requisição de upload é inválida.' },
      });
    }

    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Não foi possível processar a requisição.' },
    });
  });

  return app;
}

const app = createApp();
app.createApp = createApp;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
