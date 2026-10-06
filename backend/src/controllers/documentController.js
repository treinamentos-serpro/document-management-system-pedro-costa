function createDocumentController(service) {
  return {
    identifyUser(req, res, next) {
      const owner = req.get('X-User-Id')?.trim();
      if (!owner) {
        return res.status(401).json({
          error: { code: 'USER_REQUIRED', message: 'Informe o usuario no cabecalho X-User-Id.' },
        });
      }
      req.owner = owner;
      next();
    },
    async upload(req, res) {
      if (!req.file) {
        return res.status(400).json({
          error: { code: 'FILE_REQUIRED', message: 'Envie um arquivo no campo file.' },
        });
      }
      const document = await service.upload({
        originalName: req.file.originalname,
        size: req.file.size,
        storageName: req.file.filename,
      }, req.owner);
      res.status(201).json(document);
    },
    async list(req, res) {
      res.json(await service.list(req.owner));
    },
    async download(req, res, next) {
      const document = await service.download(req.params.id, req.owner);
      const downloadName = document.originalName.replace(/[\x00-\x1f\x7f]/g, '_');
      res.download(document.filePath, downloadName, (error) => {
        if (error) {
          if (error.code === 'ENOENT') error.code = 'DOCUMENT_NOT_FOUND';
          next(error);
        }
      });
    },
    handleError(error, req, res, next) {
      if (res.headersSent) {
        return next(error);
      }
      let status = 500;
      let code = 'INTERNAL_ERROR';
      let message = 'Nao foi possivel concluir a operacao.';
      if (error.code === 'LIMIT_FILE_SIZE') {
        status = 413;
        code = 'FILE_TOO_LARGE';
        message = 'O arquivo excede o limite permitido.';
      } else if (error.name === 'MulterError' || error.message === 'Unexpected end of form') {
        status = 400;
        code = 'INVALID_UPLOAD';
        message = 'Upload invalido. Envie um unico arquivo no campo file.';
      } else if (error.code === 'DOCUMENT_NOT_FOUND') {
        status = 404;
        code = 'DOCUMENT_NOT_FOUND';
        message = 'Documento nao encontrado.';
      }
      res.status(status).json({ error: { code, message } });
    },
  };
}

module.exports = createDocumentController;