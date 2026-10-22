import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ align: ['', 'center', 'right', 'justify'] }],
  ['blockquote', 'link'],
  ['clean'],
];

export default function QuillEditor({ initialValue, onChange }) {
  const hostRef = useRef(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    if (!hostRef.current) return undefined;
    const editor = new Quill(hostRef.current, { theme: 'snow', modules: { toolbar: TOOLBAR }, placeholder: 'Write the page content…' });
    editor.clipboard.dangerouslyPasteHTML(initialValue || '');
    const handleChange = () => onChangeRef.current(editor.root.innerHTML);
    editor.on('text-change', handleChange);
    return () => {
      editor.off('text-change', handleChange);
      editor.disable();
      editor.getModule('toolbar')?.container?.remove();
      hostRef.current?.replaceChildren();
    };
  }, []);

  return <div className="content-quill-editor"><div ref={hostRef} /></div>;
}
