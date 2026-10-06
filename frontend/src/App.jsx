import { useEffect, useState } from 'react';
import { createDocument, downloadDocument, listDocuments } from './services/documents.js';
import DocumentList from './components/DocumentList.jsx';
import UploadPanel from './components/UploadPanel.jsx';

function readSavedUser() {
  return window.localStorage.getItem('dms-user-id') || 'usuario-1';
}

export default function App() {
  const [activeUser, setActiveUser] = useState(readSavedUser);
  const [userInput, setUserInput] = useState(activeUser);
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refreshDocuments(userId = activeUser) {
    setLoading(true);
    setError('');
    try {
      setDocuments(await listDocuments(userId));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDocuments(activeUser);
  }, [activeUser]);

  function changeUser(event) {
    event.preventDefault();
    const nextUser = userInput.trim();
    if (!nextUser) {
      setError('Informe um identificador de usuário.');
      return;
    }

    window.localStorage.setItem('dms-user-id', nextUser);
    setUserInput(nextUser);
    setActiveUser(nextUser);
    setNotice('Identidade atualizada.');
    setError('');
  }

  async function uploadSelectedFile() {
    if (!selectedFile) return;

    setUploading(true);
    setError('');
    setNotice('');
    try {
      await createDocument(selectedFile, activeUser);
      setSelectedFile(null);
      document.getElementById('document-file').value = '';
      setNotice('Documento enviado.');
      await refreshDocuments(activeUser);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
    }
  }

  async function downloadSelectedDocument(item) {
    setDownloadingId(item.id);
    setError('');
    try {
      const file = await downloadDocument(item.id, activeUser);
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = item.originalName;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Arquivo, início">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span className="brand-name">arquivo<span>·</span></span>
        </a>
        <form className="identity-form" onSubmit={changeUser}>
          <label htmlFor="user-id">Usuário</label>
          <input
            id="user-id"
            value={userInput}
            onChange={(event) => setUserInput(event.target.value)}
            maxLength={128}
            aria-label="Identificador do usuário"
          />
          <button type="submit" className="identity-button">Aplicar</button>
        </form>
      </header>

      <main id="inicio" className="workspace">
        <section className="page-heading">
          <div>
            <p className="eyebrow">ESPAÇO DE DOCUMENTOS</p>
            <h1>Seus arquivos,<br className="mobile-break" /> em ordem.</h1>
          </div>
          <button
            type="button"
            className="refresh-button"
            onClick={() => refreshDocuments()}
            disabled={loading}
            title="Atualizar lista"
          >
            <span aria-hidden="true" className={loading ? 'refresh-icon is-spinning' : 'refresh-icon'}>↻</span>
            Atualizar
          </button>
        </section>

        {error && <p className="feedback feedback-error" role="alert">{error}</p>}
        {notice && !error && <p className="feedback feedback-success" role="status">{notice}</p>}

        <div className="workspace-grid">
          <UploadPanel
            selectedFile={selectedFile}
            onFileChange={setSelectedFile}
            onUpload={uploadSelectedFile}
            uploading={uploading}
          />

          <section className="documents-section" aria-labelledby="documents-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">BIBLIOTECA</p>
                <h2 id="documents-title">Documentos</h2>
              </div>
              <span className="document-count" aria-label={`${documents.length} documentos`}>
                {documents.length.toString().padStart(2, '0')}
              </span>
            </div>
            <DocumentList
              documents={documents}
              loading={loading}
              downloadingId={downloadingId}
              onDownload={downloadSelectedDocument}
            />
          </section>
        </div>
      </main>

      <footer className="footer">
        <span>ARQUIVO LOCAL</span>
        <span>Seus documentos permanecem neste ambiente.</span>
      </footer>
    </div>
  );
}
