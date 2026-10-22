import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import api from '../../api/axiosInstance';
import { marketApi } from './marketplace-api';

export default function ImageUploader({ images, onChange, onBusyChange, disabled }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const input = useRef(null);
  const upload = async event => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length || uploading) return;
    setError('');
    if (images.length + files.length > 10) return setError('A product can have up to 10 images. Remove an image before adding more.');
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) return setError('Choose JPG, PNG or WebP images.');
    if (files.some(file => file.size > 5 * 1024 * 1024)) return setError('Each image must be 5 MB or smaller.');
    setUploading(true); onBusyChange(true);
    let uploaded = [...images];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Uploading ${i + 1} of ${files.length}…`);
        const response = await api.post(`${marketApi}/images`, file, {
          headers: { 'Content-Type': file.type }, timeout: 90000,
          onUploadProgress: event => { if (event.total) setProgress(`Uploading ${i + 1} of ${files.length} · ${Math.round(event.loaded * 100 / event.total)}%`); },
        });
        uploaded = [...uploaded, response.data.data.url];
        onChange(uploaded);
      }
      setProgress('Images uploaded. Save the product to apply your changes.');
    } catch (err) {
      setProgress('');
      setError(err.response?.data?.message || 'Upload failed. Check your connection and try again. Successfully uploaded images are kept below.');
    } finally { setUploading(false); onBusyChange(false); }
  };
  return <section className="mp-upload" aria-label="Product images"><div className="mp-toolbar"><strong>Product images · {images.length}/10</strong><button type="button" disabled={disabled || uploading || images.length >= 10} onClick={() => input.current?.click()}><Upload size={17} />{uploading ? 'Uploading…' : 'Upload images'}</button></div>
    <input ref={input} className="mp-upload-input" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={disabled || uploading} onChange={upload} aria-label="Choose product images" />
    <p className="mp-note">JPG, PNG or WebP, up to 5 MB each. The first image is the product cover.</p>
    {progress && <p role="status">{progress}</p>}{error && <p role="alert" className="mp-error">{error}</p>}
    <div className="mp-upload-grid">{images.map((url, i) => <div className="mp-upload-preview" key={`${url}-${i}`}><img src={url} alt={`Product ${i === 0 ? 'cover' : `image ${i + 1}`}`} /><div className="mp-toolbar">{i === 0 ? <span>Cover</span> : <button type="button" disabled={disabled || uploading} onClick={() => onChange([url, ...images.filter((_, n) => n !== i)])}>Make cover</button>}<button type="button" aria-label={`Remove image ${i + 1}`} disabled={disabled || uploading} onClick={() => onChange(images.filter((_, n) => n !== i))}><X size={16} /></button></div></div>)}</div>
    {!images.length && <p className="mp-note">No images yet. Choose photos from your device.</p>}
  </section>;
}
