export default function UploadPanel({ selectedFile, onFileChange, onUpload, uploading }) {
  function handleFileChange(event) {
    onFileChange(event.target.files?.[0] || null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onUpload();
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <div className="section-heading upload-heading">
        <div>
          <p className="eyebrow">NOVO ARQUIVO</p>
          <h2 id="upload-title">Adicionar documento</h2>
        </div>
        <span className="upload-symbol" aria-hidden="true">+</span>
      </div>

      <form onSubmit={handleSubmit}>
        <label className={`drop-zone${selectedFile ? ' has-file' : ''}`} htmlFor="document-file">
          <span className="file-symbol" aria-hidden="true">↥</span>
          <span className="drop-title">{selectedFile ? selectedFile.name : 'Escolha um arquivo'}</span>
          <span className="drop-hint">
            {selectedFile
              ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB · pronto para envio`
              : 'Selecione um arquivo para enviar'}
          </span>
          <input
            id="document-file"
            type="file"
            onChange={handleFileChange}
            aria-label="Selecionar arquivo para envio"
          />
        </label>
        <button className="upload-button" type="submit" disabled={!selectedFile || uploading}>
          {uploading ? 'Enviando…' : 'Enviar documento'}
          <span aria-hidden="true">↗</span>
        </button>
        <p className="privacy-note">Armazenado localmente. Nenhum arquivo é enviado a serviços externos.</p>
      </form>
    </section>
  );
}