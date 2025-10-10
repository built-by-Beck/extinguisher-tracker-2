import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function SectionDetail({ extinguishers, onSelectItem, getViewMode, toggleView, countsFor, onPass, onFail, onEdit, onSaveNotes }) {
  const { name } = useParams();
  const navigate = useNavigate();
  const section = decodeURIComponent(name || '');
  const [mode, setMode] = useState('unchecked');
  const [scanValue, setScanValue] = useState('');
  const scanRef = useRef(null);
  const [activeItem, setActiveItem] = useState(null);
  const [checklist, setChecklist] = useState({ pin: true, seal: true, gauge: true, visible: true, clear: true, condition: true });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const persisted = localStorage.getItem(`sectionView_${section}`);
    setMode(persisted || getViewMode?.(section) || 'unchecked');
  }, [section, getViewMode]);

  useEffect(() => {
    if (scanRef.current) scanRef.current.focus();
  }, [section]);

  const items = useMemo(() => {
    const list = extinguishers.filter(e => e.section === section);
    return list.filter(e => mode === 'unchecked' ? e.status === 'pending' : (e.status === 'pass' || e.status === 'fail'));
  }, [extinguishers, section, mode]);

  const counts = countsFor?.(section) || { checked: 0, unchecked: 0 };

  const switchMode = (next) => {
    setMode(next);
    localStorage.setItem(`sectionView_${section}`, next);
    toggleView?.(section); // keep existing app state in sync
  };

  const findByScan = (code) => {
    if (!code) return null;
    const norm = String(code).trim();
    return extinguishers.find(e => String(e.assetId).trim() === norm) ||
           extinguishers.find(e => String(e.serial || '').trim() === norm);
  };

  const handleScanEnter = () => {
    const match = findByScan(scanValue);
    if (match) {
      setActiveItem(match);
      setChecklist({ pin: true, seal: true, gauge: true, visible: true, clear: true, condition: true });
      setNotes('');
    }
    setScanValue('');
  };

  const checklistSummary = () => {
    const issues = Object.entries(checklist).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
    return issues ? `Issues: ${issues}. ${notes}`.trim() : notes;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="text-blue-600" onClick={() => navigate('/')}>← All Sections</button>
        <div className="font-semibold text-xl">{section}</div>
        <div />
      </div>

      <div className="bg-white p-3 rounded-lg shadow flex items-center gap-2">
        <input
          ref={scanRef}
          value={scanValue}
          onChange={(e)=>setScanValue(e.target.value)}
          onKeyDown={(e)=>{ if (e.key === 'Enter') handleScanEnter(); }}
          placeholder="Scan Asset ID or Serial..."
          className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-sm text-gray-500">Scanner auto-fills + Enter</div>
      </div>

      <div className="bg-white p-3 rounded-lg shadow flex gap-2">
        <button
          onClick={() => switchMode('unchecked')}
          className={`flex-1 px-4 py-2 rounded font-medium ${mode === 'unchecked' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Unchecked ({counts.unchecked || 0})
        </button>
        <button
          onClick={() => switchMode('checked')}
          className={`flex-1 px-4 py-2 rounded font-medium ${mode === 'checked' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Checked ({counts.checked || 0})
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">No items found.</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} onClick={() => setActiveItem(item)} className="bg-white p-4 rounded-lg shadow hover:shadow-md cursor-pointer">
              <div className="font-bold text-lg">{item.assetId}</div>
              <div className="text-sm text-gray-600">{item.vicinity} • {item.parentLocation}</div>
              <div className="text-xs text-gray-500 mt-1">Status: {item.status}</div>
            </div>
          ))}
        </div>
      )}

      {activeItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-lg p-4 shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold text-lg">{activeItem.assetId} — {activeItem.section}</div>
              <button onClick={() => setActiveItem(null)} className="text-gray-600">✕</button>
            </div>
            <div className="text-sm text-gray-600 mb-3">{activeItem.vicinity} • {activeItem.parentLocation}</div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <label className="flex items-center gap-2 bg-gray-50 rounded p-2"><input type="checkbox" checked={checklist.pin} onChange={(e)=>setChecklist(c=>({...c,pin:e.target.checked}))} /> Pin present</label>
              <label className="flex items-center gap-2 bg-gray-50 rounded p-2"><input type="checkbox" checked={checklist.seal} onChange={(e)=>setChecklist(c=>({...c,seal:e.target.checked}))} /> Tamper seal intact</label>
              <label className="flex items-center gap-2 bg-gray-50 rounded p-2"><input type="checkbox" checked={checklist.gauge} onChange={(e)=>setChecklist(c=>({...c,gauge:e.target.checked}))} /> Gauge in green</label>
              <label className="flex items-center gap-2 bg-gray-50 rounded p-2"><input type="checkbox" checked={checklist.visible} onChange={(e)=>setChecklist(c=>({...c,visible:e.target.checked}))} /> Visible</label>
              <label className="flex items-center gap-2 bg-gray-50 rounded p-2"><input type="checkbox" checked={checklist.clear} onChange={(e)=>setChecklist(c=>({...c,clear:e.target.checked}))} /> No obstructions</label>
              <label className="flex items-center gap-2 bg-gray-50 rounded p-2"><input type="checkbox" checked={checklist.condition} onChange={(e)=>setChecklist(c=>({...c,condition:e.target.checked}))} /> Overall condition OK</label>
            </div>

            <textarea className="w-full border rounded p-2 mb-3" rows={3} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Notes (optional)" />

            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={() => { onEdit?.(activeItem); }} className="px-4 py-2 rounded bg-gray-200">Edit</button>
              <button onClick={() => { onSaveNotes?.(activeItem, checklistSummary()); }} className="px-4 py-2 rounded bg-slate-200">Save Notes</button>
              <button onClick={() => { onFail?.(activeItem, checklistSummary()); setActiveItem(null); }} className="px-4 py-2 rounded bg-red-600 text-white">Fail</button>
              <button onClick={() => { onPass?.(activeItem, checklistSummary()); setActiveItem(null); }} className="px-4 py-2 rounded bg-green-600 text-white">Pass</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
