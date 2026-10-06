import { useState } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import DownloadButton from './DownloadButton.jsx';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${numberFormat.format(size / 1024)} KB`;
  return `${numberFormat.format(size / 1024 ** 2)} MB`;
}

export default function DocumentList({ documents, owner, loading, error, onRefresh }) {
  const [downloadError, setDownloadError] = useState('');

  return (
    <section className="documents-section" aria-labelledby="documents-heading" aria-busy={loading}>
      <div className="section-heading">
        <h2 id="documents-heading">Meus documentos <span className="count">{documents.length}</span></h2>
        <button
          type="button"
          className="icon-button"
          title="Atualizar documentos"
          aria-label="Atualizar documentos"
          disabled={loading}
          onClick={() => {
            setDownloadError('');
            onRefresh();
          }}
        >
          <RefreshCw size={18} className={loading ? 'spin' : undefined} />
        </button>
      </div>
      {(error || downloadError) && <p className="feedback error" role="alert">{error || downloadError}</p>}
      {loading ? (
        <p className="list-status" role="status">Carregando documentos...</p>
      ) : error ? null : documents.length === 0 ? (
        <div className="empty-state">
          <FileText size={32} strokeWidth={1.5} aria-hidden="true" />
          <p>Nenhum documento encontrado.</p>
        </div>
      ) : (
        <>
          <div className="list-header" aria-hidden="true">
            <span>Documento</span><span>Enviado em</span><span>Tamanho</span><span />
          </div>
          <ul className="document-list">
            {documents.map((document) => (
              <li key={document.id} className="document-row">
                <div className="document-name">
                  <FileText size={22} aria-hidden="true" />
                  <span>{document.originalName}</span>
                </div>
                <time dateTime={document.uploadedAt}>{dateFormat.format(new Date(document.uploadedAt))}</time>
                <span className="document-size">{formatSize(document.size)}</span>
                <DownloadButton document={document} owner={owner} onError={setDownloadError} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}