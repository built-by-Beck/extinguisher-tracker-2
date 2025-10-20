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
    pinPresent: 'pass',
    tamperSealIntact: 'pass',
    gaugeCorrectPressure: 'pass',
    weightCorrect: 'pass',
    noDamage: 'pass',
    inDesignatedLocation: 'pass',
    clearlyVisible: 'pass',
    nearestUnder75ft: 'pass',
    topUnder5ft: 'pass',
    bottomOver4in: 'pass',
    mountedSecurely: 'pass',
    inspectionWithin30Days: 'pass',
    tagSignedDated: 'pass'
  });
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [gps, setGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

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
      // Load existing checklist data if available
      if (match.checklistData) {
        setChecklist(match.checklistData);
      } else {
        setChecklist({
          pinPresent: 'pass',
          tamperSealIntact: 'pass',
          gaugeCorrectPressure: 'pass',
          weightCorrect: 'pass',
          noDamage: 'pass',
          inDesignatedLocation: 'pass',
          clearlyVisible: 'pass',
          nearestUnder75ft: 'pass',
          topUnder5ft: 'pass',
          bottomOver4in: 'pass',
          mountedSecurely: 'pass',
          inspectionWithin30Days: 'pass',
          tagSignedDated: 'pass'
        });
      }
      setNotes(match.notes || '');
      setPhotoFile(null);
      setPhotoPreview('');
      setGps(null);
    }
    setScanValue('');
  };

  const checklistSummary = () => {
    const failed = Object.entries(checklist).filter(([, status]) => status === 'fail').map(([k]) => k);
    return failed.length > 0 ? `Failed items: ${failed.join(', ')}. ${notes}`.trim() : notes;
  };

  const saveInspection = (status) => {
    const inspectionData = { checklistData: checklist, notes, photo: photoFile || null, gps: gps || null };

    if (status === 'pass') {
      onPass?.(activeItem, checklistSummary(), inspectionData);
    } else {
      onFail?.(activeItem, checklistSummary(), inspectionData);
    }
    setActiveItem(null);
    setPhotoFile(null);
    setPhotoPreview('');
    setGps(null);
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pin Present</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1"><input type="radio" name="pinPresent" checked={checklist.pinPresent === 'pass'} onChange={()=>setChecklist(c=>({...c,pinPresent:'pass'}))} /><span className="text-xs text-green-600">Pass</span></label>
                    <label className="flex items-center gap-1"><input type="radio" name="pinPresent" checked={checklist.pinPresent === 'fail'} onChange={()=>setChecklist(c=>({...c,pinPresent:'fail'}))} /><span className="text-xs text-red-600">Fail</span></label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tamper Seal Intact</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1"><input type="radio" name="tamperSealIntact" checked={checklist.tamperSealIntact === 'pass'} onChange={()=>setChecklist(c=>({...c,tamperSealIntact:'pass'}))} /><span className="text-xs text-green-600">Pass</span></label>
                    <label className="flex items-center gap-1"><input type="radio" name="tamperSealIntact" checked={checklist.tamperSealIntact === 'fail'} onChange={()=>setChecklist(c=>({...c,tamperSealIntact:'fail'}))} /><span className="text-xs text-red-600">Fail</span></label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Gauge Shows Correct Pressure</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1"><input type="radio" name="gaugeCorrectPressure" checked={checklist.gaugeCorrectPressure === 'pass'} onChange={()=>setChecklist(c=>({...c,gaugeCorrectPressure:'pass'}))} /><span className="text-xs text-green-600">Pass</span></label>
                    <label className="flex items-center gap-1"><input type="radio" name="gaugeCorrectPressure" checked={checklist.gaugeCorrectPressure === 'fail'} onChange={()=>setChecklist(c=>({...c,gaugeCorrectPressure:'fail'}))} /><span className="text-xs text-red-600">Fail</span></label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Weight feels correct</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1"><input type="radio" name="weightCorrect" checked={checklist.weightCorrect === 'pass'} onChange={()=>setChecklist(c=>({...c,weightCorrect:'pass'}))} /><span className="text-xs text-green-600">Pass</span></label>
                    <label className="flex items-center gap-1"><input type="radio" name="weightCorrect" checked={checklist.weightCorrect === 'fail'} onChange={()=>setChecklist(c=>({...c,weightCorrect:'fail'}))} /><span className="text-xs text-red-600">Fail</span></label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">No Visible Damage, Corrosion, or Leakage</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1"><input type="radio" name="noDamage" checked={checklist.noDamage === 'pass'} onChange={()=>setChecklist(c=>({...c,noDamage:'pass'}))} /><span className="text-xs text-green-600">Pass</span></label>
                    <label className="flex items-center gap-1"><input type="radio" name="noDamage" checked={checklist.noDamage === 'fail'} onChange={()=>setChecklist(c=>({...c,noDamage:'fail'}))} /><span className="text-xs text-red-600">Fail</span></label>
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Accessibility */}
            <div className="mb-4">
              <h4 className="font-semibold text-md mb-2 text-gray-700 border-b pb-1">Location & Accessibility</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Extinguisher in designated location</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1"><input type="radio" name="inDesignatedLocation" checked={checklist.inDesignatedLocation === 'pass'} onChange={()=>setChecklist(c=>({...c,inDesignatedLocation:'pass'}))} /><span className="text-xs text-green-600">Pass</span></label>
                    <label className="flex items-center gap-1"><input type="radio" name="inDesignatedLocation" checked={checklist.inDesignatedLocation === 'fail'} onChange={()=>setChecklist(c=>({...c,inDesignatedLocation:'fail'}))} /><span className="text-xs text-red-600">Fail</span></label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Clearly Visible with no Obstructions</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1"><input type="radio" name="clearlyVisible" checked={checklist.clearlyVisible === 'pass'} onChange={()=>setChecklist(c=>({...c,clearlyVisible:'pass'}))} /><span className="text-xs text-green-600">Pass</span></label>
                    <label className="flex items-center gap-1"><input type="radio" name="clearlyVisible" checked={checklist.clearlyVisible === 'fail'} onChange={()=>setChecklist(c=>({...c,clearlyVisible:'fail'}))} /><span className="text-xs text-red-600">Fail</span></label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Nearest extinguisher not over 75ft away</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1"><input type="radio" name="nearestUnder75ft" checked={checklist.nearestUnder75ft === 'pass'} onChange={()=>setChecklist(c=>({...c,nearestUnder75ft:'pass'}))} /><span className="text-xs text-green-600">Pass</span></label>
                    <label className="flex items-center gap-1"><input type="radio" name="nearestUnder75ft" checked={checklist.nearestUnder75ft === 'fail'} onChange={()=>setChecklist(c=>({...c,nearestUnder75ft:'fail'}))} /><span className="text-xs text-red-600">Fail</span></label>
                  </div>
                </div>
              </div>
            </div>

            {/* Mounting & Height */}
            <div className="mb-4">
              <h4 className="font-semibold text-md mb-2 text-gray-700 border-b pb-1">Mounting & Height</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Top &lt;= 5ft (if &lt;= 40lb)</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1"><input type="radio" name="topUnder5ft" checked={checklist.topUnder5ft === 'pass'} onChange={()=>setChecklist(c=>({...c,topUnder5ft:'pass'}))} /><span className="text-xs text-green-600">Pass</span></label>
                    <label className="flex items-center gap-1"><input type="radio" name="topUnder5ft" checked={checklist.topUnder5ft === 'fail'} onChange={()=>setChecklist(c=>({...c,topUnder5ft:'fail'}))} /><span className="text-xs text-red-600">Fail</span></label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Bottom &gt;= 4 inches from floor</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1"><input type="radio" name="bottomOver4in" checked={checklist.bottomOver4in === 'pass'} onChange={()=>setChecklist(c=>({...c,bottomOver4in:'pass'}))} /><span className="text-xs text-green-600">Pass</span></label>
                    <label className="flex items-center gap-1"><input type="radio" name="bottomOver4in" checked={checklist.bottomOver4in === 'fail'} onChange={()=>setChecklist(c=>({...c,bottomOver4in:'fail'}))} /><span className="text-xs text-red-600">Fail</span></label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mounted securely on hanger or in Cabinet</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1"><input type="radio" name="mountedSecurely" checked={checklist.mountedSecurely === 'pass'} onChange={()=>setChecklist(c=>({...c,mountedSecurely:'pass'}))} /><span className="text-xs text-green-600">Pass</span></label>
                    <label className="flex items-center gap-1"><input type="radio" name="mountedSecurely" checked={checklist.mountedSecurely === 'fail'} onChange={()=>setChecklist(c=>({...c,mountedSecurely:'fail'}))} /><span className="text-xs text-red-600">Fail</span></label>
                  </div>
                </div>
              </div>
            </div>

            {/* Administrative */}
            <div className="mb-4">
              <h4 className="font-semibold text-md mb-2 text-gray-700 border-b pb-1">Administrative</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Inspection date within 30 days of last</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1"><input type="radio" name="inspectionWithin30Days" checked={checklist.inspectionWithin30Days === 'pass'} onChange={()=>setChecklist(c=>({...c,inspectionWithin30Days:'pass'}))} /><span className="text-xs text-green-600">Pass</span></label>
                    <label className="flex items-center gap-1"><input type="radio" name="inspectionWithin30Days" checked={checklist.inspectionWithin30Days === 'fail'} onChange={()=>setChecklist(c=>({...c,inspectionWithin30Days:'fail'}))} /><span className="text-xs text-red-600">Fail</span></label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tag signed and dated</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1"><input type="radio" name="tagSignedDated" checked={checklist.tagSignedDated === 'pass'} onChange={()=>setChecklist(c=>({...c,tagSignedDated:'pass'}))} /><span className="text-xs text-green-600">Pass</span></label>
                    <label className="flex items-center gap-1"><input type="radio" name="tagSignedDated" checked={checklist.tagSignedDated === 'fail'} onChange={()=>setChecklist(c=>({...c,tagSignedDated:'fail'}))} /><span className="text-xs text-red-600">Fail</span></label>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes & Photos */}
            <div className="mb-4">
              <h4 className="font-semibold text-md mb-2 text-gray-700 border-b pb-1">Notes & Photos</h4>
              <textarea className="w-full border rounded p-3 text-sm mb-3" rows={6} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Enter any additional notes or observations about the extinguisher or its location..." />
              <div className="flex items-center gap-3">
                <label className="px-3 py-2 border rounded cursor-pointer bg-slate-50">
                  <span>Add Photo</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f){ setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); } }} />
                </label>
                {photoPreview && (<img src={photoPreview} alt="Selected" className="h-16 w-16 object-cover rounded border" />)}
                {photoPreview && (<button className="text-sm text-red-600" onClick={()=>{ setPhotoFile(null); setPhotoPreview(''); }}>Remove</button>)}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  className="px-3 py-2 border rounded bg-slate-50"
                  onClick={() => {
                    if (!('geolocation' in navigator)) { alert('Geolocation not supported on this device/browser.'); return; }
                    setGpsLoading(true);
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
                        setGps({ lat, lng, accuracy, capturedAt: new Date().toISOString() });
                        setGpsLoading(false);
                      },
                      (err) => {
                        console.warn('GPS error:', err);
                        alert('Unable to get GPS location. Please ensure location services are enabled.');
                        setGpsLoading(false);
                      },
                      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                    );
                  }}
                >{gpsLoading ? 'Capturing…' : 'Capture GPS'}</button>
                {gps && (
                  <div className="text-sm text-gray-700 flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-slate-100">
                      {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} (±{Math.round(gps.accuracy)}m)
                    </span>
                    <a className="text-blue-600 underline" href={`https://maps.google.com/?q=${gps.lat},${gps.lng}`} target="_blank" rel="noreferrer">Open in Maps</a>
                    <button className="text-red-600" onClick={()=>setGps(null)}>Clear</button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={() => { onEdit?.(activeItem); }} className="px-4 py-2 rounded bg-gray-200">Edit</button>
              <button onClick={() => { onSaveNotes?.(activeItem, checklistSummary()); }} className="px-4 py-2 rounded bg-slate-200">Save Notes</button>
              <button onClick={() => saveInspection('fail')} className="px-4 py-2 rounded bg-red-600 text-white">Fail</button>
              <button onClick={() => saveInspection('pass')} className="px-4 py-2 rounded bg-green-600 text-white">Pass</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
