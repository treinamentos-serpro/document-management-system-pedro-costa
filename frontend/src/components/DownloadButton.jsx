import { useEffect, useRef, useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { downloadDocument } from '../services/documentApi.js';

export default function DownloadButton({ document, owner, onError }) {
  const [pending, setPending] = useState(false);
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function handleDownload() {
    if (pending) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    onError('');
    try {
      const blob = await downloadDocument(document.id, owner, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      window.document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (!controller.signal.aborted) onError(error.message);
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <button
      type="button"
      className="download-button"
      disabled={pending}
      onClick={handleDownload}
      aria-label={`${pending ? 'Baixando' : 'Baixar'} ${document.originalName}`}
      title={`Baixar ${document.originalName}`}
    >
      {pending ? <LoaderCircle className="spin" size={18} /> : <Download size={18} />}
      <span>{pending ? 'Baixando...' : 'Baixar'}</span>
    </button>
  );
}