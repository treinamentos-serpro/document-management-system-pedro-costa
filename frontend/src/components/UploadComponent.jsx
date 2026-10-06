import { useEffect, useRef, useState } from 'react';
import { FileUp, LoaderCircle } from 'lucide-react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ owner, onUploaded }) {
  const [file, setFile] = useState(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const request = useRef(null);

  useEffect(() => () => request.current?.abort(), []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || pending) return;
    const form = event.currentTarget;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setFeedback(null);
    try {
      const document = await uploadDocument(file, owner, controller.signal);
      if (controller.signal.aborted) return;
      form.reset();
      setFile(null);
      setFeedback({ type: 'success', message: `${document.originalName} enviado com sucesso.` });
      onUploaded(document);
    } catch (error) {
      if (!controller.signal.aborted) setFeedback({ type: 'error', message: error.message });
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-heading">
      <h2 id="upload-heading">Enviar documento</h2>
      <form onSubmit={handleSubmit} className="upload-form" aria-busy={pending}>
        <label className="file-field">
          <span>Arquivo</span>
          <input
            name="file"
            type="file"
            required
            disabled={pending}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setFeedback(null);
            }}
          />
        </label>
        <button type="submit" className="primary-button" disabled={!file || pending}>
          {pending ? <LoaderCircle className="spin" size={18} /> : <FileUp size={18} />}
          {pending ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>
      {feedback && (
        <p className={`feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}
    </section>
  );
}