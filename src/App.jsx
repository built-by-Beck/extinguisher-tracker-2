import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Search, Upload, CheckCircle, XCircle, Circle, Download, Filter, Edit2, Save, X, Menu, ScanLine, Plus, Clock, Play, Pause, StopCircle, LogOut, Camera, Calendar, Settings, RotateCcw, FileText, Calculator as CalculatorIcon } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, getDocs, setDoc, getDocs as getDocsOnce, writeBatch } from 'firebase/firestore';
import { auth, db, storage } from './firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { deleteObject } from 'firebase/storage';
import Login from './Login';
import CameraScanner from './components/BarcodeScanner.jsx';
import SectionGrid from './components/SectionGrid';
import SectionDetail from './components/SectionDetail';
import ExtinguisherDetailView from './components/ExtinguisherDetailView';
import Calculator from './components/Calculator.jsx';

const SECTIONS = [
  'Main Hospital',
  'Building A',
  'Building B', 
  'Building C',
  'Building D',
  'WMC',
  'Employee Parking',
  'Visitor Parking',
  'FED'
];

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extinguishers, setExtinguishers] = useState([]);
  const [selectedSection, setSelectedSection] = useState('Main Hospital');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('pending');
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [sectionFilterCollapsed, setSectionFilterCollapsed] = useState(false);
  const [inspectionLogs, setInspectionLogs] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemNotes, setSelectedItemNotes] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSection, setImportSection] = useState('Main Hospital');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [newItem, setNewItem] = useState({
    assetId: '',
    serial: '',
    vicinity: '',
    parentLocation: '',
    section: 'Main Hospital'
  });
  const [newItemPhoto, setNewItemPhoto] = useState(null);
  const [newItemGps, setNewItemGps] = useState(null);
  const [newItemGpsLoading, setNewItemGpsLoading] = useState(false);
  
  const [sectionTimes, setSectionTimes] = useState({});
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [currentElapsed, setCurrentElapsed] = useState(0);
  const [sectionViewMode, setSectionViewMode] = useState({}); // 'unchecked' or 'checked' per section

  // Section notes state
  const [sectionNotes, setSectionNotes] = useState({});
  const [showSectionNotesModal, setShowSectionNotesModal] = useState(false);
  const [currentSectionNote, setCurrentSectionNote] = useState('');
  const [noteSelectedSection, setNoteSelectedSection] = useState('Main Hospital');

  // Export options state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    type: 'all', // 'all', 'passed', 'failed'
    includePhotos: true,
    includeGPS: true,
    includeChecklist: true,
    includeInspectionHistory: false
  });

  const scanInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const dbBackupInputRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load data when user changes
  useEffect(() => {
    if (!user) {
      setExtinguishers([]);
      setSectionTimes({});
      return;
    }

    // Load extinguishers from Firestore
    const extinguishersQuery = query(
      collection(db, 'extinguishers'),
      where('userId', '==', user.uid)
    );

    const unsubscribeExtinguishers = onSnapshot(extinguishersQuery, (snapshot) => {
      const extinguisherData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExtinguishers(extinguisherData);
    });

    // Load section times from localStorage (keep this local for now)
    const savedTimes = localStorage.getItem(`sectionTimes_${user.uid}`);
    if (savedTimes) {
      setSectionTimes(JSON.parse(savedTimes));
    }

    // Load section notes from Firestore
    const sectionNotesQuery = query(
      collection(db, 'sectionNotes'),
      where('userId', '==', user.uid)
    );

    const unsubscribeSectionNotes = onSnapshot(sectionNotesQuery, (snapshot) => {
      const notesData = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        notesData[data.section] = {
          id: doc.id,
          notes: data.notes || '',
          lastUpdated: data.lastUpdated
        };
      });
      setSectionNotes(notesData);
    });

    return () => {
      unsubscribeExtinguishers();
      unsubscribeSectionNotes();
    };
  }, [user]);

  useEffect(() => {
    if (user && Object.keys(sectionTimes).length > 0) {
      localStorage.setItem(`sectionTimes_${user.uid}`, JSON.stringify(sectionTimes));
    }
  }, [sectionTimes, user]);

  useEffect(() => {
    if (activeTimer && timerStartTime) {
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - timerStartTime;
        setCurrentElapsed(elapsed);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeTimer, timerStartTime]);

  const startTimer = (section) => {
    setActiveTimer(section);
    setTimerStartTime(Date.now());
    setCurrentElapsed(0);
  };

  const pauseTimer = () => {
    if (activeTimer && timerStartTime) {
      const elapsed = Date.now() - timerStartTime;
      setSectionTimes(prev => ({
        ...prev,
        [activeTimer]: (prev[activeTimer] || 0) + elapsed
      }));
      setActiveTimer(null);
      setTimerStartTime(null);
      setCurrentElapsed(0);
    }
  };

  const stopTimer = () => {
    if (activeTimer && timerStartTime) {
      const elapsed = Date.now() - timerStartTime;
      setSectionTimes(prev => ({
        ...prev,
        [activeTimer]: (prev[activeTimer] || 0) + elapsed
      }));
    }
    setActiveTimer(null);
    setTimerStartTime(null);
    setCurrentElapsed(0);
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getTotalTime = (section) => {
    const storedTime = sectionTimes[section] || 0;
    const currentTime = (activeTimer === section) ? currentElapsed : 0;
    return storedTime + currentTime;
  };

  const clearSectionTime = (section) => {
    if (window.confirm(`Clear time for ${section}?`)) {
      setSectionTimes(prev => {
        const updated = { ...prev };
        delete updated[section];
        return updated;
      });
    }
  };

  const clearAllTimes = () => {
    if (window.confirm('Clear all time tracking data?')) {
      setSectionTimes({});
      stopTimer();
      localStorage.removeItem('sectionTimes');
    }
  };

  // Remove localStorage backup since we're using Firestore
  // useEffect(() => {
  //   if (extinguishers.length > 0) {
  //     localStorage.setItem('extinguishers', JSON.stringify(extinguishers));
  //     localStorage.setItem('lastSaved', new Date().toISOString());
  //   }
  // }, [extinguishers]);

  useEffect(() => {
    if (user) {
      const sessionState = {
        selectedSection,
        view,
        searchTerm,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`sessionState_${user.uid}`, JSON.stringify(sessionState));
    }
  }, [selectedSection, view, searchTerm, user]);

  useEffect(() => {
    if (user) {
      const savedSession = localStorage.getItem(`sessionState_${user.uid}`);

      if (savedSession) {
        const session = JSON.parse(savedSession);
        setSelectedSection(session.selectedSection || 'Main Hospital');
        setView(session.view || 'pending');
        setSearchTerm(session.searchTerm || '');
      }
    }
  }, [user]);

  useEffect(() => {
    if (scanMode && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [scanMode]);

  // Keep the modal notes field in sync with the selected item
  useEffect(() => {
    setSelectedItemNotes(selectedItem?.notes || '');
  }, [selectedItem]);

  const saveData = async (newData) => {
    // Firestore handles the state updates through onSnapshot
    // This function is now mainly for compatibility
    setExtinguishers(newData);
  };

  // Export user's Firestore data to a JSON backup file
  const exportDatabaseBackup = async () => {
    try {
      if (!user) {
        alert('Please sign in first.');
        return;
      }

      // Fetch user-scoped collections
      const [extSnap, notesSnap, logsSnap] = await Promise.all([
        getDocs(query(collection(db, 'extinguishers'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'sectionNotes'), where('userId', '==', user.uid))),
        // inspectionLogs are optional; ignore if rules restrict
        (async () => {
          try {
            return await getDocs(query(collection(db, 'inspectionLogs'), where('userId', '==', user.uid)));
          } catch (e) {
            return { docs: [] };
          }
        })()
      ]);

      const extinguishersData = extSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sectionNotesData = notesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const inspectionLogsData = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        app: 'fire-extinguisher-tracker',
        userId: user.uid,
        collections: {
          extinguishers: extinguishersData,
          sectionNotes: sectionNotesData,
          inspectionLogs: inspectionLogsData
        }
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      const monthName = previousMonth.toLocaleDateString('en-US', { month: 'long' });
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${monthName}_Database_Backup_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error exporting database backup:', e);
      alert('Failed to export database backup.');
    }
  };

  // Export core extinguisher database to CSV with importer-friendly headers
  const exportDatabaseCsv = async () => {
    try {
      if (!user) { alert('Please sign in first.'); return; }
      // Map to canonical column names expected by importer
      const rows = (extinguishers || []).map(item => ({
        'Asset ID': item.assetId || '',
        'Serial': item.serial || '',
        'Vicinity': item.vicinity || '',
        'Parent Location': item.parentLocation || '',
        'Section': item.section || ''
      }));

      // Ensure stable ordering
      const header = ['Asset ID', 'Serial', 'Vicinity', 'Parent Location', 'Section'];
      const ws = XLSX.utils.json_to_sheet(rows, { header });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Extinguishers');
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      XLSX.writeFile(wb, `Extinguisher_Database_Export_${date}.csv`);
    } catch (e) {
      console.error('Error exporting CSV:', e);
      alert('Failed to export CSV.');
    }
  };

  // Replace current user's Firestore data with a JSON backup file
  const handleImportDatabaseBackup = async (e) => {
    const file = e.target.files?.[0];
    // Reset the input so selecting the same file again triggers change
    e.target.value = null;
    if (!file) return;
    if (!user) { alert('Please sign in first.'); return; }

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup || typeof backup !== 'object' || !backup.collections) {
        alert('Invalid backup file.');
        return;
      }

      const { collections } = backup;
      const extList = Array.isArray(collections.extinguishers) ? collections.extinguishers : [];
      const notesList = Array.isArray(collections.sectionNotes) ? collections.sectionNotes : [];
      const logsList = Array.isArray(collections.inspectionLogs) ? collections.inspectionLogs : [];

      const confirmText = [
        'This will replace your current database with the backup file.',
        `Extinguishers in backup: ${extList.length}`,
        `Section notes in backup: ${notesList.length}`,
        `Inspection logs in backup: ${logsList.length}`,
        '',
        'Continue?'
      ].join('\n');
      if (!window.confirm(confirmText)) return;

      // 1) Delete current user's docs (chunked for safety)
      const deleteCollectionDocs = async (collName) => {
        const snap = await getDocs(query(collection(db, collName), where('userId', '==', user.uid)));
        const docs = snap.docs;
        // Firestore batch limit is 500
        for (let i = 0; i < docs.length; i += 450) {
          const slice = docs.slice(i, i + 450);
          const batch = writeBatch(db);
          slice.forEach(d => batch.delete(doc(db, collName, d.id)));
          await batch.commit();
        }
      };

      await deleteCollectionDocs('extinguishers');
      await deleteCollectionDocs('sectionNotes');
      await deleteCollectionDocs('inspectionLogs');

      // 2) Import backup docs for this user
      const safeString = (val) => (val == null ? '' : String(val));

      // Extinguishers
      for (const item of extList) {
        const data = { ...item };
        delete data.id;
        data.userId = user.uid;
        // Ensure required fields exist
        data.assetId = safeString(data.assetId);
        data.status = data.status || 'pending';
        data.createdAt = data.createdAt || new Date().toISOString();
        await addDoc(collection(db, 'extinguishers'), data);
      }

      // Section notes with deterministic IDs to avoid duplicates
      for (const note of notesList) {
        const data = { ...note };
        delete data.id;
        data.userId = user.uid;
        const section = safeString(data.section || data.Section || 'General');
        const slug = section.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const id = `${user.uid}__${slug || 'section'}`;
        await setDoc(doc(collection(db, 'sectionNotes'), id), {
          ...data,
          section,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
          createdAt: data.createdAt || new Date().toISOString()
        }, { merge: true });
      }

      // Inspection logs (best-effort; ignore failures)
      for (const log of logsList) {
        const data = { ...log };
        delete data.id;
        data.userId = user.uid;
        try {
          await addDoc(collection(db, 'inspectionLogs'), data);
        } catch (e) {
          // Non-fatal: rules might block writes; keep importing other data
          console.warn('Skipping inspection log import due to rules:', e?.code || e?.message || e);
        }
      }

      alert('Database import completed successfully.');
    } catch (err) {
      console.error('Error importing database backup:', err);
      alert('Failed to import database backup.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (event) => {
      const processFile = async () => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          // Prepare a local index of existing extinguishers by Asset ID (string)
          // Use loaded state; if not yet loaded, the onSnapshot handler will refresh UI after import
          const existingIndex = new Map(
            (extinguishers || [])
              .filter(x => x && x.assetId)
              .map(x => [String(x.assetId), x])
          );

          // Normalize and parse incoming rows; allow a Section column to override the dropdown
          const parsed = jsonData
            .map((row) => {
              const assetIdRaw = row['Asset ID'] || row['Asset\nID'] || row['AssetID'] || row['assetId'] || row['ID'] || '';
              const assetId = String(assetIdRaw || '').trim();
              if (!assetId) return null;

              const vicinity = String(row['Vicinity'] || row['vicinity'] || '').trim();
              const serial = String(row['Serial'] || row['serial'] || '').trim();
              const parentLocation = String(row['Parent Location'] || row['Parent\nLocation'] || row['parentLocation'] || '').trim();
              const sectionFromRow = row['Section'] || row['SECTION'] || row['section'] || row['Building'] || row['Area'] || null;
              const resolvedSection = sectionFromRow ? String(sectionFromRow).trim() : importSection;

              return {
                assetId,
                vicinity,
                serial,
                parentLocation,
                section: resolvedSection,
              };
            })
            .filter(Boolean);

          let added = 0;
          let updated = 0;

          // Merge: update existing by assetId; add new otherwise. Never delete or overwrite photos/history.
          for (const item of parsed) {
            const existing = existingIndex.get(item.assetId);
            try {
              if (existing) {
                const docRef = doc(db, 'extinguishers', existing.id);
                await updateDoc(docRef, {
                  vicinity: item.vicinity,
                  serial: item.serial,
                  parentLocation: item.parentLocation,
                  section: item.section,
                  // Intentionally do NOT touch: status, notes, photos, inspectionHistory, lastInspection*
                  updatedAt: new Date().toISOString()
                });
                updated += 1;
              } else {
                await addDoc(collection(db, 'extinguishers'), {
                  assetId: item.assetId,
                  vicinity: item.vicinity,
                  serial: item.serial,
                  parentLocation: item.parentLocation,
                  section: item.section,
                  status: 'pending',
                  checkedDate: null,
                  notes: '',
                  inspectionHistory: [],
                  userId: user.uid,
                  createdAt: new Date().toISOString()
                });
                added += 1;
              }
            } catch (error) {
              console.error('Error merging item', item.assetId, error);
            }
          }

          setShowImportModal(false);
          alert(`Import complete.\n\nAdded: ${added}\nUpdated: ${updated}\n\nNo existing photos, logs, or inspection history were removed.`);
        } catch (error) {
          alert('Error reading file. Please make sure it is a valid CSV or Excel file.');
          console.error(error);
        }
      };

      processFile();
    };

    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  const handleAddNew = async () => {
    if (!newItem.assetId.trim()) {
      alert('Asset ID is required');
      return;
    }

    try {
      // optional photo upload
      let assetPhotoUrl = null;
      if (newItemPhoto instanceof File) {
        const path = `assets/${newItem.assetId.trim()}/${Date.now()}_${newItemPhoto.name}`;
        const sref = storageRef(storage, path);
        const snap = await uploadBytes(sref, newItemPhoto, { contentType: newItemPhoto.type });
        assetPhotoUrl = await getDownloadURL(snap.ref);
      }

      const item = {
        assetId: newItem.assetId.trim(),
        vicinity: newItem.vicinity.trim(),
        serial: newItem.serial.trim(),
        parentLocation: newItem.parentLocation.trim(),
        section: newItem.section,
        status: 'pending',
        checkedDate: null,
        notes: '',
        inspectionHistory: [],
        userId: user.uid,
        createdAt: new Date().toISOString(),
        photoUrl: assetPhotoUrl,
        location: newItemGps || null
      };

      await addDoc(collection(db, 'extinguishers'), item);
      setShowAddModal(false);
      setNewItem({
        assetId: '',
        serial: '',
        vicinity: '',
        parentLocation: '',
        section: 'Main Hospital'
      });
      setNewItemPhoto(null);
      setNewItemGps(null);
      alert('New fire extinguisher added successfully!');
    } catch (error) {
      console.error('Error adding extinguisher:', error);
      alert('Error adding fire extinguisher. Please try again.');
    }
  };

  const handleInspection = async (item, status, notes = '', inspectionData = null) => {
    try {
      let photoUrl = null;
      if (inspectionData?.photo instanceof File) {
        try {
          const file = inspectionData.photo;
          const safeSeg = String(item.assetId || item.id || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_');
          const path = `inspections/${safeSeg}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const sref = storageRef(storage, path);
          const snapshot = await uploadBytes(sref, file, { contentType: file.type });
          photoUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadErr) {
          console.warn('Photo upload failed; saving inspection without photo:', uploadErr);
        }
      }
      const gps = inspectionData?.gps || null;
      const inspection = {
        date: new Date().toISOString(),
        status,
        notes,
        inspector: user.email || 'Current User',
        checklistData: inspectionData?.checklistData || null,
        photoUrl: photoUrl || null,
        gps: gps
      };

      const docRef = doc(db, 'extinguishers', item.id);
      await updateDoc(docRef, {
        status,
        checkedDate: new Date().toISOString(),
        notes,
        checklistData: inspectionData?.checklistData || null,
        lastInspectionPhotoUrl: photoUrl || null,
        lastInspectionGps: gps || null,
        inspectionHistory: [...(item.inspectionHistory || []), inspection]
      });

      setSelectedItem(null);
    } catch (error) {
      console.error('Error updating inspection:', { code: error?.code, message: error?.message });
      alert(`Error saving inspection.\n\n${error?.code || ''} ${error?.message || ''}`.trim());
    }
  };

  const handleScan = (e) => {
    e.preventDefault();
    const searchValue = scanInput.trim();

    if (!searchValue) {
      alert('Please enter something to search for');
      return;
    }

    console.log('=== SEARCH DEBUG ===');
    console.log('Searching for:', searchValue);
    console.log('Total extinguishers loaded:', extinguishers.length);

    if (extinguishers.length === 0) {
      alert('No extinguishers loaded in database. Please import data first.');
      return;
    }

    // Show first few extinguishers for debugging
    console.log('Sample extinguishers:', extinguishers.slice(0, 3));

    // Simple search
    const searchLower = searchValue.toLowerCase();
    const found = extinguishers.find(item => {
      const assetId = String(item.assetId || '').toLowerCase();
      const serial = String(item.serial || '').toLowerCase();

      console.log('Checking item:', { assetId, serial, searchLower });

      return assetId.includes(searchLower) || serial.includes(searchLower);
    });

    console.log('Search result:', found);

    if (found) {
      setSelectedItem(found);
      setScanInput('');
      setScanMode(false);
      alert('Found! Opening fire extinguisher details.');
    } else {
      // Show what we actually have for debugging
      const allAssetIds = extinguishers.map(item => item.assetId).slice(0, 5);
      alert(`NOT FOUND: "${searchValue}"\n\nTotal extinguishers: ${extinguishers.length}\n\nFirst few Asset IDs in database:\n${allAssetIds.join(', ')}\n\nTry typing one of these numbers exactly.`);
      // Don't clear input so user can try again
    }
  };

  const handleCameraScan = (scannedText) => {
    const searchValue = scannedText.trim();

    if (!searchValue) {
      alert('Please enter a value to search for.');
      return;
    }

    console.log('=== CAMERA SEARCH DEBUG ===');
    console.log('Searching for:', searchValue);
    console.log('Total extinguishers:', extinguishers.length);

    if (extinguishers.length === 0) {
      alert('No extinguishers loaded. Please import data first.');
      setShowCameraScanner(false);
      return;
    }

    // Simple search
    const searchLower = searchValue.toLowerCase();
    const found = extinguishers.find(item => {
      const assetId = String(item.assetId || '').toLowerCase();
      const serial = String(item.serial || '').toLowerCase();

      return assetId.includes(searchLower) || serial.includes(searchLower);
    });

    setShowCameraScanner(false);

    if (found) {
      setSelectedItem(found);
      alert('Found! Opening fire extinguisher details.');
    } else {
      const allAssetIds = extinguishers.map(item => item.assetId).slice(0, 5);
      alert(`NOT FOUND: "${searchValue}"\n\nTotal extinguishers: ${extinguishers.length}\n\nFirst few Asset IDs:\n${allAssetIds.join(', ')}`);
    }
  };

  const handleEdit = (item) => {
    setEditItem({ ...item });
  };

  const saveEdit = async () => {
    if (!editItem) return;

    try {
      const docRef = doc(db, 'extinguishers', editItem.id);
      await updateDoc(docRef, {
        assetId: editItem.assetId,
        vicinity: editItem.vicinity,
        serial: editItem.serial,
        parentLocation: editItem.parentLocation,
        section: editItem.section,
        location: editItem.location || null
      });

      // Update selectedItem if it's the same item being edited
      if (selectedItem && selectedItem.id === editItem.id) {
        setSelectedItem({ ...editItem });
      }

      setEditItem(null);
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Error saving changes. Please try again.');
    }
  };

  const deleteItem = async (item) => {
    if (window.confirm(`Are you sure you want to delete fire extinguisher ${item.assetId}?`)) {
      try {
        await deleteDoc(doc(db, 'extinguishers', item.id));
        setEditItem(null);
        alert('Fire extinguisher deleted successfully!');
      } catch (error) {
        console.error('Error deleting extinguisher:', error);
        alert('Error deleting fire extinguisher. Please try again.');
      }
    }
  };

  const resetStatus = async (item) => {
    try {
      const docRef = doc(db, 'extinguishers', item.id);
      await updateDoc(docRef, {
        status: 'pending',
        checkedDate: null,
        notes: ''
      });
      setSelectedItem(null);
    } catch (error) {
      console.error('Error resetting status:', error);
      alert('Error resetting status. Please try again.');
    }
  };

  const exportData = (options = exportOptions) => {
    const { type, includePhotos, includeGPS, includeChecklist, includeInspectionHistory } = options;

    let dataToExport;

    if (type === 'passed') {
      dataToExport = extinguishers.filter(e => e.status === 'pass');
    } else if (type === 'failed') {
      dataToExport = extinguishers.filter(e => e.status === 'fail');
    } else {
      dataToExport = extinguishers;
    }

    const formatted = dataToExport.map(item => {
      const baseData = {
        'Asset ID': item.assetId,
        'Serial': item.serial,
        'Vicinity': item.vicinity,
        'Parent Location': item.parentLocation,
        'Section': item.section,
        'Status': item.status.toUpperCase(),
        'Checked Date': item.checkedDate ? new Date(item.checkedDate).toLocaleString() : '',
        'Notes': item.notes || ''
      };

      // Add GPS data if requested
      if (includeGPS) {
        const gps = item.lastInspectionGps || item.location;
        if (gps) {
          baseData['GPS Latitude'] = gps.lat ? gps.lat.toFixed(6) : '';
          baseData['GPS Longitude'] = gps.lng ? gps.lng.toFixed(6) : '';
          baseData['GPS Accuracy (m)'] = gps.accuracy ? Math.round(gps.accuracy) : '';
          baseData['GPS Altitude (m)'] = gps.altitude !== null && gps.altitude !== undefined ? Math.round(gps.altitude) : '';
          baseData['GPS Maps Link'] = gps.lat && gps.lng ? `https://maps.google.com/?q=${gps.lat},${gps.lng}` : '';
        }
      }

      // Add photo URLs if requested
      if (includePhotos) {
        const photos = item.photos || [];
        if (photos.length > 0) {
          baseData['Main Photo URL'] = photos[0]?.url || '';
          baseData['All Photo URLs'] = photos.map(p => p.url).join(' | ');
          baseData['Photo Count'] = photos.length;
        }
        if (item.lastInspectionPhotoUrl) {
          baseData['Last Inspection Photo'] = item.lastInspectionPhotoUrl;
        }
      }

      // Add checklist details if available and requested
      if (includeChecklist && item.checklistData) {
        const checklist = item.checklistData;
        baseData['Pin Present'] = checklist.pinPresent || '';
        baseData['Tamper Seal Intact'] = checklist.tamperSealIntact || '';
        baseData['Gauge Correct Pressure'] = checklist.gaugeCorrectPressure || '';
        baseData['Weight Correct'] = checklist.weightCorrect || '';
        baseData['No Damage'] = checklist.noDamage || '';
        baseData['In Designated Location'] = checklist.inDesignatedLocation || '';
        baseData['Clearly Visible'] = checklist.clearlyVisible || '';
        baseData['Nearest Under 75ft'] = checklist.nearestUnder75ft || '';
        baseData['Top Under 5ft'] = checklist.topUnder5ft || '';
        baseData['Bottom Over 4in'] = checklist.bottomOver4in || '';
        baseData['Mounted Securely'] = checklist.mountedSecurely || '';
        baseData['Inspection Within 30 Days'] = checklist.inspectionWithin30Days || '';
        baseData['Tag Signed & Dated'] = checklist.tagSignedDated || '';
      }

      // Add inspection history if requested
      if (includeInspectionHistory && item.inspectionHistory && item.inspectionHistory.length > 0) {
        baseData['Inspection History Count'] = item.inspectionHistory.length;
        baseData['Inspection History'] = item.inspectionHistory.map(h =>
          `${new Date(h.date).toLocaleDateString()} - ${h.status.toUpperCase()}${h.notes ? ': ' + h.notes : ''}`
        ).join(' | ');
      }

      return baseData;
    });

    // Generate filename with previous month's name and current timestamp
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const monthName = previousMonth.toLocaleDateString('en-US', { month: 'long' });
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const typeLabel = type === 'all' ? 'All' : type === 'passed' ? 'Passed' : 'Failed';

    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inspections');
    XLSX.writeFile(wb, `${monthName}_Extinguisher_Checks_${typeLabel}_${timestamp}_Export.xlsx`);
  };

  const exportTimeData = () => {
    const timeData = SECTIONS.map(section => ({
      'Section': section,
      'Time Spent': formatTime(sectionTimes[section] || 0),
      'Total Milliseconds': sectionTimes[section] || 0,
      'Total Minutes': Math.round((sectionTimes[section] || 0) / 60000),
      'Items Checked': extinguishers.filter(e => e.section === section && e.status !== 'pending').length,
      'Items Pending': extinguishers.filter(e => e.section === section && e.status === 'pending').length,
      'Section Notes': sectionNotes[section]?.notes || ''
    }));

    // Generate filename with previous month's name and current timestamp
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const monthName = previousMonth.toLocaleDateString('en-US', { month: 'long' });
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    const ws = XLSX.utils.json_to_sheet(timeData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Time Tracking');
    XLSX.writeFile(wb, `${monthName}_Time_Tracking_${timestamp}_Export.xlsx`);
  };

  const clearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      // Delete all user's extinguishers from Firestore
      const extinguishersQuery = query(
        collection(db, 'extinguishers'),
        where('userId', '==', user.uid)
      );

      const snapshot = await getDocs(extinguishersQuery);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Clear local data
      localStorage.removeItem(`sessionState_${user.uid}`);
      localStorage.removeItem(`sectionTimes_${user.uid}`);
      setSelectedItem(null);
      setEditItem(null);
      setSectionTimes({});
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Section notes functions
  const openSectionNotes = () => {
    setNoteSelectedSection(selectedSection); // Start with current section
    const currentNote = sectionNotes[selectedSection]?.notes || '';
    setCurrentSectionNote(currentNote);
    setShowSectionNotesModal(true);
  };

  const handleNoteSectionChange = (section) => {
    setNoteSelectedSection(section);
    const currentNote = sectionNotes[section]?.notes || '';
    setCurrentSectionNote(currentNote);
  };

  const saveSectionNotes = async () => {
    try {
      const existingNote = sectionNotes[noteSelectedSection];

      if (existingNote && existingNote.id) {
        const docRef = doc(db, 'sectionNotes', existingNote.id);
        await updateDoc(docRef, {
          notes: currentSectionNote,
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Try to find any existing doc for this user + section (avoids duplicates)
        const findQuery = query(
          collection(db, 'sectionNotes'),
          where('userId', '==', user.uid),
          where('section', '==', noteSelectedSection)
        );
        const found = await getDocsOnce(findQuery);
        if (!found.empty) {
          const docRef = found.docs[0].ref;
          await updateDoc(docRef, {
            notes: currentSectionNote,
            lastUpdated: new Date().toISOString()
          });
        } else {
          // Prefer deterministic ID to satisfy potential security rules
          const slug = `${noteSelectedSection}`
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
          const id = `${user.uid}__${slug || 'section'}`;
          const targetRef = doc(collection(db, 'sectionNotes'), id);
          try {
            await setDoc(targetRef, {
              userId: user.uid,
              section: noteSelectedSection,
              notes: currentSectionNote,
              lastUpdated: new Date().toISOString(),
              createdAt: new Date().toISOString()
            }, { merge: true });
          } catch (err) {
            // Fallback to addDoc (older rules may allow this)
            await addDoc(collection(db, 'sectionNotes'), {
              userId: user.uid,
              section: noteSelectedSection,
              notes: currentSectionNote,
              lastUpdated: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      setShowSectionNotesModal(false);
      alert(`Notes for ${noteSelectedSection} saved successfully!`);
    } catch (error) {
      console.error('Error saving section notes:', { code: error?.code, message: error?.message, section: noteSelectedSection });
      alert(`Error saving section notes for "${noteSelectedSection}".\n\n${error?.code || ''} ${error?.message || ''}`.trim());
    }
  };

  const getSectionViewMode = (section) => {
    return sectionViewMode[section] || 'unchecked'; // Default to showing unchecked items
  };

  const toggleSectionView = (section) => {
    setSectionViewMode(prev => ({
      ...prev,
      [section]: prev[section] === 'checked' ? 'unchecked' : 'checked'
    }));
  };

  const countsForSection = (section) => {
    const list = extinguishers.filter(e => e.section === section);
    const unchecked = list.filter(e => e.status === 'pending').length;
    return { checked: list.length - unchecked, unchecked };
  };

  // helpers for SectionDetail actions
  const handlePass = (item, notesSummary = '', inspectionData = null) => handleInspection(item, 'pass', notesSummary, inspectionData);
  const handleFail = (item, notesSummary = '', inspectionData = null) => handleInspection(item, 'fail', notesSummary, inspectionData);
  const handleSaveNotes = async (item, notesSummary, inspectionData = null) => {
    try {
      let photoUrl = null;
      if (inspectionData?.photo instanceof File) {
        try {
          const file = inspectionData.photo;
          const safeSeg = String(item.assetId || item.id || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_');
          const path = `inspections/${safeSeg}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const sref = storageRef(storage, path);
          const snapshot = await uploadBytes(sref, file, { contentType: file.type });
          photoUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadErr) {
          console.warn('Photo upload failed; saving notes without photo:', uploadErr);
        }
      }
      const gps = inspectionData?.gps;

      const docRef = doc(db, 'extinguishers', item.id);
      // Only update fields that are explicitly provided
      const updates = { notes: notesSummary || '' };
      if (inspectionData && typeof inspectionData.checklistData !== 'undefined') {
        updates.checklistData = inspectionData.checklistData;
      }
      if (photoUrl) {
        updates.lastInspectionPhotoUrl = photoUrl;
      }
      if (gps) {
        updates.lastInspectionGps = gps;
      }
      await updateDoc(docRef, updates);
    } catch (e) {
      console.error('Error saving notes:', { code: e?.code, message: e?.message });
      alert(`Error saving notes.\n\n${e?.code || ''} ${e?.message || ''}`.trim());
    }
  };

  // Photo helpers for assets (max 5)
  const addAssetPhoto = async (asset, file) => {
    if (!asset || !file) return;
    const photos = asset.photos || [];
    if (photos.length >= 5) { alert('Photo limit reached (5 per asset).'); return; }
    const path = `assets/${asset.assetId || asset.id}/${Date.now()}_${file.name}`;
    const sref = storageRef(storage, path);
    const snap = await uploadBytes(sref, file, { contentType: file.type });
    const url = await getDownloadURL(snap.ref);
    const docRef = doc(db, 'extinguishers', asset.id);
    const next = [...photos, { url, uploadedAt: new Date().toISOString(), path }];
    await updateDoc(docRef, { photos: next });
    setSelectedItem({ ...asset, photos: next });
  };

  const setMainAssetPhoto = async (asset, index) => {
    const photos = asset.photos || [];
    if (index <= 0 || index >= photos.length) return;
    const reordered = [photos[index], ...photos.slice(0, index), ...photos.slice(index + 1)];
    const docRef = doc(db, 'extinguishers', asset.id);
    await updateDoc(docRef, { photos: reordered });
    setSelectedItem({ ...asset, photos: reordered });
  };

  const removeAssetPhoto = async (asset, index) => {
    const photos = asset.photos || [];
    if (index < 0 || index >= photos.length) return;
    const removing = photos[index];
    const docRef = doc(db, 'extinguishers', asset.id);
    const next = photos.filter((_, i) => i !== index);
    await updateDoc(docRef, { photos: next });
    // hard delete from storage (best-effort)
    try { if (removing.path) await deleteObject(storageRef(storage, removing.path)); } catch (e) { console.warn('Failed to delete storage object', e); }
    setSelectedItem({ ...asset, photos: next });
  };

  const resetMonthlyStatus = async () => {
    console.log('=== MONTHLY RESET DEBUG ===');
    const currentDate = new Date().toISOString();
    const currentMonth = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    console.log('Current date:', currentDate);
    console.log('Current month:', currentMonth);
    console.log('User ID:', user?.uid);

    if (!window.confirm(`Start new monthly inspection cycle for ${currentMonth}?\n\nThis will:\n• Reset all extinguisher statuses to "pending"\n• Save current inspection results to history\n• Keep all extinguisher data intact`)) {
      console.log('User cancelled reset');
      return;
    }

    try {
      console.log('Starting reset process...');
      const extinguishersQuery = query(
        collection(db, 'extinguishers'),
        where('userId', '==', user.uid)
      );
      console.log('Created query for user:', user.uid);

      const snapshot = await getDocs(extinguishersQuery);
      console.log('Got snapshot with', snapshot.docs.length, 'documents');

      if (snapshot.docs.length === 0) {
        alert('No extinguishers found to reset. Please import fire extinguisher data first.');
        return;
      }

      // Show current status counts
      const statusCounts = {
        pass: snapshot.docs.filter(doc => doc.data().status === 'pass').length,
        fail: snapshot.docs.filter(doc => doc.data().status === 'fail').length,
        pending: snapshot.docs.filter(doc => doc.data().status === 'pending').length
      };
      console.log('Current status counts:', statusCounts);

      // Try to create inspection log entry (optional - won't block reset if it fails)
      const inspectionLog = {
        userId: user.uid,
        resetDate: currentDate,
        monthYear: currentMonth,
        totalExtinguishers: snapshot.docs.length,
        passedCount: statusCounts.pass,
        failedCount: statusCounts.fail,
        pendingCount: statusCounts.pending,
        extinguisherResults: snapshot.docs.map(doc => ({
          assetId: doc.data().assetId,
          section: doc.data().section,
          status: doc.data().status,
          checkedDate: doc.data().checkedDate,
          notes: doc.data().notes
        }))
      };
      console.log('Created inspection log:', inspectionLog);

      // Try to save inspection log (won't block reset if permissions denied)
      try {
        console.log('Attempting to save inspection log...');
        await addDoc(collection(db, 'inspectionLogs'), inspectionLog);
        console.log('Inspection log saved successfully to Firestore');
      } catch (logError) {
        console.warn('Could not save inspection log to Firestore (this is OK):', logError.message);
        console.log('Inspection log will be saved to localStorage instead');

        // Save to localStorage as backup
        const existingLogs = JSON.parse(localStorage.getItem(`inspectionLogs_${user.uid}`) || '[]');
        existingLogs.push(inspectionLog);
        localStorage.setItem(`inspectionLogs_${user.uid}`, JSON.stringify(existingLogs));
        console.log('Inspection log saved to localStorage successfully');
      }

      // Reset all extinguisher statuses
      console.log('Starting to reset', snapshot.docs.length, 'extinguishers...');
      const updatePromises = snapshot.docs.map(docSnapshot => {
        const docRef = doc(db, 'extinguishers', docSnapshot.id);
        return updateDoc(docRef, {
          status: 'pending',
          checkedDate: null,
          notes: '',
          lastMonthlyReset: currentDate
        });
      });

      await Promise.all(updatePromises);
      console.log('All extinguisher updates completed');
      alert(`Monthly cycle reset complete!\n\n• ${snapshot.docs.length} extinguishers reset to "pending"\n• Previous inspection results saved to history\n• Ready for ${currentMonth} inspections`);

    } catch (error) {
      console.error('Error resetting monthly status:', error);
      alert('Error resetting monthly status. Please try again.');
    }
  };

  // Smart sorting function for walking order
  const sortExtinguishersByLocation = (items) => {
    if (!items || !Array.isArray(items)) return [];

    return items.sort((a, b) => {
      try {
      // Extract floor numbers from vicinity/parentLocation
      const getFloorNumber = (item) => {
        const vicinity = item.vicinity || '';
        const parentLocation = item.parentLocation || '';
        const text = `${vicinity} ${parentLocation}`.toLowerCase();

        // Look for floor patterns
        if (text.includes('ground') || text.includes('1st') || text.includes('first')) return 1;
        if (text.includes('2nd') || text.includes('second')) return 2;
        if (text.includes('3rd') || text.includes('third')) return 3;
        if (text.includes('4th') || text.includes('fourth')) return 4;
        if (text.includes('5th') || text.includes('fifth')) return 5;
        if (text.includes('6th') || text.includes('sixth')) return 6;
        if (text.includes('7th') || text.includes('seventh')) return 7;
        if (text.includes('8th') || text.includes('eighth')) return 8;
        if (text.includes('basement') || text.includes('b1') || text.includes('lower')) return 0;

        // Look for numeric patterns like "Floor 5", "5F", "L5"
        const floorMatch = text.match(/(?:floor\s*|f|l)?(\d+)/);
        if (floorMatch) return parseInt(floorMatch[1]);

        // Default to middle floor if no pattern found
        return 3;
      };

      const floorA = getFloorNumber(a);
      const floorB = getFloorNumber(b);

      // Sort by floor first
      if (floorA !== floorB) {
        return floorA - floorB;
      }

      // Then by vicinity alphabetically
      const vicinityA = (a.vicinity || '').toLowerCase();
      const vicinityB = (b.vicinity || '').toLowerCase();

      // Look for room numbers
      const getRoomNumber = (vicinity) => {
        if (!vicinity) return 999;
        const roomMatch = vicinity.match(/(\d+)/);
        return roomMatch ? parseInt(roomMatch[1]) : 999;
      };

      const roomA = getRoomNumber(vicinityA);
      const roomB = getRoomNumber(vicinityB);

      if (roomA !== roomB) {
        return roomA - roomB;
      }

      // Finally by vicinity name
      return vicinityA.localeCompare(vicinityB);
      } catch (error) {
        console.error('Sorting error:', error);
        return 0; // Keep original order if sorting fails
      }
    });
  };

  const filteredItems = (() => {
    try {
      const filtered = extinguishers.filter(item => {
        if (!item) return false;

        const matchesSection = selectedSection === 'All' || item.section === selectedSection;

        // If a specific section is selected (not "All"), use section view mode
        let matchesView;
        if (selectedSection !== 'All') {
          const currentViewMode = getSectionViewMode(selectedSection);
          if (currentViewMode === 'unchecked') {
            matchesView = item.status === 'pending';
          } else { // checked
            matchesView = item.status === 'pass' || item.status === 'fail';
          }
        } else {
          // For "All" sections, use the global view filter
          matchesView = view === 'pending' ? item.status === 'pending' :
                       view === 'pass' ? item.status === 'pass' :
                       view === 'fail' ? item.status === 'fail' : true;
        }

        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' ||
          (item.assetId || '').toLowerCase().includes(searchLower) ||
          (item.vicinity || '').toLowerCase().includes(searchLower) ||
          (item.serial || '').toLowerCase().includes(searchLower);

        return matchesSection && matchesView && matchesSearch;
      });

      return sortExtinguishersByLocation(filtered);
    } catch (error) {
      console.error('Filtering error:', error);
      return []; // Return empty array if filtering fails
    }
  })();

  const stats = {
    total: extinguishers.length,
    pending: extinguishers.filter(e => e.status === 'pending').length,
    pass: extinguishers.filter(e => e.status === 'pass').length,
    fail: extinguishers.filter(e => e.status === 'fail').length
  };

  const sectionCounts = SECTIONS.map(section => {
    const items = extinguishers.filter(e => e.section === section);
    return {
      section,
      total: items.length,
      pending: items.filter(e => e.status === 'pending').length,
      pass: items.filter(e => e.status === 'pass').length,
      fail: items.filter(e => e.status === 'fail').length
    };
  });

  // Show loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 via-gray-900 to-black pb-20">
      <div className="max-w-6xl mx-auto p-4">
        {/* Banner Image */}
        <div className="mb-2 rounded-lg overflow-hidden shadow-2xl" style={{ height: '270px' }}>
          <img
            src={`${import.meta.env.BASE_URL}banner.png`}
            alt="Fire Extinguisher Tracker - built by Beck"
            className="w-full"
            style={{
              objectFit: 'cover',
              objectPosition: 'center 40%',
              height: '100%'
            }}
            onError={(e) => {
              console.error('Banner image failed to load');
              e.target.style.display = 'none';
            }}
          />
        </div>

        {/* Credit Text */}
        <div className="text-center mb-6">
          <p className="text-red-400 font-semibold text-lg">
            Built by: David Beck - Life Safety Technician
          </p>
        </div>

        {/* Header with gradient and red border */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-4 rounded-lg shadow-lg mb-6 border border-red-900">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-400">Fire Safety Management</span>
                <Link to="/" className="text-white font-semibold ml-2 hover:text-red-400 transition">
                  Fire Extinguisher Tracker
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Logged in as:</span>
              <span className="text-sm text-white">{user.email}</span>
              <button
                onClick={() => navigate('/app/calculator')}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2"
                title="Open Fire Extinguisher Calculator"
              >
                <CalculatorIcon size={18} />
                Calculator
              </button>
              <button
                onClick={() => setAdminMode(!adminMode)}
                className={`p-2 hover:bg-gray-600 rounded flex items-center gap-2 ${adminMode ? 'bg-gray-600' : ''}`}
                title={adminMode ? 'Exit Admin Mode' : 'Admin Mode'}
              >
                <Settings size={18} />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-600 rounded flex items-center gap-2"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-600 rounded"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>

        {selectedSection !== 'All' && (
          <>
            <div className="bg-white p-4 rounded-lg shadow-lg mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={20} className="text-gray-600" />
                  <h3 className="font-semibold text-lg">Time Tracking - {selectedSection}</h3>
                </div>
                <button
                  onClick={() => setShowTimeModal(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View All Times
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatTime(getTotalTime(selectedSection))}
                  </div>
                  <div className="text-sm text-gray-600">
                    {Math.round(getTotalTime(selectedSection) / 60000)} minutes
                  </div>
                </div>

                <div className="flex gap-2">
                  {activeTimer === selectedSection ? (
                    <button
                      onClick={pauseTimer}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                      <Pause size={20} />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => startTimer(selectedSection)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      <Play size={20} />
                      Start Timer
                    </button>
                  )}

                  {activeTimer && (
                    <button
                      onClick={stopTimer}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      <StopCircle size={20} />
                      Stop
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Section Notes Card */}
            <div className="bg-white p-4 rounded-lg shadow-lg mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-gray-600" />
                  <h3 className="font-semibold text-lg">Section Notes</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {Object.values(sectionNotes).filter(note => note.notes).length} sections with notes
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {/* Current section notes */}
                <div className="p-3 bg-blue-50 rounded border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-blue-900">{selectedSection} (Current)</div>
                    {sectionNotes[selectedSection]?.lastUpdated && (
                      <span className="text-xs text-blue-600">
                        Updated: {new Date(sectionNotes[selectedSection].lastUpdated).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {sectionNotes[selectedSection]?.notes ? (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                      {sectionNotes[selectedSection].notes}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      No notes for this section yet
                    </div>
                  )}
                </div>

                {/* Other sections with notes */}
                {Object.keys(sectionNotes).filter(section =>
                  section !== selectedSection && sectionNotes[section]?.notes
                ).length > 0 && (
                  <div className="border-t pt-2">
                    <div className="text-xs font-medium text-gray-600 mb-2">Other sections with notes:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(sectionNotes)
                        .filter(section => section !== selectedSection && sectionNotes[section]?.notes)
                        .map(section => (
                          <div key={section} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                            <div className="font-medium text-gray-700">{section}</div>
                            <div className="text-gray-500 truncate">{sectionNotes[section].notes}</div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}

                <button
                  onClick={openSectionNotes}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <Edit2 size={20} />
                  Manage Section Notes
                </button>
              </div>
            </div>
          </>
        )}

        {showMenu && (
          <div className="bg-white p-4 rounded-lg shadow-lg mb-6">
            <div className="space-y-2">
              <button
                onClick={resetMonthlyStatus}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition w-full"
              >
                <RotateCcw size={20} />
                Start New Monthly Cycle
              </button>

              {adminMode && (
                <>
                  <div className="border-t pt-2 mt-4">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Database Management (Admin)</p>
                  </div>
                  <button
                    onClick={() => {
                      exportDatabaseCsv();
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 transition w-full"
                  >
                    <Download size={20} />
                    Export Database (CSV)
                  </button>
                  <button
                    onClick={() => {
                      exportDatabaseBackup();
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition w-full"
                  >
                    <FileText size={20} />
                    Export Database (JSON)
                  </button>
                  <button
                    onClick={() => {
                      if (dbBackupInputRef.current) dbBackupInputRef.current.click();
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition w-full"
                  >
                    <Upload size={20} />
                    Import Database (JSON)
                  </button>
                  <button
                    onClick={() => {
                      setShowImportModal(true);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition w-full"
                  >
                    <Upload size={20} />
                    Import Data File
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(true);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition w-full"
                  >
                    <Plus size={20} />
                    Add New Fire Extinguisher
                  </button>
                </>)}

              <div className="border-t pt-2 mt-4">
                <p className="text-sm text-gray-600 mb-2 font-medium">Export Data</p>
              </div>
              <button
                onClick={() => {
                  setExportOptions({ ...exportOptions, type: 'all' });
                  setShowExportModal(true);
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition w-full"
              >
                <Download size={20} />
                Export Inspection Data
              </button>
              <button
                onClick={exportTimeData}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition w-full"
              >
                <Clock size={20} />
                Export Time Data
              </button>
              {adminMode && (
                <>
                  <div className="border-t pt-2 mt-4">
                    <p className="text-sm text-gray-600 mb-2 font-medium text-red-600">Danger Zone (Admin Only)</p>
                  </div>
                  <button
                    onClick={clearAllData}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition w-full"
                  >
                    Clear All Data
                  </button>
                </>)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-gray-700">{stats.pending}</div>
            <div className="text-gray-600">Pending</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-green-600">{stats.pass}</div>
            <div className="text-gray-600">Passed</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-red-600">{stats.fail}</div>
            <div className="text-gray-600">Failed</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-purple-600">
              {stats.total > 0 ? Math.round(((stats.pass + stats.fail) / stats.total) * 100) : 0}%
            </div>
            <div className="text-gray-600">Complete</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
          <button
            onClick={() => setShowCameraScanner(true)}
            onTouchStart={() => {}}
            className="bg-blue-500 text-white p-4 rounded-lg shadow-lg hover:bg-blue-600 active:bg-blue-700 transition flex items-center justify-center gap-2 text-lg font-semibold cursor-pointer"
            style={{ WebkitTapHighlightColor: 'rgba(0,0,0,0.1)', touchAction: 'manipulation' }}
          >
            <Camera size={24} />
            Camera Scan
          </button>
          <button
            onClick={() => setScanMode(true)}
            onTouchStart={() => {}}
            className="bg-green-500 text-white p-4 rounded-lg shadow-lg hover:bg-green-600 active:bg-green-700 transition flex items-center justify-center gap-2 text-lg font-semibold cursor-pointer"
            style={{ WebkitTapHighlightColor: 'rgba(0,0,0,0.1)', touchAction: 'manipulation' }}
          >
            <ScanLine size={24} />
            Manual Entry
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div
            className="flex items-center justify-between mb-4 cursor-pointer"
            onClick={() => setSectionFilterCollapsed(!sectionFilterCollapsed)}
          >
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-600" />
              <h3 className="font-semibold text-lg">Section Filter</h3>
              {selectedSection !== 'All' && (
                <span className="text-sm text-gray-600 bg-blue-100 px-2 py-1 rounded">({selectedSection})</span>
              )}
            </div>
            <button className="p-2 hover:bg-gray-100 rounded transition">
              {sectionFilterCollapsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          </div>

          {!sectionFilterCollapsed && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* All Sections Button */}
              <button
                onClick={() => setSelectedSection('All')}
                className={`p-3 rounded-lg border-2 transition ${
                  selectedSection === 'All'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="font-medium text-sm mb-1">🔍 All Sections</div>
                <div className="text-xs text-gray-600">
                  <div>Total: {extinguishers.length}</div>
                  <div>Pending: {extinguishers.filter(item => item.status === 'pending').length}</div>
                  <div className="text-green-600 font-semibold mt-1">
                    Search All
                  </div>
                </div>
              </button>

              {sectionCounts.map(({ section, total, pending, pass, fail }) => (
                <button
                  key={section}
                  onClick={() => setSelectedSection(section)}
                  className={`p-3 rounded-lg border-2 transition ${
                    selectedSection === section
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-medium text-sm mb-1">{section}</div>
                  <div className="text-xs text-gray-600">
                    <div>Total: {total}</div>
                    <div>Pending: {pending}</div>
                    {getTotalTime(section) > 0 && (
                      <div className="text-blue-600 font-semibold mt-1">
                        {formatTime(getTotalTime(section))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by Asset ID, Vicinity, or Serial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="relative z-0">
          <Routes>
            <Route
              index
              element={<SectionGrid sections={SECTIONS} extinguishers={extinguishers} />}
            />
            <Route
              path="section/:name"
              element={
                <SectionDetail
                  extinguishers={extinguishers}
                  onSelectItem={setSelectedItem}
                  getViewMode={getSectionViewMode}
                  toggleView={toggleSectionView}
                  countsFor={countsForSection}
                  onPass={handlePass}
                  onFail={handleFail}
                  onEdit={handleEdit}
                  onSaveNotes={handleSaveNotes}
                />
              }
            />
            <Route
              path="extinguisher/:assetId"
              element={<ExtinguisherDetailView extinguishers={extinguishers} />}
            />
            <Route
              path="calculator"
              element={<Calculator />}
            />
          </Routes>
        </div>
      </div>

      {showTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Time Tracking Summary</h3>
              <button onClick={() => setShowTimeModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {SECTIONS.map(section => {
                const time = getTotalTime(section);
                return (
                  <div key={section} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-semibold">{section}</div>
                      <div className="text-sm text-gray-600">
                        {Math.round(time / 60000)} minutes
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatTime(time)}
                      </div>
                      {time > 0 && (
                        <button
                          onClick={() => clearSectionTime(section)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4 mb-4">
              <div className="flex justify-between items-center">
                <div className="font-semibold text-lg">Total Time</div>
                <div className="text-2xl font-bold text-purple-600">
                  {formatTime(Object.values(sectionTimes).reduce((a, b) => a + b, 0))}
                </div>
              </div>
              <div className="text-sm text-gray-600 text-right">
                {Math.round(Object.values(sectionTimes).reduce((a, b) => a + b, 0) / 60000)} minutes total
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={exportTimeData}
                className="flex-1 bg-purple-500 text-white p-3 rounded-lg hover:bg-purple-600"
              >
                Export Time Data
              </button>
              <button
                onClick={clearAllTimes}
                className="px-4 bg-red-500 text-white p-3 rounded-lg hover:bg-red-600"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {showSectionNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Section Notes</h3>
              <button onClick={() => setShowSectionNotesModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Section/Building
              </label>
              <select
                value={noteSelectedSection}
                onChange={(e) => handleNoteSectionChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              >
                {SECTIONS.map(section => (
                  <option key={section} value={section}>
                    {section}
                    {sectionNotes[section]?.notes && ' ✓'}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Notes for {noteSelectedSection}
                </label>
                {sectionNotes[noteSelectedSection]?.lastUpdated && (
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date(sectionNotes[noteSelectedSection].lastUpdated).toLocaleString()}
                  </span>
                )}
              </div>
              <textarea
                value={currentSectionNote}
                onChange={(e) => setCurrentSectionNote(e.target.value)}
                rows={12}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add general notes about this section while inspecting...&#10;&#10;Examples:&#10;• Blocked hallways&#10;• Missing signage&#10;• Access issues&#10;• Maintenance concerns&#10;• Safety observations&#10;• Equipment found out of place&#10;• Doors propped open"
              />
              <div className="text-xs text-gray-500 mt-2">
                These notes are specific to {noteSelectedSection} and separate from individual fire extinguisher notes.
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={saveSectionNotes}
                className="flex-1 bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Save Notes for {noteSelectedSection}
              </button>
              <button
                onClick={() => setShowSectionNotesModal(false)}
                className="px-6 bg-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Import Fire Extinguishers</h3>
              <button onClick={() => setShowImportModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default section for rows without a Section column
                </label>
                <select
                  value={importSection}
                  onChange={(e) => setImportSection(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  {SECTIONS.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  If your file has a <span className="font-semibold">Section</span> column, that value will be used for each row.
                </p>
              </div>
              <label className="flex items-center gap-2 px-4 py-3 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 transition w-full justify-center">
                <Upload size={20} />
                <span>Select File to Import</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-600">
                Accepts: CSV, XLS, XLSX files. All items will be assigned to {importSection}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden input for JSON database import */}
      <input
        ref={dbBackupInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportDatabaseBackup}
        className="hidden"
      />

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Add New Fire Extinguisher</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newItem.assetId}
                  onChange={(e) => setNewItem({...newItem, assetId: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Enter Asset ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={newItem.serial}
                  onChange={(e) => setNewItem({...newItem, serial: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Enter Serial Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vicinity</label>
                <input
                  type="text"
                  value={newItem.vicinity}
                  onChange={(e) => setNewItem({...newItem, vicinity: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Enter location/vicinity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Location</label>
                <input
                  type="text"
                  value={newItem.parentLocation}
                  onChange={(e) => setNewItem({...newItem, parentLocation: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Enter parent location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  value={newItem.section}
                  onChange={(e) => setNewItem({...newItem, section: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  {SECTIONS.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
                <input type="file" accept="image/*" capture="environment" onChange={(e)=> setNewItemPhoto(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GPS Location (optional)</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="px-3 py-2 border rounded bg-slate-50"
                    onClick={() => {
                      if (!('geolocation' in navigator)) { alert('Geolocation not supported on this device/browser.'); return; }
                      setNewItemGpsLoading(true);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const { latitude: lat, longitude: lng, accuracy, altitude, altitudeAccuracy } = pos.coords;
                          setNewItemGps({ lat, lng, accuracy, altitude, altitudeAccuracy, capturedAt: new Date().toISOString() });
                          setNewItemGpsLoading(false);
                        },
                        (err) => {
                          console.warn('GPS error:', err);
                          alert('Unable to get GPS location. Please ensure location services are enabled.');
                          setNewItemGpsLoading(false);
                        },
                        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                      );
                    }}
                  >{newItemGpsLoading ? 'Capturing…' : 'Capture GPS'}</button>
                  {newItemGps && (
                    <div className="text-sm text-gray-700 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-slate-100">
                          {newItemGps.lat.toFixed(6)}, {newItemGps.lng.toFixed(6)} (±{Math.round(newItemGps.accuracy)}m)
                        </span>
                        {newItemGps.altitude !== null && newItemGps.altitude !== undefined && (
                          <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">
                            Alt: {Math.round(newItemGps.altitude)}m {newItemGps.altitudeAccuracy ? `(±${Math.round(newItemGps.altitudeAccuracy)}m)` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <a className="text-blue-600 underline" href={`https://maps.google.com/?q=${newItemGps.lat},${newItemGps.lng}`} target="_blank" rel="noreferrer">Open in Maps</a>
                        <button className="text-red-600" onClick={()=>setNewItemGps(null)}>Clear</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleAddNew}
                  className="flex-1 bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add Fire Extinguisher
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {scanMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Scan Fire Extinguisher</h3>
              <button onClick={() => { setScanMode(false); setScanInput(''); }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleScan}>
              <input
                ref={scanInputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan or enter Asset ID / Serial Number"
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-lg"
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      )}

      <CameraScanner
        isOpen={showCameraScanner}
        onScan={handleCameraScan}
        onClose={() => setShowCameraScanner(false)}
      />

      {selectedItem && !editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 max-w-2xl w-full my-8 border-2 border-red-600 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-red-400">Inspect Fire Extinguisher</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* View Full Details Button */}
            <button
              onClick={() => {
                navigate(`/app/extinguisher/${selectedItem.assetId}`);
                setSelectedItem(null);
              }}
              className="w-full mb-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-semibold"
            >
              <FileText size={20} />
              View Full Details & Photos
            </button>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Asset ID</div>
                  <div className="font-semibold text-xl text-white">{selectedItem.assetId}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Serial Number</div>
                  <div className="font-mono text-white">{selectedItem.serial}</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Location</div>
                <div className="font-medium text-white">{selectedItem.vicinity}</div>
                <div className="text-sm text-gray-300">{selectedItem.parentLocation}</div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Section</div>
                <div className="font-medium text-white">{selectedItem.section}</div>
              </div>

              {/* Location chip with Open in Maps */}
              {(() => {
                const gps = selectedItem.lastInspectionGps || selectedItem.location;
                if (!gps) return null;
                return (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">GPS Location</div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white bg-black/40 px-2 py-1 rounded">
                          {Number(gps.lat).toFixed(6)}, {Number(gps.lng).toFixed(6)}
                          {gps.accuracy ? (<span className="text-gray-300"> (±{Math.round(gps.accuracy)}m)</span>) : null}
                        </span>
                        {gps.altitude !== null && gps.altitude !== undefined && (
                          <span className="text-sm text-white bg-blue-600/60 px-2 py-1 rounded">
                            Alt: {Math.round(gps.altitude)}m {gps.altitudeAccuracy ? `(±${Math.round(gps.altitudeAccuracy)}m)` : ''}
                          </span>
                        )}
                      </div>
                      <a
                        className="text-blue-300 underline text-sm"
                        href={`https://maps.google.com/?q=${gps.lat},${gps.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >Open in Maps</a>
                    </div>
                  </div>
                );
              })()}

              {/* Photos section */}
              <div>
                <div className="text-sm text-gray-400 mb-2">Photos</div>
                <div className="flex flex-wrap gap-3 items-center">
                  {(selectedItem.photos && selectedItem.photos.length > 0) ? (
                    selectedItem.photos.map((p, i) => (
                      <div key={i} className="relative group">
                        <a href={p.url} target="_blank" rel="noreferrer">
                          <img src={p.url} alt={`Asset photo ${i+1}`} className="w-20 h-20 object-cover rounded border" />
                        </a>
                        <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1">
                          {i !== 0 && (
                            <button className="text-xs bg-yellow-400 text-black px-1 rounded" onClick={(e)=>{ e.preventDefault(); setMainAssetPhoto(selectedItem, i); }}>Main</button>
                          )}
                          <button className="text-xs bg-red-600 text-white px-1 rounded" onClick={(e)=>{ e.preventDefault(); removeAssetPhoto(selectedItem, i); }}>X</button>
                        </div>
                        {i === 0 && (
                          <div className="absolute bottom-0 left-0 bg-black/60 text-white text-[10px] px-1 rounded-tr">Main</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-300">No photos</div>
                  )}
                  <label className={`px-3 py-2 rounded bg-gray-700 text-white cursor-pointer ${selectedItem.photos && selectedItem.photos.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    Add Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={!!(selectedItem.photos && selectedItem.photos.length >= 5)}
                      onChange={async (e)=>{
                        const f = e.target.files?.[0];
                        e.target.value = null;
                        if (f) { await addAssetPhoto(selectedItem, f); }
                      }}
                    />
                  </label>
                  {selectedItem.photos && selectedItem.photos.length >= 5 && (
                    <span className="text-xs text-gray-400">Limit reached (5 photos)</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-2">Current Status</div>
                <div className="flex items-center gap-2">
                  {selectedItem.status === 'pass' && (
                    <span className="px-3 py-1 bg-green-600 text-white rounded-full font-semibold">PASSED</span>
                  )}
                  {selectedItem.status === 'fail' && (
                    <span className="px-3 py-1 bg-red-600 text-white rounded-full font-semibold">FAILED</span>
                  )}
                  {selectedItem.status === 'pending' && (
                    <span className="px-3 py-1 bg-gray-600 text-white rounded-full font-semibold">PENDING</span>
                  )}
                  {selectedItem.status !== 'pending' && (
                    <button
                      onClick={() => resetStatus(selectedItem)}
                      className="text-sm text-red-400 hover:text-red-300 underline"
                    >
                      Reset Status
                    </button>
                  )}
                </div>
              </div>

              {selectedItem.inspectionHistory && selectedItem.inspectionHistory.length > 0 && (
                <div>
                  <div className="text-sm text-gray-400 mb-2">Inspection History</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedItem.inspectionHistory.map((hist, idx) => (
                      <div key={idx} className="text-sm bg-gray-700 p-2 rounded border border-gray-600">
                        <div className="flex justify-between">
                          <span className={hist.status === 'pass' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                            {hist.status.toUpperCase()}
                          </span>
                          <span className="text-gray-300">
                            {new Date(hist.date).toLocaleString()}
                          </span>
                        </div>
                        {hist.notes && <div className="text-gray-300 mt-1">{hist.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes always visible */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  rows="3"
                  value={selectedItemNotes}
                  onChange={(e) => setSelectedItemNotes(e.target.value)}
                  className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Add any notes about this extinguisher..."
                />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleSaveNotes(selectedItem, selectedItemNotes)}
                    className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 font-semibold transition shadow"
                  >
                    Save Notes
                  </button>
                </div>
              </div>

              {selectedItem.status === 'pending' && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      handleInspection(selectedItem, 'pass', selectedItemNotes);
                    }}
                    className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-bold text-lg shadow-lg transition"
                  >
                    <CheckCircle size={24} />
                    PASS
                  </button>
                  <button
                    onClick={() => {
                      handleInspection(selectedItem, 'fail', selectedItemNotes);
                    }}
                    className="bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-bold text-lg shadow-lg transition"
                  >
                    <XCircle size={24} />
                    FAIL
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={() => handleEdit(selectedItem)}
                className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-semibold transition shadow-lg"
              >
                <Edit2 size={20} />
                Edit Extinguisher Details
              </button>
            </div>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Edit Fire Extinguisher</h3>
              <button onClick={() => setEditItem(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset ID</label>
                <input
                  type="text"
                  value={editItem.assetId}
                  onChange={(e) => setEditItem({...editItem, assetId: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={editItem.serial}
                  onChange={(e) => setEditItem({...editItem, serial: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vicinity</label>
                <input
                  type="text"
                  value={editItem.vicinity}
                  onChange={(e) => setEditItem({...editItem, vicinity: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Location</label>
                <input
                  type="text"
                  value={editItem.parentLocation}
                  onChange={(e) => setEditItem({...editItem, parentLocation: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  value={editItem.section}
                  onChange={(e) => setEditItem({...editItem, section: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  {SECTIONS.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>

              {/* GPS for edit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GPS Location</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="px-3 py-2 border rounded bg-slate-50"
                    onClick={() => {
                      if (!('geolocation' in navigator)) { alert('Geolocation not supported on this device/browser.'); return; }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const { latitude: lat, longitude: lng, accuracy, altitude, altitudeAccuracy } = pos.coords;
                          setEditItem({ ...editItem, location: { lat, lng, accuracy, altitude, altitudeAccuracy, capturedAt: new Date().toISOString() } });
                        },
                        (err) => {
                          console.warn('GPS error:', err);
                          alert('Unable to get GPS location. Please ensure location services are enabled.');
                        },
                        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                      );
                    }}
                  >Capture GPS</button>
                  {editItem.location && (
                    <div className="text-sm text-gray-700 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-slate-100">
                          {Number(editItem.location.lat).toFixed(6)}, {Number(editItem.location.lng).toFixed(6)} (±{Math.round(editItem.location.accuracy || 0)}m)
                        </span>
                        {editItem.location.altitude !== null && editItem.location.altitude !== undefined && (
                          <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">
                            Alt: {Math.round(editItem.location.altitude)}m {editItem.location.altitudeAccuracy ? `(±${Math.round(editItem.location.altitudeAccuracy)}m)` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <a className="text-blue-600 underline" href={`https://maps.google.com/?q=${editItem.location.lat},${editItem.location.lng}`} target="_blank" rel="noreferrer">Open in Maps</a>
                        <button className="text-red-600" onClick={()=> setEditItem({ ...editItem, location: null })}>Clear</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Photos manage in edit */}
              <div>
                <div className="block text-sm font-medium text-gray-700 mb-1">Photos</div>
                <div className="flex flex-wrap gap-3 items-center">
                  {(editItem.photos && editItem.photos.length > 0) ? (
                    editItem.photos.map((p, i) => (
                      <div key={i} className="relative group">
                        <a href={p.url} target="_blank" rel="noreferrer">
                          <img src={p.url} alt={`Asset photo ${i+1}`} className="w-20 h-20 object-cover rounded border" />
                        </a>
                        <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1">
                          {i !== 0 && (
                            <button className="text-xs bg-yellow-400 text-black px-1 rounded" onClick={(e)=>{ e.preventDefault(); setMainAssetPhoto(editItem, i); }}>Main</button>
                          )}
                          <button className="text-xs bg-red-600 text-white px-1 rounded" onClick={(e)=>{ e.preventDefault(); removeAssetPhoto(editItem, i); }}>X</button>
                        </div>
                        {i === 0 && (
                          <div className="absolute bottom-0 left-0 bg-black/60 text-white text-[10px] px-1 rounded-tr">Main</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No photos</div>
                  )}
                  <label className={`px-3 py-2 rounded bg-gray-100 text-gray-800 cursor-pointer ${editItem.photos && editItem.photos.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    Add Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={!!(editItem.photos && editItem.photos.length >= 5)}
                      onChange={async (e)=>{
                        const f = e.target.files?.[0];
                        e.target.value = null;
                        if (f) { await addAssetPhoto(editItem, f); setEditItem(prev => ({ ...prev, photos: (prev.photos || []).concat([]) })); }
                      }}
                    />
                  </label>
                  {editItem.photos && editItem.photos.length >= 5 && (
                    <span className="text-xs text-gray-500">Limit reached (5 photos)</span>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={saveEdit}
                  className="flex-1 bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Save Changes
                </button>
                <button
                  onClick={() => deleteItem(editItem)}
                  className="px-4 bg-red-500 text-white p-3 rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
                <button
                  onClick={() => setEditItem(null)}
                  className="px-4 bg-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Options Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Export Options</h3>
              <button onClick={() => setShowExportModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Data Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Which items to export?
                </label>
                <select
                  value={exportOptions.type}
                  onChange={(e) => setExportOptions({ ...exportOptions, type: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All Extinguishers</option>
                  <option value="passed">Passed Only</option>
                  <option value="failed">Failed Only</option>
                </select>
              </div>

              {/* Include Options */}
              <div className="border-t pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Include in export:
                </label>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includePhotos}
                      onChange={(e) => setExportOptions({ ...exportOptions, includePhotos: e.target.checked })}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-sm">Photo URLs (clickable links)</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeGPS}
                      onChange={(e) => setExportOptions({ ...exportOptions, includeGPS: e.target.checked })}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-sm">GPS Location & Altitude</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeChecklist}
                      onChange={(e) => setExportOptions({ ...exportOptions, includeChecklist: e.target.checked })}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-sm">Detailed Checklist Data</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeInspectionHistory}
                      onChange={(e) => setExportOptions({ ...exportOptions, includeInspectionHistory: e.target.checked })}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-sm">Full Inspection History</span>
                  </label>
                </div>
              </div>

              {/* Export Button */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    exportData(exportOptions);
                    setShowExportModal(false);
                  }}
                  className="flex-1 bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  Export to Excel
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-6 bg-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                Export will include: Basic info + your selected options above
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
