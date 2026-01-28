import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';

export default function SectionDetail({ extinguishers, onSelectItem, getViewMode, toggleView, countsFor, onEdit }) {
  const { name } = useParams();
  const navigate = useNavigate();
  const section = decodeURIComponent(name || '');
  const [mode, setMode] = useState('unchecked');
  const [scanValue, setScanValue] = useState('');
  const scanRef = useRef(null);
  const [sortBy, setSortBy] = useState('assetId');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    const persisted = localStorage.getItem(`sectionView_${section}`);
    setMode(persisted || getViewMode?.(section) || 'unchecked');
  }, [section, getViewMode]);

  useEffect(() => {
    if (scanRef.current) scanRef.current.focus();
  }, [section]);


  const items = useMemo(() => {
    const normalizeStatus = (s) => String(s || '').toLowerCase();
    // Dedupe by Asset ID, prefer non-pending and newest checkedDate
    const list = extinguishers.filter(e => e.section === section);
    const byAsset = new Map();
    for (const e of list) {
      const key = String(e.assetId || e.id || '').trim();
      if (!key) continue;
      const prev = byAsset.get(key);
      if (!prev) { byAsset.set(key, e); continue; }
      const ps = normalizeStatus(prev.status);
      const cs = normalizeStatus(e.status);
      const pcd = prev.checkedDate ? new Date(prev.checkedDate).getTime() : 0;
      const ccd = e.checkedDate ? new Date(e.checkedDate).getTime() : 0;
      const pcr = prev.createdAt ? new Date(prev.createdAt).getTime() : 0;
      const ccr = e.createdAt ? new Date(e.createdAt).getTime() : 0;
      let chooseCurr = false;
      if (ps === 'pending' && cs !== 'pending') chooseCurr = true;
      else if (ps !== 'pending' && cs === 'pending') chooseCurr = false;
      else if (ps !== 'pending' && cs !== 'pending') chooseCurr = ccd >= pcd;
      else chooseCurr = ccr >= pcr;
      if (chooseCurr) byAsset.set(key, e);
    }
    const unique = Array.from(byAsset.values());
    const filtered = unique.filter(e => {
      const st = normalizeStatus(e.status);
      return mode === 'unchecked' ? st === 'pending' : (st === 'pass' || st === 'fail');
    });

    // Sort the filtered list
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;

      if (sortBy === 'assetId') {
        const aId = String(a.assetId || '').toLowerCase();
        const bId = String(b.assetId || '').toLowerCase();

        // Try to extract numbers for numeric comparison
        const aNum = parseInt(aId.match(/\d+/)?.[0] || '0');
        const bNum = parseInt(bId.match(/\d+/)?.[0] || '0');

        if (aNum !== bNum) {
          compareValue = aNum - bNum;
        } else {
          compareValue = aId.localeCompare(bId);
        }
      } else if (sortBy === 'location') {
        const aLoc = `${a.vicinity || ''} ${a.parentLocation || ''}`.toLowerCase();
        const bLoc = `${b.vicinity || ''} ${b.parentLocation || ''}`.toLowerCase();
        compareValue = aLoc.localeCompare(bLoc);
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [extinguishers, section, mode, sortBy, sortOrder]);

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
      navigate(`/app/extinguisher/${match.assetId}`, {
        state: { from: 'section', returnPath: `/app/section/${encodeURIComponent(section)}` }
      });
    }
    setScanValue('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="text-blue-600" onClick={() => navigate(-1)}>← Back</button>
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
        <>
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md relative">
                <div onClick={() => navigate(`/app/extinguisher/${item.assetId}`, { state: { from: 'section', returnPath: `/app/section/${encodeURIComponent(section)}` } })} className="cursor-pointer">
                  <div className="font-bold text-lg pr-10">{item.assetId}</div>
                  <div className="text-sm text-gray-600">{item.vicinity} • {item.parentLocation}</div>
                  <div className="text-xs text-gray-500 mt-1">Status: {item.status}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/extinguisher/${item.assetId}`, { state: { from: 'section', returnPath: `/app/section/${encodeURIComponent(section)}` } });
                  }}
                  className="absolute top-3 right-3 p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="View Details"
                >
                  <Info size={20} />
                </button>
              </div>
            ))}
          </div>

          {/* Sort Controls */}
          <div className="bg-white p-4 rounded-lg shadow mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortBy('assetId')}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      sortBy === 'assetId'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Asset ID
                  </button>
                  <button
                    onClick={() => setSortBy('location')}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      sortBy === 'location'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Location
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Order:</span>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-2 font-medium"
                >
                  {sortOrder === 'asc' ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                      Ascending
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                      </svg>
                      Descending
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* activeItem modal removed - now using unified ExtinguisherDetailView */}
    </div>
  );
}
