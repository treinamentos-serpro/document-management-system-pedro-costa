function createDocumentController(documentService) {
  function validateUser(req, res, next) {
    const owner = req.get('X-User-Id')?.trim();
    if (!owner || owner.length > 128) {
      return res.status(400).json({
        error: { code: 'INVALID_USER', message: 'Informe um identificador de usuário válido.' },
      });
    }

    req.userId = owner;
    return next();
  }

  async function upload(req, res, next) {
    if (!req.file) {
      return res.status(400).json({
        error: { code: 'FILE_REQUIRED', message: 'Selecione um arquivo para enviar.' },
      });
    }

    try {
      const document = await documentService.createDocument(req.file, req.userId);
      return res.status(201).json(document);
    } catch (error) {
      return next(error);
    }
  }

  async function list(req, res, next) {
    try {
      const documents = await documentService.listDocuments(req.userId);
      return res.status(200).json(documents);
    } catch (error) {
      return next(error);
    }
  }

  async function download(req, res, next) {
    try {
      const result = await documentService.getDocumentForDownload(req.params.id, req.userId);
      if (!result) {
        return res.status(404).json({
          error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
        });
      }

      return res.download(result.filePath, result.document.originalName, (error) => {
        if (error) {
          next(error);
        }
      });
    } catch (error) {
      return next(error);
    }
  }

  return { validateUser, upload, list, download };
}

module.exports = createDocumentController;