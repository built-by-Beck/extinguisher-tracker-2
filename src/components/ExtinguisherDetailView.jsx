import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, CheckCircle, XCircle, Circle, Image as ImageIcon, ChevronDown, ChevronUp, ExternalLink, RotateCcw, Edit2, Camera, CalendarClock } from 'lucide-react';

/**
 * ExtinguisherDetailView - Unified full-page view for fire extinguisher inspection
 *
 * Features:
 * - Shows details for all extinguishers
 * - When status is 'pending': shows 13-point inspection checklist with Pass/Fail buttons
 * - When status is 'pass' or 'fail': shows read-only inspection details
 * - Edit/Replace buttons always available
 * - Proper navigation state handling for cancel/back
 */
const ExtinguisherDetailView = ({
  extinguishers,
  onPass,
  onFail,
  onEdit,
  onReplace,
  onSaveNotes,
  onUpdateExpirationDate
}) => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [expandedInspection, setExpandedInspection] = useState(null);

  // Inspection state (only used when status is pending)
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
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesSaveTimeoutRef = useRef(null);

  // Expiration date inline edit state
  const [editingExpiration, setEditingExpiration] = useState(false);
  const [tempExpirationDate, setTempExpirationDate] = useState('');

  // Find the extinguisher by assetId
  const extinguisher = extinguishers.find(e => e.assetId === assetId);

  // Get return path from navigation state or default to /app
  const returnPath = location.state?.returnPath || '/app';

  // Initialize notes and checklist when extinguisher changes
  useEffect(() => {
    if (extinguisher) {
      setNotes(extinguisher.notes || '');
      if (extinguisher.checklistData) {
        setChecklist(extinguisher.checklistData);
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
      setTempExpirationDate(extinguisher.expirationDate || '');
    }
  }, [extinguisher?.id]);

  // Auto-save notes with debouncing
  useEffect(() => {
    if (!extinguisher || !notes || extinguisher.status !== 'pending') return;

    if (notesSaveTimeoutRef.current) {
      clearTimeout(notesSaveTimeoutRef.current);
    }

    notesSaveTimeoutRef.current = setTimeout(async () => {
      if (extinguisher && notes !== (extinguisher.notes || '')) {
        setNotesSaving(true);
        setNotesSaved(false);
        try {
          const inspectionData = { checklistData: checklist, notes, photo: photoFile || null, gps: gps || null };
          await onSaveNotes?.(extinguisher, notes, inspectionData);
          setNotesSaved(true);
          setTimeout(() => setNotesSaved(false), 2000);
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setNotesSaving(false);
        }
      }
    }, 2000);

    return () => {
      if (notesSaveTimeoutRef.current) {
        clearTimeout(notesSaveTimeoutRef.current);
      }
    };
  }, [notes, extinguisher, checklist, photoFile, gps, onSaveNotes]);

  if (!extinguisher) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 via-gray-900 to-black text-white p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(returnPath)}
            className="mb-4 flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Extinguisher Not Found</h2>
            <p className="text-gray-300">No extinguisher found with Asset ID: {assetId}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get status icon and color
  const getStatusDisplay = (status) => {
    if (status === 'pass') return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/30', label: 'PASSED' };
    if (status === 'fail') return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30', label: 'FAILED' };
    return { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-800/30', label: 'PENDING' };
  };

  const currentStatus = getStatusDisplay(extinguisher.status);
  const StatusIcon = currentStatus.icon;
  const isPending = extinguisher.status === 'pending';

  // Prepare photos for optimized loading
  const mainPhoto = extinguisher.photos && extinguisher.photos.length > 0
    ? extinguisher.photos[0].url
    : extinguisher.photoUrl;

  const lastInspectionPhoto = extinguisher.lastInspectionPhotoUrl;

  const additionalPhotos = extinguisher.photos && extinguisher.photos.length > 1
    ? extinguisher.photos.slice(1)
    : [];

  const inspectionHistory = extinguisher.inspectionHistory || [];
  const sortedHistory = [...inspectionHistory].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatExpirationDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const totalPhotos = (extinguisher.photos?.length || 0) + inspectionHistory.filter(h => h.photoUrl).length;

  const checklistSummary = () => {
    const failed = Object.entries(checklist).filter(([, status]) => status === 'fail').map(([k]) => k);
    return failed.length > 0 ? `Failed items: ${failed.join(', ')}. ${notes}`.trim() : notes;
  };

  const handleInspection = (status) => {
    const inspectionData = { checklistData: checklist, notes, photo: photoFile || null, gps: gps || null };

    if (status === 'pass') {
      onPass?.(extinguisher, checklistSummary(), inspectionData);
    } else {
      onFail?.(extinguisher, checklistSummary(), inspectionData);
    }

    // Navigate back after inspection
    navigate(returnPath);
  };

  const handleCancel = () => {
    navigate(returnPath);
  };

  const handleEditClick = () => {
    onEdit?.(extinguisher);
  };

  const handleReplaceClick = () => {
    onReplace?.(extinguisher);
  };

  const handleSaveExpirationDate = async () => {
    if (onUpdateExpirationDate) {
      await onUpdateExpirationDate(extinguisher, tempExpirationDate);
    }
    setEditingExpiration(false);
  };

  const captureGps = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation not supported on this device/browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy, altitude, altitudeAccuracy } = pos.coords;
        setGps({ lat, lng, accuracy, altitude, altitudeAccuracy, capturedAt: new Date().toISOString() });
        setGpsLoading(false);
      },
      (err) => {
        console.warn('GPS error:', err);
        alert('Unable to get GPS location. Please ensure location services are enabled.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 via-gray-900 to-black text-white p-4 pb-32">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <button
          onClick={handleCancel}
          className="mb-4 flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Asset Details Card */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 mb-4 border border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Asset #{extinguisher.assetId}</h1>
              <div className="space-y-1 text-gray-300">
                <p><span className="font-semibold">Serial:</span> {extinguisher.serial || 'N/A'}</p>
                <p><span className="font-semibold">Manufacture Date:</span> {extinguisher.manufactureDate || extinguisher.manufactureYear || 'N/A'}</p>
                <p><span className="font-semibold">Section:</span> {extinguisher.section}</p>
              </div>
            </div>
            <div className={`${currentStatus.bg} ${currentStatus.color} px-4 py-2 rounded-lg flex items-center gap-2`}>
              <StatusIcon size={24} />
              <span className="font-bold">{currentStatus.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-700">
            <div>
              <p className="text-sm text-gray-400 mb-1">Location</p>
              <p className="flex items-start gap-2">
                <MapPin size={16} className="mt-1 flex-shrink-0" />
                <span>{extinguisher.vicinity || 'N/A'}</span>
              </p>
              {extinguisher.parentLocation && (
                <p className="text-sm text-gray-400 ml-6">({extinguisher.parentLocation})</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Last Checked</p>
              <p className="flex items-center gap-2">
                <Calendar size={16} />
                {extinguisher.checkedDate ? formatDate(extinguisher.checkedDate) : 'Never'}
              </p>
            </div>
          </div>

          {/* Expiration Date - Inline Editable */}
          <div className="pt-4 border-t border-gray-700 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock size={16} className="text-gray-400" />
                <span className="text-sm text-gray-400">Expiration Date:</span>
              </div>
              {editingExpiration ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={tempExpirationDate}
                    onChange={(e) => setTempExpirationDate(e.target.value)}
                    className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveExpirationDate}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingExpiration(false);
                      setTempExpirationDate(extinguisher.expirationDate || '');
                    }}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingExpiration(true)}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                >
                  {extinguisher.expirationDate ? (
                    <span>{formatExpirationDate(extinguisher.expirationDate)}</span>
                  ) : (
                    <span className="text-gray-400">Add Date</span>
                  )}
                  <Edit2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Current Notes (read-only if not pending) */}
          {extinguisher.notes && !isPending && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Current Notes</p>
              <p className="text-gray-200 bg-gray-900/50 p-3 rounded">{extinguisher.notes}</p>
            </div>
          )}

          {/* GPS Location */}
          {extinguisher.gps && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-1">GPS Location</p>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm bg-black/40 px-2 py-1 rounded">
                    {Number(extinguisher.gps.lat).toFixed(6)}, {Number(extinguisher.gps.lng).toFixed(6)}
                    {extinguisher.gps.accuracy && (
                      <span className="text-gray-400"> (±{Math.round(extinguisher.gps.accuracy)}m)</span>
                    )}
                  </span>
                </div>
                <a
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                  href={`https://maps.google.com/?q=${extinguisher.gps.lat},${extinguisher.gps.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Maps <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Inspection Section - Only shown when pending */}
        {isPending && (
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 mb-4 border-2 border-yellow-500/50">
            <h2 className="text-xl font-bold mb-4 text-yellow-400">Inspection Checklist</h2>

            {/* Basic Monthly Check */}
            <div className="mb-6">
              <h4 className="font-semibold text-md mb-3 text-gray-300 border-b border-gray-600 pb-1">Basic Monthly Check</h4>
              <div className="space-y-3">
                {[
                  { key: 'pinPresent', label: 'Pin Present' },
                  { key: 'tamperSealIntact', label: 'Tamper Seal Intact' },
                  { key: 'gaugeCorrectPressure', label: 'Gauge Shows Correct Pressure' },
                  { key: 'weightCorrect', label: 'Weight feels correct' },
                  { key: 'noDamage', label: 'No Visible Damage, Corrosion, or Leakage' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-200">{label}</span>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={key}
                          checked={checklist[key] === 'pass'}
                          onChange={() => setChecklist(c => ({...c, [key]: 'pass'}))}
                          className="accent-green-500"
                        />
                        <span className="text-xs text-green-400">Pass</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={key}
                          checked={checklist[key] === 'fail'}
                          onChange={() => setChecklist(c => ({...c, [key]: 'fail'}))}
                          className="accent-red-500"
                        />
                        <span className="text-xs text-red-400">Fail</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Location & Accessibility */}
            <div className="mb-6">
              <h4 className="font-semibold text-md mb-3 text-gray-300 border-b border-gray-600 pb-1">Location & Accessibility</h4>
              <div className="space-y-3">
                {[
                  { key: 'inDesignatedLocation', label: 'Extinguisher in designated location' },
                  { key: 'clearlyVisible', label: 'Clearly Visible with no Obstructions' },
                  { key: 'nearestUnder75ft', label: 'Nearest extinguisher not over 75ft away' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-200">{label}</span>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={key}
                          checked={checklist[key] === 'pass'}
                          onChange={() => setChecklist(c => ({...c, [key]: 'pass'}))}
                          className="accent-green-500"
                        />
                        <span className="text-xs text-green-400">Pass</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={key}
                          checked={checklist[key] === 'fail'}
                          onChange={() => setChecklist(c => ({...c, [key]: 'fail'}))}
                          className="accent-red-500"
                        />
                        <span className="text-xs text-red-400">Fail</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mounting & Height */}
            <div className="mb-6">
              <h4 className="font-semibold text-md mb-3 text-gray-300 border-b border-gray-600 pb-1">Mounting & Height</h4>
              <div className="space-y-3">
                {[
                  { key: 'topUnder5ft', label: 'Top <= 5ft (if <= 40lb)' },
                  { key: 'bottomOver4in', label: 'Bottom >= 4 inches from floor' },
                  { key: 'mountedSecurely', label: 'Mounted securely on hanger or in Cabinet' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-200">{label}</span>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={key}
                          checked={checklist[key] === 'pass'}
                          onChange={() => setChecklist(c => ({...c, [key]: 'pass'}))}
                          className="accent-green-500"
                        />
                        <span className="text-xs text-green-400">Pass</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={key}
                          checked={checklist[key] === 'fail'}
                          onChange={() => setChecklist(c => ({...c, [key]: 'fail'}))}
                          className="accent-red-500"
                        />
                        <span className="text-xs text-red-400">Fail</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Administrative */}
            <div className="mb-6">
              <h4 className="font-semibold text-md mb-3 text-gray-300 border-b border-gray-600 pb-1">Administrative</h4>
              <div className="space-y-3">
                {[
                  { key: 'inspectionWithin30Days', label: 'Inspection date within 30 days of last' },
                  { key: 'tagSignedDated', label: 'Tag signed and dated' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-200">{label}</span>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={key}
                          checked={checklist[key] === 'pass'}
                          onChange={() => setChecklist(c => ({...c, [key]: 'pass'}))}
                          className="accent-green-500"
                        />
                        <span className="text-xs text-green-400">Pass</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={key}
                          checked={checklist[key] === 'fail'}
                          onChange={() => setChecklist(c => ({...c, [key]: 'fail'}))}
                          className="accent-red-500"
                        />
                        <span className="text-xs text-red-400">Fail</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes & Photos */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-md text-gray-300">Notes & Photos</h4>
                {notesSaving && (
                  <span className="text-xs text-blue-400">Saving...</span>
                )}
                {notesSaved && !notesSaving && (
                  <span className="text-xs text-green-400">Saved</span>
                )}
              </div>
              <textarea
                className="w-full border border-gray-600 rounded p-3 text-sm mb-3 bg-gray-700 text-white placeholder-gray-400"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={async () => {
                  if (extinguisher && notes !== (extinguisher.notes || '')) {
                    setNotesSaving(true);
                    setNotesSaved(false);
                    try {
                      const inspectionData = { checklistData: checklist, notes, photo: photoFile || null, gps: gps || null };
                      await onSaveNotes?.(extinguisher, notes, inspectionData);
                      setNotesSaved(true);
                      setTimeout(() => setNotesSaved(false), 2000);
                    } catch (error) {
                      console.error('Auto-save on blur failed:', error);
                    } finally {
                      setNotesSaving(false);
                    }
                  }
                }}
                placeholder="Enter any additional notes or observations about the extinguisher or its location... (auto-saves)"
              />

              {/* Photo capture */}
              <div className="flex items-center gap-3 mb-3">
                <label className="px-3 py-2 border border-gray-600 rounded cursor-pointer bg-gray-700 hover:bg-gray-600 transition-colors flex items-center gap-2">
                  <Camera size={16} />
                  <span>Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setPhotoFile(f);
                        setPhotoPreview(URL.createObjectURL(f));
                      }
                    }}
                  />
                </label>
                {photoPreview && (
                  <img src={photoPreview} alt="Selected" className="h-16 w-16 object-cover rounded border border-gray-600" />
                )}
                {photoPreview && (
                  <button
                    className="text-sm text-red-400 hover:text-red-300"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(''); }}
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* GPS capture */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-3 py-2 border border-gray-600 rounded bg-gray-700 hover:bg-gray-600 transition-colors flex items-center gap-2"
                  onClick={captureGps}
                >
                  <MapPin size={16} />
                  {gpsLoading ? 'Capturing…' : 'Capture GPS'}
                </button>
                {gps && (
                  <div className="text-sm text-gray-300 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-gray-700">
                        {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} (±{Math.round(gps.accuracy)}m)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a className="text-blue-400 hover:text-blue-300" href={`https://maps.google.com/?q=${gps.lat},${gps.lng}`} target="_blank" rel="noreferrer">Open in Maps</a>
                      <button className="text-red-400 hover:text-red-300" onClick={() => setGps(null)}>Clear</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pass/Fail Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-600">
              <button
                onClick={() => handleInspection('fail')}
                className="bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-bold text-lg shadow-lg transition"
              >
                <XCircle size={24} />
                FAIL
              </button>
              <button
                onClick={() => handleInspection('pass')}
                className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-bold text-lg shadow-lg transition"
              >
                <CheckCircle size={24} />
                PASS
              </button>
            </div>
          </div>
        )}

        {/* Already Inspected Status Message */}
        {!isPending && (
          <div className={`${currentStatus.bg} rounded-lg p-4 mb-4 border ${currentStatus.color.replace('text-', 'border-')}`}>
            <div className="flex items-center gap-3">
              <StatusIcon size={24} className={currentStatus.color} />
              <div>
                <span className={`font-bold ${currentStatus.color}`}>
                  Already {currentStatus.label}
                </span>
                <span className="text-gray-400 text-sm ml-2">
                  on {formatDate(extinguisher.checkedDate)}
                </span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-2">Reset status to re-inspect this extinguisher.</p>
          </div>
        )}

        {/* Photos Section */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 mb-4 border border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ImageIcon size={24} />
            Photos ({totalPhotos})
          </h2>

          {/* Initial Photos (Thumbnails) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Main Photo */}
            {mainPhoto && (
              <div>
                <p className="text-sm text-gray-400 mb-2">Main Photo</p>
                <a
                  href={mainPhoto}
                  target="_blank"
                  rel="noreferrer"
                  className="block group relative"
                >
                  <img
                    src={mainPhoto}
                    alt="Main extinguisher photo"
                    className="w-full h-48 object-cover rounded-lg border border-gray-600 group-hover:border-blue-400 transition-colors"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <ExternalLink size={32} className="text-white" />
                  </div>
                </a>
              </div>
            )}

            {/* Last Inspection Photo */}
            {lastInspectionPhoto && (
              <div>
                <p className="text-sm text-gray-400 mb-2">Last Inspection Photo</p>
                <a
                  href={lastInspectionPhoto}
                  target="_blank"
                  rel="noreferrer"
                  className="block group relative"
                >
                  <img
                    src={lastInspectionPhoto}
                    alt="Last inspection photo"
                    className="w-full h-48 object-cover rounded-lg border border-gray-600 group-hover:border-blue-400 transition-colors"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <ExternalLink size={32} className="text-white" />
                  </div>
                </a>
              </div>
            )}

            {!mainPhoto && !lastInspectionPhoto && (
              <p className="text-gray-400 col-span-2">No photos available</p>
            )}
          </div>

          {/* View All Photos - Lazy Loaded */}
          {(additionalPhotos.length > 0 || inspectionHistory.some(h => h.photoUrl)) && (
            <div className="border-t border-gray-700 pt-4">
              <button
                onClick={() => setShowAllPhotos(!showAllPhotos)}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showAllPhotos ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                {showAllPhotos ? 'Hide' : 'View'} All Photos ({totalPhotos} total)
              </button>

              {showAllPhotos && (
                <div className="mt-4 space-y-4">
                  {additionalPhotos.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Gallery Photos</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {additionalPhotos.map((photo, index) => (
                          <a
                            key={index}
                            href={photo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block group relative"
                          >
                            <img
                              src={photo.url}
                              alt={`Gallery photo ${index + 2}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-600 group-hover:border-blue-400 transition-colors"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <ExternalLink size={24} className="text-white" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {inspectionHistory.filter(h => h.photoUrl && h.photoUrl !== lastInspectionPhoto).length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Previous Inspection Photos</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {inspectionHistory
                          .filter(h => h.photoUrl && h.photoUrl !== lastInspectionPhoto)
                          .map((inspection, index) => {
                            const inspStatus = getStatusDisplay(inspection.status);
                            return (
                              <a
                                key={index}
                                href={inspection.photoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block group relative"
                              >
                                <img
                                  src={inspection.photoUrl}
                                  alt={`Inspection photo from ${formatDate(inspection.date)}`}
                                  className="w-full h-32 object-cover rounded-lg border border-gray-600 group-hover:border-blue-400 transition-colors"
                                />
                                <div className={`absolute top-2 right-2 ${inspStatus.bg} ${inspStatus.color} px-2 py-1 rounded text-xs font-bold`}>
                                  {inspStatus.label}
                                </div>
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                  <ExternalLink size={24} className="text-white" />
                                </div>
                                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs">
                                  {formatDate(inspection.date)}
                                </div>
                              </a>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Inspection History */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 mb-4 border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Inspection History ({sortedHistory.length})</h2>

          {sortedHistory.length === 0 ? (
            <p className="text-gray-400">No inspection history available</p>
          ) : (
            <div className="space-y-3">
              {sortedHistory.map((inspection, index) => {
                const inspStatus = getStatusDisplay(inspection.status);
                const InspStatusIcon = inspStatus.icon;
                const isExpanded = expandedInspection === index;

                return (
                  <div
                    key={index}
                    className={`${inspStatus.bg} border ${inspStatus.color.replace('text-', 'border-')} rounded-lg p-4`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <InspStatusIcon size={20} className={inspStatus.color} />
                          <span className={`font-bold ${inspStatus.color}`}>{inspStatus.label}</span>
                          <span className="text-gray-400 text-sm">• {formatDate(inspection.date)}</span>
                        </div>

                        {inspection.notes && (
                          <p className="text-gray-300 text-sm mb-2">{inspection.notes}</p>
                        )}

                        {inspection.photoUrl && (
                          <div className="mt-2">
                            <a
                              href={inspection.photoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block group relative"
                            >
                              <img
                                src={inspection.photoUrl}
                                alt={`Inspection photo from ${formatDate(inspection.date)}`}
                                className="h-20 w-auto rounded border border-gray-600 group-hover:border-blue-400 transition-colors"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <ExternalLink size={20} className="text-white" />
                              </div>
                            </a>
                          </div>
                        )}

                        {inspection.gps && (
                          <div className="mt-2 text-xs text-gray-400">
                            <a
                              href={`https://maps.google.com/?q=${inspection.gps.lat},${inspection.gps.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              GPS: {Number(inspection.gps.lat).toFixed(4)}, {Number(inspection.gps.lng).toFixed(4)}
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}

                        {inspection.checklistData && (
                          <div className="mt-2">
                            <button
                              onClick={() => setExpandedInspection(isExpanded ? null : index)}
                              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              {isExpanded ? 'Hide' : 'View'} Checklist Details
                            </button>

                            {isExpanded && (
                              <div className="mt-2 bg-black/30 p-3 rounded text-sm space-y-1">
                                {Object.entries(inspection.checklistData).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-gray-300">
                                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                    </span>
                                    <span className={value === 'pass' ? 'text-green-400' : 'text-red-400'}>
                                      {value === 'pass' ? '✓ Pass' : '✗ Fail'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Replacement History */}
        {extinguisher.replacementHistory && extinguisher.replacementHistory.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 mb-4 border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <RotateCcw size={24} />
              Replacement History ({extinguisher.replacementHistory.length})
            </h2>

            <div className="space-y-3">
              {extinguisher.replacementHistory.map((replacement, index) => (
                <div
                  key={index}
                  className="bg-orange-900/30 border border-orange-700 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <RotateCcw size={18} className="text-orange-400" />
                    <span className="font-bold text-orange-400">REPLACED</span>
                    <span className="text-gray-400 text-sm">• {formatDate(replacement.date)}</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-400">Old Serial:</span>
                        <span className="text-gray-200 ml-2">{replacement.oldSerial || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">New Serial:</span>
                        <span className="text-green-300 ml-2 font-semibold">{replacement.newSerial || 'N/A'}</span>
                      </div>
                    </div>

                    {replacement.oldAssetId && replacement.oldAssetId !== extinguisher.assetId && (
                      <div>
                        <span className="text-gray-400">Old Asset ID:</span>
                        <span className="text-gray-200 ml-2">{replacement.oldAssetId}</span>
                      </div>
                    )}

                    {replacement.oldStatus && (
                      <div>
                        <span className="text-gray-400">Old Status:</span>
                        <span className={`ml-2 font-semibold ${replacement.oldStatus === 'fail' ? 'text-red-400' : replacement.oldStatus === 'pass' ? 'text-green-400' : 'text-yellow-400'}`}>
                          {replacement.oldStatus.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {replacement.newManufactureDate && (
                      <div>
                        <span className="text-gray-400">New Manufacture Date:</span>
                        <span className="text-gray-200 ml-2">{replacement.newManufactureDate}</span>
                      </div>
                    )}

                    {replacement.reason && (
                      <div>
                        <span className="text-gray-400">Reason:</span>
                        <span className="text-gray-200 ml-2">{replacement.reason}</span>
                      </div>
                    )}

                    {replacement.notes && (
                      <div>
                        <span className="text-gray-400">Notes:</span>
                        <p className="text-gray-300 mt-1 bg-gray-900/50 p-2 rounded">{replacement.notes}</p>
                      </div>
                    )}

                    {replacement.replacedBy && (
                      <div className="text-xs text-gray-500 mt-2">
                        Replaced by: {replacement.replacedBy}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-700 p-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-600 text-white p-3 rounded-lg hover:bg-gray-500 font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleEditClick}
              className="flex-1 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-semibold transition"
            >
              <Edit2 size={20} />
              Edit
            </button>
            <button
              onClick={handleReplaceClick}
              className="flex-1 bg-orange-600 text-white p-3 rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2 font-semibold transition"
            >
              <RotateCcw size={20} />
              Replace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtinguisherDetailView;
