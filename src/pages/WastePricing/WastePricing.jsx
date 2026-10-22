import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { IndianRupee, Plus, RefreshCw, Save, Tag } from 'lucide-react';
import api from '../../api/axiosInstance';
import { queryKeys } from '../../api/queryKeys';
import { useWastePrices } from '../../hooks/useApiQueries';
import './WastePricing.css';

const DEFAULT_CATEGORIES = ['Child Diaper', 'Adult Diaper'];

const WastePricing = () => {
  const [prices, setPrices] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const pricesQuery = useWastePrices();
  const loading = pricesQuery.isLoading;

  useEffect(() => {
    if (pricesQuery.data) {
      const saved = pricesQuery.data;
      const savedMap = Object.fromEntries(saved.map((item) => [item.category, String(item.pricePerKg)]));
      const categories = [...new Set([...DEFAULT_CATEGORIES, ...saved.map((item) => item.category)])];
      setPrices(categories);
      setDrafts(Object.fromEntries(categories.map((item) => [item, savedMap[item] || ''])));
    }
  }, [pricesQuery.data]);

  const loadPrices = () => pricesQuery.refetch();
  const queryError = pricesQuery.error;
  const displayError = error || queryError?.response?.data?.message || (queryError ? 'Unable to load category prices.' : '');

  const addCategory = () => {
    const value = category.trim();
    if (!value || prices.includes(value)) return;
    setPrices((current) => [...current, value]);
    setDrafts((current) => ({ ...current, [value]: '' }));
    setCategory('');
  };

  const savePrice = async (wasteCategory) => {
    const pricePerKg = Number(drafts[wasteCategory]);
    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
      setError('Enter a valid price per kg.');
      return;
    }
    setSaving(wasteCategory);
    setError('');
    setMessage('');
    try {
      const response = await api.put(`/v1/waste-prices/${encodeURIComponent(wasteCategory)}`, { pricePerKg });
      const updated = response.data?.data || { category: wasteCategory, pricePerKg };
      queryClient.setQueryData(queryKeys.wastePrices, (current = []) => {
        const exists = current.some((item) => item.category === wasteCategory);
        return exists ? current.map((item) => item.category === wasteCategory ? { ...item, ...updated } : item) : [...current, updated];
      });
      setMessage(`${wasteCategory} base price saved at ₹${pricePerKg.toFixed(2)} per kg. 18% GST is added at billing.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save this price.');
    } finally {
      setSaving('');
    }
  };

  return (
    <section className="pricing-page">
      <div className="pricing-header">
        <div><span>Billing configuration</span><h1>Waste category pricing</h1><p>Set the base amount charged for each kilogram collected. GST is added at billing.</p></div>
        <button onClick={loadPrices} disabled={loading}><RefreshCw size={17} className={loading ? 'pricing-spin' : ''} /> Refresh</button>
      </div>
      {message && <div className="pricing-message pricing-message--success">{message}</div>}
      {displayError && <div className="pricing-message pricing-message--error">{displayError}</div>}

      <div className="pricing-info"><IndianRupee size={22} /><div><strong>Automatic billing</strong><p>Completing a pickup calculates weight × category rate, adds 18% GST, and debits the GST-inclusive total from the customer wallet.</p></div></div>

      <div className="pricing-add">
        <Tag size={19} />
        <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Add another waste category" onKeyDown={(event) => event.key === 'Enter' && addCategory()} />
        <button onClick={addCategory} disabled={!category.trim()}><Plus size={17} /> Add category</button>
      </div>

      <div className="pricing-list">
        <div className="pricing-list__heading"><span>Waste category</span><span>Base price per kilogram (before GST)</span><span>Action</span></div>
        {loading ? <div className="pricing-empty">Loading category prices…</div> : prices.map((item) => (
          <div className="pricing-row" key={item}>
            <div className="pricing-category"><span><Tag size={18} /></span><strong>{item}</strong></div>
            <label className="pricing-input"><IndianRupee size={16} /><input type="number" min="0.01" step="0.01" value={drafts[item] || ''} onChange={(event) => setDrafts((current) => ({ ...current, [item]: event.target.value }))} placeholder="0.00" /><small>/ kg + 18% GST</small></label>
            <button className="pricing-save" onClick={() => savePrice(item)} disabled={saving === item || drafts[item] === ''}>{saving === item ? <RefreshCw className="pricing-spin" size={17} /> : <Save size={17} />} {saving === item ? 'Saving' : 'Save price'}</button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WastePricing;
