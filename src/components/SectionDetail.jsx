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
  const [checklist, setChecklist] = useState({
    pinPresent: true,
    tamperSealIntact: true,
    gaugeCorrectPressure: true,
    weightCorrect: true,
    noDamage: true,
    inDesignatedLocation: true,
    clearlyVisible: true,
    nearestUnder75ft: true,
    topUnder5ft: true,
    bottomOver4in: true,
    mountedSecurely: true,
    inspectionWithin30Days: true,
    tagSignedDated: true
  });
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
      setChecklist({
        pinPresent: true,
        tamperSealIntact: true,
        gaugeCorrectPressure: true,
        weightCorrect: true,
        noDamage: true,
        inDesignatedLocation: true,
        clearlyVisible: true,
        nearestUnder75ft: true,
        topUnder5ft: true,
        bottomOver4in: true,
        mountedSecurely: true,
        inspectionWithin30Days: true,
        tagSignedDated: true
      });
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

            {/* Basic Monthly Check */}
            <div className="mb-4">
              <h4 className="font-semibold text-md mb-2 text-gray-700 border-b pb-1">Basic Monthly Check</h4>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.pinPresent} onChange={(e)=>setChecklist(c=>({...c,pinPresent:e.target.checked}))} /> Pin Present</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.tamperSealIntact} onChange={(e)=>setChecklist(c=>({...c,tamperSealIntact:e.target.checked}))} /> Tamper Seal Intact</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.gaugeCorrectPressure} onChange={(e)=>setChecklist(c=>({...c,gaugeCorrectPressure:e.target.checked}))} /> Gauge Shows Correct Pressure</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.weightCorrect} onChange={(e)=>setChecklist(c=>({...c,weightCorrect:e.target.checked}))} /> Weight feels correct</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.noDamage} onChange={(e)=>setChecklist(c=>({...c,noDamage:e.target.checked}))} /> No Visible Damage, Corrosion, or Leakage</label>
              </div>
            </div>

            {/* Location & Accessibility */}
            <div className="mb-4">
              <h4 className="font-semibold text-md mb-2 text-gray-700 border-b pb-1">Location & Accessibility</h4>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.inDesignatedLocation} onChange={(e)=>setChecklist(c=>({...c,inDesignatedLocation:e.target.checked}))} /> Extinguisher in designated location</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.clearlyVisible} onChange={(e)=>setChecklist(c=>({...c,clearlyVisible:e.target.checked}))} /> Clearly Visible with no Obstructions</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.nearestUnder75ft} onChange={(e)=>setChecklist(c=>({...c,nearestUnder75ft:e.target.checked}))} /> Nearest extinguisher not over 75ft away</label>
              </div>
            </div>

            {/* Mounting & Height */}
            <div className="mb-4">
              <h4 className="font-semibold text-md mb-2 text-gray-700 border-b pb-1">Mounting & Height</h4>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.topUnder5ft} onChange={(e)=>setChecklist(c=>({...c,topUnder5ft:e.target.checked}))} /> Top &lt;= 5ft (if &lt;= 40lb)</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.bottomOver4in} onChange={(e)=>setChecklist(c=>({...c,bottomOver4in:e.target.checked}))} /> Bottom &gt;= 4 inches from floor</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.mountedSecurely} onChange={(e)=>setChecklist(c=>({...c,mountedSecurely:e.target.checked}))} /> Mounted securely on hanger or in Cabinet</label>
              </div>
            </div>

            {/* Administrative */}
            <div className="mb-4">
              <h4 className="font-semibold text-md mb-2 text-gray-700 border-b pb-1">Administrative</h4>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.inspectionWithin30Days} onChange={(e)=>setChecklist(c=>({...c,inspectionWithin30Days:e.target.checked}))} /> Inspection date within 30 days of last</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.tagSignedDated} onChange={(e)=>setChecklist(c=>({...c,tagSignedDated:e.target.checked}))} /> Tag signed and dated</label>
              </div>
            </div>

            {/* Notes / Observations */}
            <div className="mb-4">
              <h4 className="font-semibold text-md mb-2 text-gray-700 border-b pb-1">Notes / Observations</h4>
              <textarea className="w-full border rounded p-3 text-sm" rows={6} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Enter any additional notes or observations about the extinguisher or its location..." />
            </div>

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
