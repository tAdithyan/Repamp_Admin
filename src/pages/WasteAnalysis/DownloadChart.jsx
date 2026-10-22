import { useState } from 'react';
import { Download } from 'lucide-react';
import { chartSvg } from './chartExport';

export default function DownloadChart({ title, month, rows, type = 'bar', disabled = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function download() {
    setBusy(true);
    setError('');
    let sourceUrl, downloadUrl;
    try {
      const { svg, width, height } = chartSvg({ title, month, rows, type });
      sourceUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = sourceUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(image, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Image unavailable');
      downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${month}-${type}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError('Download failed. Please try again.');
    } finally {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      if (downloadUrl) setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
      setBusy(false);
    }
  }
  return <div className="wa-download"><button type="button" disabled={disabled || busy} onClick={download} aria-label={`Download ${title} as PNG`}><Download size={15}/>{busy ? 'Preparing…' : 'Download PNG'}</button>{error && <small role="alert">{error}</small>}</div>;
}
