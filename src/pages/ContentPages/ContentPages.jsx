import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, FileText, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import api from '../../api/axiosInstance';
import { queryKeys } from '../../api/queryKeys';
import QuillEditor from './QuillEditor';
import './ContentPages.css';

const PAGE_META = {
  'privacy-policy': { label: 'Privacy Policy', description: 'Explain how customer information is collected and used.' },
  'about-us': { label: 'About Us', description: 'Tell customers about your service and share your social media links.' },
};
const SOCIAL_PLATFORMS = ['Facebook', 'Instagram', 'YouTube', 'X', 'LinkedIn', 'TikTok', 'Other'];

export default function ContentPages() {
  const queryClient = useQueryClient();
  const [activeSlug, setActiveSlug] = useState('privacy-policy');
  const [drafts, setDrafts] = useState({});
  const [saved, setSaved] = useState(false);
  const pagesQuery = useQuery({ queryKey: queryKeys.contentPages, queryFn: async () => (await api.get('/v1/pages/admin')).data?.data || [] });
  const savePage = useMutation({
    mutationFn: ({ slug, ...body }) => api.put(`/v1/pages/admin/${slug}`, body),
    onSuccess: async () => {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
      await queryClient.invalidateQueries({ queryKey: queryKeys.contentPages });
      await queryClient.invalidateQueries({ queryKey: ['site-pages'] });
    },
  });
  const pagesBySlug = useMemo(() => Object.fromEntries((pagesQuery.data || []).map((page) => [page.slug, page])), [pagesQuery.data]);
  const currentPage = pagesBySlug[activeSlug];
  const currentDraft = currentPage ? { title: currentPage.title, content: currentPage.content, ...drafts[activeSlug] } : null;
  useEffect(() => {
    if (currentPage && !drafts[activeSlug]) setDrafts((current) => ({ ...current, [activeSlug]: { title: currentPage.title, content: currentPage.content, socialLinks: currentPage.socialLinks || [] } }));
  }, [activeSlug, currentPage, drafts]);

  return <main className="content-pages-page">
    <header className="content-pages-header"><div><span>Customer app</span><h1>Page content</h1><p>Manage the Privacy Policy and About Us pages shown in the app.</p></div><div className="content-pages-live"><span /> Published content</div></header>
    <div className="content-pages-layout">
      <aside className="content-pages-selector"><div className="content-pages-selector-heading"><FileText size={18} /><strong>Pages</strong></div>{Object.entries(PAGE_META).map(([slug, meta]) => <button type="button" key={slug} className={`content-page-choice ${activeSlug === slug ? 'active' : ''}`} onClick={() => setActiveSlug(slug)}><strong>{meta.label}</strong><span>{meta.description}</span></button>)}</aside>
      <section className="content-pages-editor-panel">
        <div className="content-editor-heading"><div><h2>{PAGE_META[activeSlug].label}</h2><p>{PAGE_META[activeSlug].description}</p></div>{currentPage?.updatedAt && <span className="content-updated">Updated {new Date(currentPage.updatedAt).toLocaleDateString()}</span>}</div>
        {pagesQuery.isLoading ? <div className="content-pages-state"><RefreshCw className="content-pages-spin" />Loading page content…</div> : pagesQuery.error ? <div className="content-pages-error">Could not load content. Please refresh and try again.</div> : currentDraft && <>
          <label className="content-title-field">Page title<input maxLength={120} value={currentDraft.title} onChange={(event) => setDrafts((current) => ({ ...current, [activeSlug]: { ...currentDraft, title: event.target.value } }))} /></label>
          <div className="content-body-label"><div><strong>Page content</strong><span>Use headings, lists, links, and text formatting.</span></div></div>
          <QuillEditor key={activeSlug} initialValue={currentDraft.content} onChange={(content) => setDrafts((current) => ({ ...current, [activeSlug]: { ...currentDraft, content } }))} />
          {activeSlug === 'about-us' && <section className="social-editor"><div className="social-editor-heading"><div><strong>Social media links</strong><span>These links appear as tappable icons on the About Us page.</span></div><button type="button" onClick={() => setDrafts((current) => ({ ...current, [activeSlug]: { ...currentDraft, socialLinks: [...(currentDraft.socialLinks || []), { platform: 'Instagram', url: '' }] } }))} disabled={(currentDraft.socialLinks || []).length >= 8}><Plus size={15} />Add link</button></div>{(currentDraft.socialLinks || []).length === 0 ? <p className="social-editor-empty">No social links added yet.</p> : <div className="social-editor-list">{currentDraft.socialLinks.map((link, index) => <div className="social-editor-row" key={`${link.platform}-${index}`}><label>Platform<select value={link.platform} onChange={(event) => setDrafts((current) => ({ ...current, [activeSlug]: { ...currentDraft, socialLinks: currentDraft.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, platform: event.target.value } : item) } }))}>{SOCIAL_PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}</select></label><label className="social-url-field">Profile link<input type="url" placeholder="https://…" value={link.url} onChange={(event) => setDrafts((current) => ({ ...current, [activeSlug]: { ...currentDraft, socialLinks: currentDraft.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item) } }))} /></label><button type="button" className="social-remove" aria-label={`Remove ${link.platform} link`} onClick={() => setDrafts((current) => ({ ...current, [activeSlug]: { ...currentDraft, socialLinks: currentDraft.socialLinks.filter((_, itemIndex) => itemIndex !== index) } }))}><Trash2 size={16} /></button></div>)}</div>}</section>}
          {savePage.error && <div className="content-pages-error">{savePage.error?.response?.data?.message || 'Could not save changes.'}</div>}
          <div className="content-editor-footer"><span>Changes appear in the app after saving.</span><button type="button" onClick={() => savePage.mutate({ slug: activeSlug, ...currentDraft })} disabled={savePage.isPending || !currentDraft.title.trim() || !currentDraft.content.trim()}>{savePage.isPending ? <RefreshCw className="content-pages-spin" size={16} /> : saved ? <Check size={16} /> : <Save size={16} />}{saved ? 'Saved' : 'Save changes'}</button></div>
        </>}
      </section>
    </div>
  </main>;
}
