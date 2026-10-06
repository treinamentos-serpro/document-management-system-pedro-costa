function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DocumentList({ documents, loading, downloadingId, onDownload }) {
  if (loading) {
    return <p className="list-state" role="status">Carregando documentos…</p>;
  }

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-mark" aria-hidden="true">∅</span>
        <p>Nenhum documento por aqui.</p>
        <span>O primeiro arquivo aparecerá nesta lista.</span>
      </div>
    );
  }

  return (
    <ul className="document-list">
      {documents.map((item) => (
        <li className="document-row" key={item.id}>
          <span className="document-type" aria-hidden="true">DOC</span>
          <div className="document-details">
            <span className="document-name" title={item.originalName}>{item.originalName}</span>
            <span className="document-meta">
              {formatFileSize(item.size)} <span aria-hidden="true">·</span> {formatDate(item.uploadedAt)}
            </span>
          </div>
          <button
            type="button"
            className="download-button"
            onClick={() => onDownload(item)}
            disabled={downloadingId === item.id}
            aria-label={`Baixar ${item.originalName}`}
            title={`Baixar ${item.originalName}`}
          >
            {downloadingId === item.id ? '…' : '↓'}
          </button>
        </li>
      ))}
    </ul>
  );
}