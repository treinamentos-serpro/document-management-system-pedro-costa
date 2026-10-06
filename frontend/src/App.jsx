import { useEffect, useState } from 'react';
import { ArrowRight, Files } from 'lucide-react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

function DocumentWorkspace({ owner }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listDocuments(owner, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setDocuments(items);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [owner, revision]);

  function refreshDocuments() {
    setRevision((current) => current + 1);
  }

  return (
    <>
      <UploadComponent owner={owner} onUploaded={refreshDocuments} />
      <DocumentList documents={documents} owner={owner} loading={loading} error={error} onRefresh={refreshDocuments} />
    </>
  );
}

export default function App() {
  const [owner, setOwner] = useState('usuario-1');
  const [ownerInput, setOwnerInput] = useState('usuario-1');

  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <div className="brand"><Files size={26} aria-hidden="true" /><span>DMS</span></div>
          <span className="header-label">Gestao de documentos</span>
        </div>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div><p className="eyebrow">Document Management System</p><h1>Documentos</h1></div>
          <form className="owner-form" onSubmit={(event) => {
            event.preventDefault();
            if (ownerInput.trim()) {
              setOwner(ownerInput.trim());
              setOwnerInput(ownerInput.trim());
            }
          }}>
            <label htmlFor="owner">Usuario</label>
            <div className="owner-controls">
              <input id="owner" value={ownerInput} onChange={(event) => setOwnerInput(event.target.value)} required />
              <button type="submit" className="icon-button" title="Aplicar usuario" aria-label="Aplicar usuario" disabled={!ownerInput.trim() || ownerInput.trim() === owner}>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </div>
        <DocumentWorkspace key={owner} owner={owner} />
      </main>
    </>
  );
}
