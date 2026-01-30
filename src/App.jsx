import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { Search, Upload, CheckCircle, XCircle, Circle, Download, Filter, Edit2, Save, X, Menu, ScanLine, Plus, Clock, Play, Pause, StopCircle, LogOut, Camera, Calendar, Settings, RotateCcw, FileText, Calculator as CalculatorIcon, Shield, History, ClipboardList } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, getDocs, setDoc, getDocs as getDocsOnce, writeBatch } from 'firebase/firestore';
import { auth, db, storage, workspacesRef } from './firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { deleteObject } from 'firebase/storage';
import Login from './Login';
import CameraScanner from './components/BarcodeScanner.jsx';
import SectionGrid from './components/SectionGrid';
import SectionDetail from './components/SectionDetail';
import ExtinguisherDetailView from './components/ExtinguisherDetailView';
import Calculator from './components/Calculator.jsx';
import PrintableExtinguisherList from './components/PrintableExtinguisherList.jsx';
import CustomAssetChecker from './components/CustomAssetChecker.jsx';

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
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesSaveTimeoutRef = useRef(null);
  const [editItem, setEditItem] = useState(null);
  const [replaceItem, setReplaceItem] = useState(null);
  const [replaceForm, setReplaceForm] = useState({
    assetId: '',
    serial: '',
    reason: '',
    manufactureDate: '',
    notes: ''
  });
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
    section: 'Main Hospital',
    category: 'standard',
    expirationDate: ''
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
  const [saveNoteForNextMonth, setSaveNoteForNextMonth] = useState(false);

  // Export options state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    type: 'all', // 'all', 'passed', 'failed'
    includePhotos: true,
    includeGPS: true,
    includeChecklist: true,
    includeInspectionHistory: false
  });

  // Workspace state for multi-month support
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [workspaceLongPressTimer, setWorkspaceLongPressTimer] = useState(null);
  const [workspaceBadgePressing, setWorkspaceBadgePressing] = useState(false);

  // Auto-backup state
  const [lastAutoBackup, setLastAutoBackup] = useState(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [availableBackups, setAvailableBackups] = useState([]);

  // Device sync state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncImporting, setSyncImporting] = useState(false);

  // Quick lists modals
  const [showStatusList, setShowStatusList] = useState(null); // { status: 'pass'|'fail', scope: 'section'|'all' }
  const [showCategoryList, setShowCategoryList] = useState(null); // { category: 'spare'|'replaced' }
  const statusPressTimerRef = useRef(null);

  const scanInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const dbBackupInputRef = useRef(null);
  const syncFileInputRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Duplicate cleanup state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]); // [{ assetId, keep, remove }]
  const [duplicateScanRunning, setDuplicateScanRunning] = useState(false);
  const [duplicateFixRunning, setDuplicateFixRunning] = useState(false);

  const normalizeStatus = (s) => String(s || '').toLowerCase();
  const pickPreferredDoc = (a, b) => {
    // Returns the preferred doc between a and b using the same rules as list dedupe
    const as = normalizeStatus(a.status);
    const bs = normalizeStatus(b.status);
    const acd = a.checkedDate ? new Date(a.checkedDate).getTime() : 0;
    const bcd = b.checkedDate ? new Date(b.checkedDate).getTime() : 0;
    const acr = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bcr = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (as === 'pending' && bs !== 'pending') return b;
    if (as !== 'pending' && bs === 'pending') return a;
    if (as !== 'pending' && bs !== 'pending') return (bcd >= acd) ? b : a;
    return (bcr >= acr) ? b : a;
  };

  const computeDuplicateGroups = () => {
    const groupsMap = new Map();
    for (const e of extinguishers) {
      const key = String(e.assetId || '').trim();
      if (!key) continue;
      const arr = groupsMap.get(key) || [];
      arr.push(e);
      groupsMap.set(key, arr);
    }
    const groups = [];
    for (const [assetId, arr] of groupsMap.entries()) {
      if (arr.length <= 1) continue;
      // choose keep doc
      let keep = arr[0];
      for (let i = 1; i < arr.length; i++) keep = pickPreferredDoc(keep, arr[i]);
      const remove = arr.filter(x => x.id !== keep.id);
      groups.push({ assetId, keep, remove });
    }
    return groups.sort((a, b) => String(a.assetId).localeCompare(String(b.assetId)));
  };

  const openDuplicateCleanup = () => {
    setDuplicateScanRunning(true);
    try {
      const groups = computeDuplicateGroups();
      setDuplicateGroups(groups);
      setShowDuplicateModal(true);
      if (groups.length === 0) {
        alert('No duplicates found in the current month.');
        setShowDuplicateModal(false);
      }
    } finally {
      setDuplicateScanRunning(false);
    }
  };

  const mergeHistories = (docs) => {
    const all = [];
    for (const d of docs) {
      const hist = Array.isArray(d.inspectionHistory) ? d.inspectionHistory : [];
      for (const h of hist) {
        if (h && h.date) all.push(h);
      }
    }
    // sort by date asc then dedupe by date+status+notes
    all.sort((x, y) => new Date(x.date) - new Date(y.date));
    const seen = new Set();
    const uniq = [];
    for (const h of all) {
      const key = `${h.date}|${h.status}|${h.notes || ''}|${h.photoUrl || ''}`;
      if (!seen.has(key)) { uniq.push(h); seen.add(key); }
    }
    return uniq;
  };

  const chooseLatestNonNull = (docs, field, dateField = 'checkedDate') => {
    let best = null;
    let bestDate = -1;
    for (const d of docs) {
      const val = d[field];
      if (val) {
        const t = d[dateField] ? new Date(d[dateField]).getTime() : 0;
        if (t >= bestDate) { best = val; bestDate = t; }
      }
    }
    return best;
  };

  const runDuplicateCleanup = async () => {
    if (!user || !currentWorkspaceId) { alert('Please sign in and select a workspace.'); return; }
    if (!duplicateGroups || duplicateGroups.length === 0) { setShowDuplicateModal(false); return; }
    const confirm = window.confirm(`This will merge and remove ${duplicateGroups.reduce((n,g)=>n+g.remove.length,0)} duplicate records across ${duplicateGroups.length} Asset IDs. Continue?`);
    if (!confirm) return;
    setDuplicateFixRunning(true);
    try {
      for (const group of duplicateGroups) {
        const { keep, remove } = group;
        const docs = [keep, ...remove];
        // Merge collections
        const mergedHistory = mergeHistories(docs);
        const mergedPhotos = [];
        for (const d of docs) {
          if (Array.isArray(d.photos)) {
            for (const p of d.photos) { if (p && p.url) mergedPhotos.push(p); }
          }
        }
        // Place keep's photos first
        const keepPhotos = Array.isArray(keep.photos) ? keep.photos : [];
        const otherPhotos = mergedPhotos.filter(p => !keepPhotos.find(kp => kp.url === p.url));
        const finalPhotos = [...keepPhotos, ...otherPhotos];

        const finalLastPhoto = chooseLatestNonNull(docs, 'lastInspectionPhotoUrl', 'checkedDate') || keep.lastInspectionPhotoUrl || null;
        const finalLastGps = chooseLatestNonNull(docs, 'lastInspectionGps', 'checkedDate') || keep.lastInspectionGps || null;

        const keepRef = doc(db, 'extinguishers', keep.id);
        await setDoc(keepRef, {
          photos: finalPhotos,
          inspectionHistory: mergedHistory,
          lastInspectionPhotoUrl: finalLastPhoto || null,
          lastInspectionGps: finalLastGps || null
        }, { merge: true });

        // Delete others
        for (const r of remove) {
          try { await deleteDoc(doc(db, 'extinguishers', r.id)); } catch (e) { console.warn('Delete failed for duplicate', r.id, e); }
        }
      }
      alert('Duplicate cleanup complete. Lists will refresh momentarily.');
      setShowDuplicateModal(false);
    } catch (e) {
      console.error('Duplicate cleanup failed:', e);
      alert(`Duplicate cleanup failed: ${e.message}`);
    } finally {
      setDuplicateFixRunning(false);
    }
  };

  // Authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load workspaces and handle migration
  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspaceId(null);
      return;
    }

    console.log('=== FIREBASE DEBUG ===');
    console.log('User UID:', user.uid);
    console.log('User Email:', user.email);

    // Load workspaces from Firestore
    const workspacesQuery = query(
      collection(db, 'workspaces'),
      where('userId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribeWorkspaces = onSnapshot(workspacesQuery, async (snapshot) => {
      console.log('Workspaces snapshot received:', snapshot.docs.length, 'workspaces');
      const workspaceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Workspace data:', JSON.stringify(workspaceData, null, 2));
      setWorkspaces(workspaceData);

      // If no workspaces exist, we need to migrate existing data
      if (workspaceData.length === 0) {
        // Check if there are extinguishers without workspaceId (legacy data)
        const legacyQuery = query(
          collection(db, 'extinguishers'),
          where('userId', '==', user.uid)
        );
        const legacySnap = await getDocs(legacyQuery);

        if (legacySnap.docs.length > 0) {
          // Create initial workspace for current month
          const now = new Date();
          const monthLabel = now.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(' ', " '");
          const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

          const newWorkspace = {
            userId: user.uid,
            label: monthLabel,
            monthYear: monthYear,
            status: 'active',
            createdAt: now.toISOString(),
            archivedAt: null
          };

          const wsDoc = await addDoc(collection(db, 'workspaces'), newWorkspace);

          // Migrate existing extinguishers to this workspace
          const batch = writeBatch(db);
          legacySnap.docs.forEach(docSnapshot => {
            if (!docSnapshot.data().workspaceId) {
              batch.update(doc(db, 'extinguishers', docSnapshot.id), {
                workspaceId: wsDoc.id
              });
            }
          });
          await batch.commit();

          setCurrentWorkspaceId(wsDoc.id);
          localStorage.setItem(`currentWorkspace_${user.uid}`, wsDoc.id);
        }
      } else {
        // Restore saved workspace or use first active one
        const savedWorkspaceId = localStorage.getItem(`currentWorkspace_${user.uid}`);
        const validWorkspace = workspaceData.find(ws => ws.id === savedWorkspaceId);

        if (validWorkspace) {
          setCurrentWorkspaceId(savedWorkspaceId);
        } else {
          // Use most recent workspace
          const sorted = workspaceData.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
          );
          setCurrentWorkspaceId(sorted[0].id);
          localStorage.setItem(`currentWorkspace_${user.uid}`, sorted[0].id);
        }
      }
    }, (error) => {
      console.error('Firebase workspaces listener error:', error.code, error.message);
      alert(`Firebase connection error: ${error.code}\n${error.message}\n\nPlease check your internet connection or try logging out and back in.`);
    });

    return () => unsubscribeWorkspaces();
  }, [user]);

  // Load extinguishers - show ALL extinguishers regardless of workspaceId
  useEffect(() => {
    if (!user) {
      setExtinguishers([]);
      return;
    }

    // Load ALL extinguishers for user - no workspace filtering
    const extinguishersQuery = query(
      collection(db, 'extinguishers'),
      where('userId', '==', user.uid)
    );

    const normalizeStatus = (s) => String(s || '').toLowerCase();
    const dedupeExtinguishers = (items) => {
      const byAsset = new Map();
      for (const it of items) {
        const key = String(it.assetId || it.id || '').trim();
        if (!key) continue;
        const prev = byAsset.get(key);
        if (!prev) {
          byAsset.set(key, it);
          continue;
        }
        const prevStatus = normalizeStatus(prev.status);
        const currStatus = normalizeStatus(it.status);
        const prevChecked = prev.checkedDate ? new Date(prev.checkedDate).getTime() : 0;
        const currChecked = it.checkedDate ? new Date(it.checkedDate).getTime() : 0;
        const prevCreated = prev.createdAt ? new Date(prev.createdAt).getTime() : 0;
        const currCreated = it.createdAt ? new Date(it.createdAt).getTime() : 0;

        // Prefer non-pending over pending
        const prevIsPending = prevStatus === 'pending';
        const currIsPending = currStatus === 'pending';
        let chooseCurr = false;
        if (prevIsPending && !currIsPending) {
          chooseCurr = true;
        } else if (!prevIsPending && currIsPending) {
          chooseCurr = false;
        } else if (!prevIsPending && !currIsPending) {
          // Both checked: choose newer checkedDate
          chooseCurr = currChecked >= prevChecked;
        } else {
          // Both pending: choose newer createdAt
          chooseCurr = currCreated >= prevCreated;
        }

        if (chooseCurr) byAsset.set(key, it);
      }
      return Array.from(byAsset.values());
    };

    const unsubscribeExtinguishers = onSnapshot(extinguishersQuery, (snapshot) => {
      const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const extinguisherData = dedupeExtinguishers(raw);
      setExtinguishers(extinguisherData);
    }, (error) => {
      console.error('Firebase extinguishers listener error:', error.code, error.message);
      alert(`Firebase error loading extinguishers: ${error.code}\n${error.message}`);
    });

    // Load section times from localStorage scoped to workspace
    const savedTimes = localStorage.getItem(`sectionTimes_${user.uid}_${currentWorkspaceId}`);
    if (savedTimes) {
      setSectionTimes(JSON.parse(savedTimes));
    } else {
      setSectionTimes({});
    }

    return () => {
      unsubscribeExtinguishers();
    };
  }, [user, currentWorkspaceId]);

  // Load section notes (global, not workspace-scoped)
  useEffect(() => {
    if (!user) {
      setSectionNotes({});
      return;
    }

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
          lastUpdated: data.lastUpdated,
          saveForNextMonth: data.saveForNextMonth || false
        };
      });
      setSectionNotes(notesData);
    }, (error) => {
      console.error('Firebase section notes listener error:', error.code, error.message);
    });

    return () => unsubscribeSectionNotes();
  }, [user]);

  useEffect(() => {
    if (user && currentWorkspaceId && Object.keys(sectionTimes).length > 0) {
      localStorage.setItem(`sectionTimes_${user.uid}_${currentWorkspaceId}`, JSON.stringify(sectionTimes));
    }
  }, [sectionTimes, user, currentWorkspaceId]);

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
      if (currentWorkspaceId) {
        localStorage.removeItem(`sectionTimes_${user.uid}_${currentWorkspaceId}`);
      }
    }
  };

  // Workspace helper functions
  const getCurrentWorkspace = () => {
    return workspaces.find(ws => ws.id === currentWorkspaceId);
  };

  const getWorkspaceStats = (workspaceExtinguishers) => {
    const total = workspaceExtinguishers.length;
    const passed = workspaceExtinguishers.filter(e => e.status === 'pass').length;
    const failed = workspaceExtinguishers.filter(e => e.status === 'fail').length;
    const pending = workspaceExtinguishers.filter(e => e.status === 'pending').length;
    return { total, passed, failed, pending };
  };

  // Helper: month name + year derived from the selected workspace (fallback to current month)
  const getWorkspaceMonthInfo = () => {
    const ws = getCurrentWorkspace();
    try {
      if (ws?.monthYear) {
        const [yy, mm] = String(ws.monthYear).split('-').map(Number);
        if (yy && mm) {
          const d = new Date(yy, mm - 1, 1);
          return {
            monthName: d.toLocaleDateString('en-US', { month: 'long' }),
            year: yy
          };
        }
      }
    } catch (e) {
      console.warn('Failed to derive month from workspace:', ws?.monthYear, e);
    }
    const now = new Date();
    return {
      monthName: now.toLocaleDateString('en-US', { month: 'long' }),
      year: now.getFullYear()
    };
  };

  const switchWorkspace = (workspaceId) => {
    if (workspaceId !== currentWorkspaceId) {
      // Stop any active timer before switching
      if (activeTimer) {
        pauseTimer();
      }
      setCurrentWorkspaceId(workspaceId);
      localStorage.setItem(`currentWorkspace_${user.uid}`, workspaceId);
    }
    setShowWorkspaceSwitcher(false);
  };

  const createWorkspace = async (label, copyFrom = null) => {
    try {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const newWorkspace = {
        userId: user.uid,
        label: label,
        monthYear: monthYear,
        status: 'active',
        createdAt: now.toISOString(),
        archivedAt: null
      };

      const wsDoc = await addDoc(collection(db, 'workspaces'), newWorkspace);

      // If copying from another workspace, copy all extinguishers and reset them to pending
      // This ensures a fresh start for the new month with all extinguishers at 0% complete
      if (copyFrom) {
        const sourceQuery = query(
          collection(db, 'extinguishers'),
          where('userId', '==', user.uid),
          where('workspaceId', '==', copyFrom)
        );
        const sourceSnap = await getDocs(sourceQuery);

        const batch = writeBatch(db);
        sourceSnap.docs.forEach(docSnapshot => {
          const data = docSnapshot.data();
          const newDocRef = doc(collection(db, 'extinguishers'));
          batch.set(newDocRef, {
            assetId: data.assetId,
            serial: data.serial || '',
            vicinity: data.vicinity || '',
            parentLocation: data.parentLocation || '',
            section: data.section,
            category: data.category || 'standard',
            status: 'pending', // Always reset to pending for new month
            checkedDate: null, // Clear checked date
            notes: '', // Clear notes
            inspectionHistory: data.inspectionHistory || [], // Keep history
            userId: user.uid,
            workspaceId: wsDoc.id,
            createdAt: now.toISOString(),
            photoUrl: data.photoUrl || null,
            location: data.location || null,
            photos: data.photos || [],
            lastInspectionPhotoUrl: null,
            lastInspectionGps: null
          });
        });
        await batch.commit();
      }

      // Clear section notes for new workspace (unless marked to save)
      try {
        const notesQuery = query(
          collection(db, 'sectionNotes'),
          where('userId', '==', user.uid)
        );
        const notesSnap = await getDocs(notesQuery);
        const notesBatch = writeBatch(db);
        notesSnap.docs.forEach(noteDoc => {
          const noteData = noteDoc.data();
          // Only clear notes that are NOT marked to save for next month
          if (!noteData.saveForNextMonth) {
            notesBatch.update(noteDoc.ref, {
              notes: '',
              lastUpdated: now.toISOString()
            });
          } else {
            // Clear the flag after using it
            notesBatch.update(noteDoc.ref, {
              saveForNextMonth: false,
              lastUpdated: now.toISOString()
            });
          }
        });
        await notesBatch.commit();
      } catch (notesError) {
        console.warn('Could not clear section notes for new workspace:', notesError);
        // Non-critical, continue
      }

      setShowCreateWorkspace(false);
      switchWorkspace(wsDoc.id);
      return wsDoc.id;
    } catch (error) {
      console.error('Error creating workspace:', error);
      alert('Error creating workspace. Please try again.');
      return null;
    }
  };

  const archiveWorkspace = async (workspaceId) => {
    try {
      const workspace = workspaces.find(ws => ws.id === workspaceId);
      if (!workspace) return;

      // Save inspection log before archiving
      const extQuery = query(
        collection(db, 'extinguishers'),
        where('userId', '==', user.uid),
        where('workspaceId', '==', workspaceId)
      );
      const extSnap = await getDocs(extQuery);
      const stats = getWorkspaceStats(extSnap.docs.map(d => d.data()));

      const inspectionLog = {
        userId: user.uid,
        workspaceId: workspaceId,
        archivedDate: new Date().toISOString(),
        monthYear: workspace.label,
        totalExtinguishers: stats.total,
        passedCount: stats.passed,
        failedCount: stats.failed,
        pendingCount: stats.pending,
        extinguisherResults: extSnap.docs.map(doc => ({
          assetId: doc.data().assetId,
          section: doc.data().section,
          status: doc.data().status,
          checkedDate: doc.data().checkedDate,
          notes: doc.data().notes
        }))
      };

      try {
        await addDoc(collection(db, 'inspectionLogs'), inspectionLog);
      } catch (logError) {
        console.warn('Could not save inspection log to Firestore:', logError.message);
        const existingLogs = JSON.parse(localStorage.getItem(`inspectionLogs_${user.uid}`) || '[]');
        existingLogs.push(inspectionLog);
        localStorage.setItem(`inspectionLogs_${user.uid}`, JSON.stringify(existingLogs));
      }

      // Archive the workspace
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        status: 'archived',
        archivedAt: new Date().toISOString()
      });

      // If this was the current workspace, switch to another
      if (workspaceId === currentWorkspaceId) {
        const remaining = workspaces.filter(ws => ws.id !== workspaceId);
        if (remaining.length > 0) {
          switchWorkspace(remaining[0].id);
        } else {
          setCurrentWorkspaceId(null);
        }
      }
    } catch (error) {
      console.error('Error archiving workspace:', error);
      alert('Error archiving workspace. Please try again.');
    }
  };

  // Check for auto-archive when all items are inspected
  useEffect(() => {
    if (!currentWorkspaceId || extinguishers.length === 0) return;

    const stats = getWorkspaceStats(extinguishers);
    if (stats.pending === 0 && stats.total > 0) {
      // All items inspected - offer to archive
      const workspace = getCurrentWorkspace();
      if (workspace && !workspace.autoArchiveOffered) {
        // We could auto-archive, but let's just notify the user
        // They can manually archive when ready
      }
    }
  }, [extinguishers, currentWorkspaceId]);

  // Workspace badge long-press handlers
  const handleWorkspaceBadgeMouseDown = () => {
    setWorkspaceBadgePressing(true);
    const timer = setTimeout(() => {
      setShowWorkspaceSwitcher(true);
      setWorkspaceBadgePressing(false);
    }, 500);
    setWorkspaceLongPressTimer(timer);
  };

  const handleWorkspaceBadgeMouseUp = () => {
    if (workspaceLongPressTimer) {
      clearTimeout(workspaceLongPressTimer);
      setWorkspaceLongPressTimer(null);
    }
    setWorkspaceBadgePressing(false);
  };

  const handleWorkspaceBadgeTouchStart = (e) => {
    e.preventDefault();
    handleWorkspaceBadgeMouseDown();
  };

  const handleWorkspaceBadgeTouchEnd = (e) => {
    e.preventDefault();
    handleWorkspaceBadgeMouseUp();
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
      const { monthName, year } = getWorkspaceMonthInfo();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${monthName}_${year}_Database_Backup_${timestamp}.json`;
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
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Extinguishers');
      worksheet.columns = header.map(key => ({ header: key, key }));
      rows.forEach(row => worksheet.addRow(row));

      const now = new Date();
      const { monthName, year } = getWorkspaceMonthInfo();
      const date = now.toISOString().split('T')[0];

      const buffer = await workbook.csv.writeBuffer();
      const blob = new Blob([buffer], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Extinguisher_Database_Export_${monthName}_${year}_${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
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
        data.workspaceId = currentWorkspaceId; // Add to current workspace
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

  // ============ AUTO-BACKUP SYSTEM ============
  // Save automatic backup to localStorage (keeps last 7 days)
  const performAutoBackup = async () => {
    if (!user || extinguishers.length === 0) return null;

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const backupKey = `autoBackup_${user.uid}_${today}`;

      // Check if we already backed up today
      const existingBackup = localStorage.getItem(backupKey);
      if (existingBackup) {
        // Update the existing backup with latest data
        const parsed = JSON.parse(existingBackup);
        if (parsed.extinguishers?.length >= extinguishers.length) {
          // Don't overwrite if existing backup has same or more data (safety check)
          setLastAutoBackup(new Date(parsed.backupTime));
          return parsed;
        }
      }

      const backup = {
        version: 1,
        backupTime: new Date().toISOString(),
        date: today,
        userId: user.uid,
        workspaceId: currentWorkspaceId,
        extinguishers: extinguishers.map(e => ({ ...e })),
        sectionTimes: { ...sectionTimes },
        totalItems: extinguishers.length,
        passedItems: extinguishers.filter(e => e.status === 'pass').length,
        failedItems: extinguishers.filter(e => e.status === 'fail').length
      };

      localStorage.setItem(backupKey, JSON.stringify(backup));
      setLastAutoBackup(new Date());

      // Clean up old backups (keep last 7 days)
      cleanupOldBackups();

      console.log(`Auto-backup saved: ${backup.totalItems} items on ${today}`);
      return backup;
    } catch (err) {
      console.error('Auto-backup failed:', err);
      return null;
    }
  };

  // Remove backups older than 7 days
  const cleanupOldBackups = () => {
    if (!user) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`autoBackup_${user.uid}_`)) {
        const dateStr = key.split('_').pop(); // YYYY-MM-DD
        const backupDate = new Date(dateStr);
        if (backupDate < cutoffDate) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} old backups`);
    }
  };

  // Get list of available backups
  const getAvailableBackups = () => {
    if (!user) return [];

    const backups = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`autoBackup_${user.uid}_`)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          backups.push({
            key,
            date: data.date,
            backupTime: data.backupTime,
            totalItems: data.totalItems,
            passedItems: data.passedItems,
            failedItems: data.failedItems,
            workspaceId: data.workspaceId
          });
        } catch (e) {
          console.warn('Invalid backup data:', key);
        }
      }
    }

    // Sort by date descending (newest first)
    return backups.sort((a, b) => new Date(b.backupTime) - new Date(a.backupTime));
  };

  // Restore from a local backup
  const restoreFromBackup = async (backupKey) => {
    if (!user) return;

    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        alert('Backup not found.');
        return;
      }

      const backup = JSON.parse(backupData);

      const confirmRestore = window.confirm(
        `⚠️ RESTORE BACKUP\n\n` +
        `This will replace ALL current data with the backup from:\n` +
        `${new Date(backup.backupTime).toLocaleString()}\n\n` +
        `Backup contains:\n` +
        `• ${backup.totalItems} extinguishers\n` +
        `• ${backup.passedItems} passed\n` +
        `• ${backup.failedItems} failed\n\n` +
        `Current data will be OVERWRITTEN. Continue?`
      );

      if (!confirmRestore) return;

      // Double confirmation for safety
      const doubleConfirm = window.confirm(
        `🔴 FINAL WARNING\n\n` +
        `You are about to restore data from ${backup.date}.\n` +
        `This action CANNOT be undone.\n\n` +
        `Are you absolutely sure?`
      );

      if (!doubleConfirm) return;

      // First, create an emergency backup of current state
      const emergencyKey = `emergencyBackup_${user.uid}_${Date.now()}`;
      const emergencyBackup = {
        backupTime: new Date().toISOString(),
        reason: 'Pre-restore emergency backup',
        extinguishers: extinguishers.map(e => ({ ...e })),
        totalItems: extinguishers.length
      };
      localStorage.setItem(emergencyKey, JSON.stringify(emergencyBackup));

      // Delete existing Firestore documents
      const existingSnap = await getDocs(query(collection(db, 'extinguishers'), where('userId', '==', user.uid)));
      const batch = writeBatch(db);
      existingSnap.docs.forEach(docSnap => {
        batch.delete(doc(db, 'extinguishers', docSnap.id));
      });
      await batch.commit();

      // Restore from backup
      for (const item of backup.extinguishers) {
        const { id, ...rest } = item;
        await addDoc(collection(db, 'extinguishers'), {
          ...rest,
          userId: user.uid,
          restoredFrom: backupKey,
          restoredAt: new Date().toISOString()
        });
      }

      // Restore section times
      if (backup.sectionTimes && currentWorkspaceId) {
        localStorage.setItem(`sectionTimes_${user.uid}_${currentWorkspaceId}`, JSON.stringify(backup.sectionTimes));
        setSectionTimes(backup.sectionTimes);
      }

      alert(`✅ Restore complete!\n\n${backup.totalItems} extinguishers restored from ${backup.date}.\n\nAn emergency backup of your previous data was saved.`);
      setShowBackupModal(false);
    } catch (err) {
      console.error('Restore failed:', err);
      alert(`❌ Restore failed: ${err.message}\n\nYour current data should be unchanged.`);
    }
  };

  // Download a backup as JSON file
  const downloadBackup = (backupKey) => {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) return;

      const backup = JSON.parse(backupData);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FireExtinguisher_Backup_${backup.date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download backup.');
    }
  };

  // Auto-backup effect: runs when extinguishers data changes
  useEffect(() => {
    if (!user || extinguishers.length === 0) return;

    // Check last backup time
    const lastBackupKey = `lastAutoBackupTime_${user.uid}`;
    const lastBackupTime = localStorage.getItem(lastBackupKey);
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Only auto-backup once per day (or if no backup exists)
    if (lastBackupTime) {
      const lastDate = lastBackupTime.split('T')[0];
      if (lastDate === today) {
        // Already backed up today, but update the backup with latest data
        const backupKey = `autoBackup_${user.uid}_${today}`;
        const existing = localStorage.getItem(backupKey);
        if (existing) {
          setLastAutoBackup(new Date(JSON.parse(existing).backupTime));
        }
        return;
      }
    }

    // Perform auto-backup
    performAutoBackup().then(backup => {
      if (backup) {
        localStorage.setItem(lastBackupKey, new Date().toISOString());
      }
    });
  }, [user, extinguishers.length, currentWorkspaceId]);

  // Load available backups when modal opens
  useEffect(() => {
    if (showBackupModal) {
      setAvailableBackups(getAvailableBackups());
    }
  }, [showBackupModal, user]);
  // ============ END AUTO-BACKUP SYSTEM ============

  // ============ DATA REPAIR FUNCTION ============
  const repairMissingWorkspaceIds = async () => {
    if (!user || !currentWorkspaceId) {
      alert('Please make sure you are logged in and have a workspace selected.');
      return;
    }

    try {
      // Find all extinguishers for this user that don't have a workspaceId
      const allUserExtQuery = query(
        collection(db, 'extinguishers'),
        where('userId', '==', user.uid)
      );
      const allSnap = await getDocs(allUserExtQuery);

      const needsRepair = allSnap.docs.filter(d => !d.data().workspaceId);

      if (needsRepair.length === 0) {
        alert('All extinguishers already have a workspaceId. No repair needed.');
        return;
      }

      const confirm1 = window.confirm(
        `Found ${needsRepair.length} extinguishers without a workspaceId.\n\n` +
        `This will assign them to the current workspace: ${currentWorkspaceId}\n\n` +
        `Continue?`
      );

      if (!confirm1) return;

      // Update in batches of 500 (Firestore limit)
      const batchSize = 500;
      let updated = 0;

      for (let i = 0; i < needsRepair.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = needsRepair.slice(i, i + batchSize);

        chunk.forEach(docSnap => {
          batch.update(doc(db, 'extinguishers', docSnap.id), {
            workspaceId: currentWorkspaceId
          });
        });

        await batch.commit();
        updated += chunk.length;
        console.log(`Updated ${updated}/${needsRepair.length} extinguishers`);
      }

      alert(`SUCCESS! Repaired ${updated} extinguishers.\n\nRefresh the page to see your data.`);
    } catch (err) {
      console.error('Repair failed:', err);
      alert(`Repair failed: ${err.message}`);
    }
  };
  // ============ END DATA REPAIR FUNCTION ============

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const processFile = async () => {
        try {
          const data = event.target.result;
          const workbook = new ExcelJS.Workbook();

          // Determine file type and load appropriately
          if (file.name.endsWith('.csv')) {
            await workbook.csv.load(data);
          } else {
            await workbook.xlsx.load(data);
          }

          const firstSheet = workbook.worksheets[0];

          // Convert worksheet to JSON format
          const jsonData = [];
          const headers = [];
          firstSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
              // First row is headers
              row.eachCell((cell, colNumber) => {
                headers[colNumber] = cell.value;
              });
            } else {
              // Data rows
              const rowData = {};
              row.eachCell((cell, colNumber) => {
                if (headers[colNumber]) {
                  rowData[headers[colNumber]] = cell.value;
                }
              });
              if (Object.keys(rowData).length > 0) {
                jsonData.push(rowData);
              }
            }
          });
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
                await setDoc(docRef, {
                  vicinity: item.vicinity,
                  serial: item.serial,
                  parentLocation: item.parentLocation,
                  section: item.section,
                  // Intentionally do NOT touch: status, notes, photos, inspectionHistory, lastInspection*
                  updatedAt: new Date().toISOString()
                }, { merge: true });
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
                  workspaceId: currentWorkspaceId,
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
        try {
          const safeSeg = String(newItem.assetId || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_');
          const safeName = newItemPhoto.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `assets/${user.uid}/${safeSeg}/${Date.now()}_${safeName}`;
          const sref = storageRef(storage, path);
          const snap = await uploadBytes(sref, newItemPhoto, { contentType: newItemPhoto.type });
          assetPhotoUrl = await getDownloadURL(snap.ref);
        } catch (uploadErr) {
          console.warn('Asset photo upload failed; continuing without photo:', uploadErr);
          assetPhotoUrl = null;
        }
      }

      const item = {
        assetId: newItem.assetId.trim(),
        vicinity: newItem.vicinity.trim(),
        serial: newItem.serial.trim(),
        parentLocation: newItem.parentLocation.trim(),
        section: newItem.section,
        category: newItem.category || 'standard',
        expirationDate: newItem.expirationDate || null,
        status: 'pending',
        checkedDate: null,
        notes: '',
        inspectionHistory: [],
        userId: user.uid,
        workspaceId: currentWorkspaceId,
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
        section: 'Main Hospital',
        category: 'standard',
        expirationDate: ''
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
    console.log('handleInspection called:', { itemId: item?.id, assetId: item?.assetId, status });
    try {
      let photoUrl = null;
      if (inspectionData?.photo instanceof File) {
        try {
          const file = inspectionData.photo;
          const safeSeg = String(item.assetId || item.id || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_');
          const path = `inspections/${user.uid}/${safeSeg}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
      // Exclude 'id' from spread since it's the document path, not a field
      const { id: _id, ...itemData } = item;
      await setDoc(docRef, {
        ...itemData,
        userId: user.uid,
        status,
        checkedDate: new Date().toISOString(),
        notes,
        checklistData: inspectionData?.checklistData || null,
        lastInspectionPhotoUrl: photoUrl || null,
        lastInspectionGps: gps || null,
        inspectionHistory: [...(item.inspectionHistory || []), inspection]
      }, { merge: true });
      console.log('Inspection saved successfully for:', item.assetId);
      // Optimistically update local state so lists/counters reflect immediately
      const nowIso = new Date().toISOString();
      setExtinguishers(prev => prev.map(e => {
        if (!e || e.id !== item.id) return e;
        return {
          ...e,
          status,
          checkedDate: nowIso,
          notes,
          checklistData: inspectionData?.checklistData || e.checklistData,
          lastInspectionPhotoUrl: photoUrl || e.lastInspectionPhotoUrl || null,
          lastInspectionGps: gps || e.lastInspectionGps || null,
          inspectionHistory: [...(e.inspectionHistory || []), inspection]
        };
      }));
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
      setScanInput('');
      setScanMode(false);
      navigate(`/app/extinguisher/${found.assetId}`, {
        state: { from: 'scanner', returnPath: '/app' }
      });
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
      navigate(`/app/extinguisher/${found.assetId}`, {
        state: { from: 'scanner', returnPath: '/app' }
      });
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
      await setDoc(docRef, {
        assetId: editItem.assetId,
        vicinity: editItem.vicinity,
        serial: editItem.serial,
        parentLocation: editItem.parentLocation,
        section: editItem.section,
        category: editItem.category || 'standard',
        expirationDate: editItem.expirationDate || null,
        location: editItem.location || null
      }, { merge: true });

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
      await setDoc(docRef, {
        status: 'pending',
        checkedDate: null,
        notes: ''
      }, { merge: true });
      setSelectedItem(null);
    } catch (error) {
      console.error('Error resetting status:', error);
      alert('Error resetting status. Please try again.');
    }
  };

  const handleReplaceExtinguisher = async (oldItem, replacementData) => {
    try {
      const { assetId, serial, reason, manufactureDate, notes } = replacementData;

      if (!serial || !serial.trim()) {
        alert('Serial number is required for replacement.');
        return;
      }

      // Check if serial is different
      if (serial.trim() === (oldItem.serial || '').trim()) {
        alert('New serial number must be different from the old serial number.');
        return;
      }

      const replacementDate = new Date().toISOString();

      // Create replacement record with full history of old extinguisher
      const replacementRecord = {
        date: replacementDate,
        oldSerial: oldItem.serial || '',
        newSerial: serial.trim(),
        oldAssetId: oldItem.assetId,
        newAssetId: (assetId.trim() || oldItem.assetId),
        reason: reason.trim() || '',
        newManufactureDate: manufactureDate.trim() || '',
        notes: notes.trim() || '',
        replacedBy: user?.email || 'Current User',
        // Preserve the old extinguisher's status at time of replacement
        oldStatus: oldItem.status || 'fail',
        oldNotes: oldItem.notes || '',
        oldCheckedDate: oldItem.checkedDate || null,
        oldChecklistData: oldItem.checklistData || null,
        oldInspectionHistory: oldItem.inspectionHistory || []
      };

      // Build updated replacement history
      const existingReplacementHistory = oldItem.replacementHistory || [];
      const updatedReplacementHistory = [...existingReplacementHistory, replacementRecord];

      // Update the EXISTING extinguisher record in place (same location)
      // This replaces the old extinguisher info with new extinguisher info
      const updatedExtinguisherData = {
        assetId: assetId.trim() || oldItem.assetId,
        serial: serial.trim(),
        // Keep the same location info
        vicinity: oldItem.vicinity || '',
        parentLocation: oldItem.parentLocation || '',
        section: oldItem.section || 'Main Hospital',
        location: oldItem.location || null,
        // New extinguisher is automatically passed (it's brand new and good)
        status: 'pass',
        checkedDate: replacementDate,
        notes: notes.trim() || `Replaced on ${new Date(replacementDate).toLocaleDateString()}`,
        // Reset checklist data for the new extinguisher (fresh start)
        checklistData: null,
        manufactureYear: manufactureDate.trim() || '',
        category: 'standard', // New extinguisher is standard, not spare/replaced
        // Keep user/workspace info
        userId: user.uid,
        workspaceId: currentWorkspaceId,
        // Reset photos for new extinguisher (old photos are in replacement history if needed)
        photos: [],
        // Reset inspection history for new extinguisher (old history is in replacement history)
        inspectionHistory: [],
        // Add the replacement record to history
        replacementHistory: updatedReplacementHistory,
        // Keep original creation date, add replacement date
        createdAt: oldItem.createdAt || replacementDate,
        lastReplacementDate: replacementDate
      };

      // Update the existing document in Firestore
      const docRef = doc(db, 'extinguishers', oldItem.id);
      await setDoc(docRef, updatedExtinguisherData, { merge: false });

      // Update local state
      setExtinguishers(prev => prev.map(e => {
        if (e.id === oldItem.id) {
          return {
            ...updatedExtinguisherData,
            id: oldItem.id
          };
        }
        return e;
      }));

      setReplaceItem(null);
      setReplaceForm({
        assetId: '',
        serial: '',
        reason: '',
        manufactureDate: '',
        notes: ''
      });
      setSelectedItem(null);

      alert(`Extinguisher replaced successfully!\n\nAsset ID: ${updatedExtinguisherData.assetId}\nNew Serial: ${serial.trim()}\nStatus: PASS (new extinguisher)\n\nThe old extinguisher info has been saved to the replacement history.`);
    } catch (error) {
      console.error('Error replacing extinguisher:', error);
      alert(`Error replacing extinguisher: ${error.message}`);
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

      // Add replacement history if available
      if (item.replacementHistory && item.replacementHistory.length > 0) {
        baseData['Replacement History Count'] = item.replacementHistory.length;
        baseData['Replacement History'] = item.replacementHistory.map(r =>
          `${new Date(r.date).toLocaleDateString()} - Old Serial: ${r.oldSerial || 'N/A'}, New Serial: ${r.newSerial || 'N/A'}${r.reason ? ', Reason: ' + r.reason : ''}${r.notes ? ', Notes: ' + r.notes : ''}`
        ).join(' | ');
        // Add most recent replacement details as separate columns
        const latestReplacement = item.replacementHistory[item.replacementHistory.length - 1];
        baseData['Last Replacement Date'] = latestReplacement.date ? new Date(latestReplacement.date).toLocaleDateString() : '';
        baseData['Last Replacement Old Serial'] = latestReplacement.oldSerial || '';
        baseData['Last Replacement New Serial'] = latestReplacement.newSerial || '';
        baseData['Last Replacement Reason'] = latestReplacement.reason || '';
        baseData['Last Replacement Manufacture Date'] = latestReplacement.newManufactureDate || '';
        baseData['Last Replacement Notes'] = latestReplacement.notes || '';
        baseData['Last Replaced By'] = latestReplacement.replacedBy || '';
      }

      return baseData;
    });

    // Generate filename with current month/year and current date
    const now = new Date();
    const { monthName, year } = getWorkspaceMonthInfo();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const typeLabel = type === 'all' ? 'All' : type === 'passed' ? 'Passed' : 'Failed';

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inspections');

    if (formatted.length > 0) {
      worksheet.columns = Object.keys(formatted[0]).map(key => ({ header: key, key }));
      formatted.forEach(row => worksheet.addRow(row));
    }

    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${monthName}_${year}_Extinguisher_Checks_${typeLabel}_${timestamp}_Export.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    });
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

    // Generate filename with current month/year and current date
    const now = new Date();
    const { monthName, year } = getWorkspaceMonthInfo();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Time Tracking');

    if (timeData.length > 0) {
      worksheet.columns = Object.keys(timeData[0]).map(key => ({ header: key, key }));
      timeData.forEach(row => worksheet.addRow(row));
    }

    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${monthName}_${year}_Time_Tracking_${timestamp}_Export.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Device Sync Export - exports everything needed to sync to another device
  const exportSyncData = () => {
    const currentWorkspace = workspaces.find(ws => ws.id === currentWorkspaceId);

    const syncData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      exportedFrom: user.email,
      workspace: currentWorkspace ? {
        label: currentWorkspace.label,
        monthYear: currentWorkspace.monthYear,
        status: currentWorkspace.status,
        createdAt: currentWorkspace.createdAt
      } : null,
      extinguishers: extinguishers.map(e => {
        // Remove Firestore-specific IDs, keep all inspection data
        const { id, userId, workspaceId, ...data } = e;
        return data;
      }),
      sectionNotes: sectionNotes,
      sectionTimes: sectionTimes
    };

    const blob = new Blob([JSON.stringify(syncData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    const label = currentWorkspace?.label?.replace(/[^a-zA-Z0-9]/g, '_') || 'sync';
    a.download = `FireExtinguisher_Sync_${label}_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Sync file exported!\n\nTransfer this file to your other device and use "Import Sync File" to restore your data.`);
  };

  // Device Sync Import - imports sync data and replaces current workspace
  const importSyncData = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSyncImporting(true);
    try {
      const text = await file.text();
      const syncData = JSON.parse(text);

      if (!syncData.version || !syncData.extinguishers) {
        throw new Error('Invalid sync file format');
      }

      const confirmMsg = `Import sync data from ${syncData.exportedFrom || 'unknown'}?\n\n` +
        `Workspace: ${syncData.workspace?.label || 'Unknown'}\n` +
        `Extinguishers: ${syncData.extinguishers.length}\n` +
        `Exported: ${new Date(syncData.exportedAt).toLocaleString()}\n\n` +
        `This will REPLACE all data in your current workspace.`;

      if (!window.confirm(confirmMsg)) {
        setSyncImporting(false);
        event.target.value = '';
        return;
      }

      // Delete existing extinguishers in current workspace
      const existingQuery = query(
        collection(db, 'extinguishers'),
        where('userId', '==', user.uid),
        where('workspaceId', '==', currentWorkspaceId)
      );
      const existingSnap = await getDocs(existingQuery);

      // Batch delete existing
      for (let i = 0; i < existingSnap.docs.length; i += 450) {
        const slice = existingSnap.docs.slice(i, i + 450);
        const batch = writeBatch(db);
        slice.forEach(d => batch.delete(doc(db, 'extinguishers', d.id)));
        await batch.commit();
      }

      // Import new extinguishers
      let imported = 0;
      for (const item of syncData.extinguishers) {
        await addDoc(collection(db, 'extinguishers'), {
          ...item,
          userId: user.uid,
          workspaceId: currentWorkspaceId,
          importedAt: new Date().toISOString(),
          importedFrom: syncData.exportedFrom || 'sync'
        });
        imported++;
      }

      // Import section notes
      if (syncData.sectionNotes) {
        for (const [section, noteData] of Object.entries(syncData.sectionNotes)) {
          if (noteData?.notes) {
            const slug = section.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const id = `${user.uid}__${slug}`;
            await setDoc(doc(db, 'sectionNotes', id), {
              userId: user.uid,
              section: section,
              notes: noteData.notes,
              lastUpdated: new Date().toISOString()
            }, { merge: true });
          }
        }
      }

      // Import section times to localStorage
      if (syncData.sectionTimes) {
        setSectionTimes(syncData.sectionTimes);
        localStorage.setItem(`sectionTimes_${user.uid}`, JSON.stringify(syncData.sectionTimes));
      }

      alert(`Sync complete!\n\nImported ${imported} extinguishers.\n\nYour data should now match the source device.`);
      setShowSyncModal(false);
    } catch (error) {
      console.error('Sync import error:', error);
      alert(`Import failed: ${error.message}`);
    } finally {
      setSyncImporting(false);
      event.target.value = '';
    }
  };

  const clearAllData = async () => {
    if (!currentWorkspaceId) {
      alert('Please select a workspace first.');
      return;
    }

    const workspaceLabel = getCurrentWorkspace()?.label || 'current workspace';
    if (!window.confirm(`Are you sure you want to clear all data for ${workspaceLabel}?\n\nThis will delete all extinguishers and data for this month only. Other months will not be affected.\n\nThis cannot be undone.`)) {
      return;
    }

    try {
      // Delete only extinguishers from the current workspace
      const extinguishersQuery = query(
        collection(db, 'extinguishers'),
        where('userId', '==', user.uid),
        where('workspaceId', '==', currentWorkspaceId)
      );

      const snapshot = await getDocs(extinguishersQuery);
      
      if (snapshot.docs.length === 0) {
        alert('No data found to clear in this workspace.');
        return;
      }

      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Clear local data for this workspace only
      localStorage.removeItem(`sessionState_${user.uid}_${currentWorkspaceId}`);
      localStorage.removeItem(`sectionTimes_${user.uid}_${currentWorkspaceId}`);
      setSelectedItem(null);
      setEditItem(null);
      setSectionTimes({});

      alert(`Successfully cleared all data for ${workspaceLabel}.\n\n${snapshot.docs.length} extinguishers deleted.`);
    } catch (error) {
      console.error('Error clearing data:', error);
      alert(`Error clearing data: ${error.message}`);
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
    setSaveNoteForNextMonth(sectionNotes[selectedSection]?.saveForNextMonth || false);
    setShowSectionNotesModal(true);
  };

  const handleNoteSectionChange = (section) => {
    setNoteSelectedSection(section);
    const currentNote = sectionNotes[section]?.notes || '';
    setCurrentSectionNote(currentNote);
    setSaveNoteForNextMonth(sectionNotes[section]?.saveForNextMonth || false);
  };

  const saveSectionNotes = async () => {
    try {
      const existingNote = sectionNotes[noteSelectedSection];

      if (existingNote && existingNote.id) {
        const docRef = doc(db, 'sectionNotes', existingNote.id);
        await updateDoc(docRef, {
          notes: currentSectionNote,
          saveForNextMonth: saveNoteForNextMonth,
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
            saveForNextMonth: saveNoteForNextMonth,
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
              saveForNextMonth: saveNoteForNextMonth,
              lastUpdated: new Date().toISOString(),
              createdAt: new Date().toISOString()
            }, { merge: true });
          } catch (err) {
            // Fallback to addDoc (older rules may allow this)
            await addDoc(collection(db, 'sectionNotes'), {
              userId: user.uid,
              section: noteSelectedSection,
              notes: currentSectionNote,
              saveForNextMonth: saveNoteForNextMonth,
              lastUpdated: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      setShowSectionNotesModal(false);
      setSaveNoteForNextMonth(false);
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
    const unchecked = list.filter(e => String(e.status || '').toLowerCase() === 'pending').length;
    return { checked: list.length - unchecked, unchecked };
  };

  // helpers for SectionDetail actions
  const handlePass = (item, notesSummary = '', inspectionData = null) => handleInspection(item, 'pass', notesSummary, inspectionData);
  const handleFail = (item, notesSummary = '', inspectionData = null) => handleInspection(item, 'fail', notesSummary, inspectionData);
  const handleOpenReplace = (item) => {
    setReplaceItem(item);
    setReplaceForm({
      assetId: item.assetId || '',
      serial: '',
      reason: '',
      manufactureDate: '',
      notes: ''
    });
  };
  const handleUpdateExpirationDate = async (item, expirationDate) => {
    try {
      const docRef = doc(db, 'extinguishers', item.id);
      await setDoc(docRef, { expirationDate: expirationDate || null }, { merge: true });
    } catch (error) {
      console.error('Error updating expiration date:', error);
      alert('Error saving expiration date. Please try again.');
    }
  };

  const handleSaveNotes = async (item, notesSummary, inspectionData = null) => {
    try {
      let photoUrl = null;
      if (inspectionData?.photo instanceof File) {
        try {
          const file = inspectionData.photo;
          const safeSeg = String(item.assetId || item.id || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_');
          const path = `inspections/${user.uid}/${safeSeg}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
      await setDoc(docRef, updates, { merge: true });
      // Optimistically update local state for notes/checklist/photo/gps so UI reflects immediately
      setExtinguishers(prev => prev.map(e => {
        if (!e || e.id !== item.id) return e;
        return {
          ...e,
          ...(typeof updates.notes !== 'undefined' ? { notes: updates.notes } : {}),
          ...(typeof updates.checklistData !== 'undefined' ? { checklistData: updates.checklistData } : {}),
          ...(typeof updates.lastInspectionPhotoUrl !== 'undefined' ? { lastInspectionPhotoUrl: updates.lastInspectionPhotoUrl } : {}),
          ...(typeof updates.lastInspectionGps !== 'undefined' ? { lastInspectionGps: updates.lastInspectionGps } : {})
        };
      }));
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
    const safeSeg = String(asset.assetId || asset.id || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `assets/${user.uid}/${safeSeg}/${Date.now()}_${safeName}`;
    const sref = storageRef(storage, path);
    const snap = await uploadBytes(sref, file, { contentType: file.type });
    const url = await getDownloadURL(snap.ref);
    const docRef = doc(db, 'extinguishers', asset.id);
    const next = [...photos, { url, uploadedAt: new Date().toISOString(), path }];
    await setDoc(docRef, { photos: next }, { merge: true });
    setSelectedItem({ ...asset, photos: next });
  };

  const setMainAssetPhoto = async (asset, index) => {
    const photos = asset.photos || [];
    if (index <= 0 || index >= photos.length) return;
    const reordered = [photos[index], ...photos.slice(0, index), ...photos.slice(index + 1)];
    const docRef = doc(db, 'extinguishers', asset.id);
    await setDoc(docRef, { photos: reordered }, { merge: true });
    setSelectedItem({ ...asset, photos: reordered });
  };

  const removeAssetPhoto = async (asset, index) => {
    const photos = asset.photos || [];
    if (index < 0 || index >= photos.length) return;
    const removing = photos[index];
    const docRef = doc(db, 'extinguishers', asset.id);
    const next = photos.filter((_, i) => i !== index);
    await setDoc(docRef, { photos: next }, { merge: true });
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
        return setDoc(docRef, {
          status: 'pending',
          checkedDate: null,
          notes: '',
          lastMonthlyReset: currentDate
        }, { merge: true });
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
          const st = String(item.status || '').toLowerCase();
          if (currentViewMode === 'unchecked') {
            matchesView = st === 'pending';
          } else { // checked
            matchesView = st === 'pass' || st === 'fail';
          }
        } else {
          // For "All" sections, use the global view filter
          const st = String(item.status || '').toLowerCase();
          matchesView = view === 'pending' ? st === 'pending' :
                       view === 'pass' ? st === 'pass' :
                       view === 'fail' ? st === 'fail' : true;
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
    pending: extinguishers.filter(e => String(e.status || '').toLowerCase() === 'pending').length,
    pass: extinguishers.filter(e => String(e.status || '').toLowerCase() === 'pass').length,
    fail: extinguishers.filter(e => String(e.status || '').toLowerCase() === 'fail').length
  };

  const sectionCounts = SECTIONS.map(section => {
    const items = extinguishers.filter(e => e.section === section);
    return {
      section,
      total: items.length,
      pending: items.filter(e => String(e.status || '').toLowerCase() === 'pending').length,
      pass: items.filter(e => String(e.status || '').toLowerCase() === 'pass').length,
      fail: items.filter(e => String(e.status || '').toLowerCase() === 'fail').length
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
    <div className="min-h-screen bg-gradient-to-b from-gray-800 via-gray-900 to-black pb-20" style={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      <div className="max-w-6xl mx-auto p-3 sm:p-4" style={{ width: '100%', maxWidth: '100%' }}>
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
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-3 sm:p-4 rounded-lg shadow-lg mb-6 border border-red-900">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="text-xs sm:text-sm">
                <span className="text-gray-400">Fire Safety Management</span>
                <Link to="/" className="text-white font-semibold ml-2 hover:text-red-400 transition">
                  Fire Extinguisher Tracker
                </Link>
              </div>
              {/* Workspace Badge - Long press to switch */}
              <div
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-bold cursor-pointer select-none transition-all shadow-md border-2 ${
                  workspaceBadgePressing
                    ? 'bg-yellow-400 text-yellow-900 scale-105 border-yellow-600'
                    : workspaces.length > 1
                      ? 'bg-amber-400 text-amber-900 hover:bg-amber-300 border-amber-600'
                      : 'bg-blue-400 text-blue-900 hover:bg-blue-300 border-blue-600'
                }`}
                onMouseDown={handleWorkspaceBadgeMouseDown}
                onMouseUp={handleWorkspaceBadgeMouseUp}
                onMouseLeave={handleWorkspaceBadgeMouseUp}
                onTouchStart={handleWorkspaceBadgeTouchStart}
                onTouchEnd={handleWorkspaceBadgeTouchEnd}
                title="Hold for 0.5s to switch inspection month"
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="whitespace-nowrap">{getCurrentWorkspace()?.label || 'Loading...'}</span>
                  {workspaces.length > 1 && (
                    <span className="text-xs sm:text-sm bg-white bg-opacity-50 px-1.5 sm:px-2 py-0.5 rounded">
                      {workspaces.length} months
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 sm:gap-2 flex-nowrap justify-end min-w-0 w-full sm:w-auto overflow-visible">
              <span className="text-xs text-gray-400 hidden sm:inline">Logged in as:</span>
              <span className="text-xs sm:text-sm text-white truncate max-w-[50px] sm:max-w-none hidden min-[400px]:inline">{user.email}</span>
              <button
                onClick={() => navigate('/app/calculator')}
                className="px-2 sm:px-3 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0"
                title="Open Fire Extinguisher Calculator"
                style={{ minWidth: '44px', minHeight: '44px', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)', touchAction: 'manipulation' }}
              >
                <CalculatorIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Calculator</span>
              </button>
              <button
                onClick={() => navigate('/app/custom-assets')}
                className="px-2 sm:px-3 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0"
                title="Custom Asset Checker"
                style={{ minWidth: '44px', minHeight: '44px', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)', touchAction: 'manipulation' }}
              >
                <ClipboardList size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Assets</span>
              </button>
              <button
                onClick={() => setAdminMode(!adminMode)}
                className={`p-1.5 sm:p-2 hover:bg-gray-600 active:bg-gray-700 rounded flex items-center justify-center gap-1 sm:gap-2 flex-shrink-0 ${adminMode ? 'bg-gray-600' : ''}`}
                title={adminMode ? 'Exit Admin Mode' : 'Admin Mode'}
                style={{ minWidth: '44px', minHeight: '44px', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)', touchAction: 'manipulation' }}
              >
                <Settings size={18} className="sm:w-[18px] sm:h-[18px]" />
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2 hover:bg-gray-600 active:bg-gray-700 rounded flex items-center justify-center gap-1 sm:gap-2 flex-shrink-0"
                title="Logout"
                style={{ minWidth: '44px', minHeight: '44px', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)', touchAction: 'manipulation' }}
              >
                <LogOut size={18} className="sm:w-[18px] sm:h-[18px]" />
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 sm:p-2 hover:bg-gray-600 active:bg-gray-700 rounded flex items-center justify-center flex-shrink-0"
                title="Menu"
                style={{ minWidth: '44px', minHeight: '44px', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)', touchAction: 'manipulation' }}
              >
                <Menu size={20} className="sm:w-[20px] sm:h-[20px]" />
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
              {/* Workspace Management */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2 font-medium">Inspection Months</p>
                {getCurrentWorkspace() && (
                  <div className="text-xs text-gray-500 mb-2">
                    Current: <strong>{getCurrentWorkspace().label}</strong>
                    {workspaces.length > 1 && ` (${workspaces.length} active)`}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setShowCreateWorkspace(true);
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition w-full"
              >
                <Plus size={20} />
                New Inspection Month
              </button>
              {workspaces.length > 1 && (
                <button
                  onClick={() => {
                    setShowWorkspaceSwitcher(true);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition w-full"
                >
                  <Calendar size={20} />
                  Switch Inspection Month
                </button>
              )}

              {/* Data Protection / Backup Section */}
              <div className="border-t pt-2 mt-4">
                <p className="text-sm text-gray-600 mb-2 font-medium">Data Protection</p>
                {lastAutoBackup && (
                  <div className="text-xs text-green-600 mb-2 flex items-center gap-1">
                    <Shield size={14} />
                    Last backup: {lastAutoBackup.toLocaleDateString()} {lastAutoBackup.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setShowBackupModal(true);
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition w-full"
              >
                <Shield size={20} />
                Backup & Restore
              </button>
              <button
                onClick={async () => {
                  const backup = await performAutoBackup();
                  if (backup) {
                    alert(`Backup saved!\n\n${backup.totalItems} extinguishers backed up.`);
                  } else {
                    alert('Backup failed or no data to backup.');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 transition w-full"
              >
                <History size={20} />
                Backup Now
              </button>

              {adminMode && (
                <>
              <div className="border-t pt-2 mt-4">
                <p className="text-sm text-gray-600 mb-2 font-medium">Database Management (Admin)</p>
              </div>
              <button
                onClick={() => openDuplicateCleanup()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition w-full"
              >
                <History size={20} />
                Cleanup Duplicates (by Asset ID)
              </button>
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
                  repairMissingWorkspaceIds();
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition w-full"
              >
                <RotateCcw size={20} />
                Repair Missing WorkspaceIds
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
                <p className="text-sm text-gray-600 mb-2 font-medium">📱 Device Sync</p>
              </div>
              <button
                onClick={() => {
                  exportSyncData();
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition w-full"
              >
                <Upload size={20} />
                Export Sync File (from this device)
              </button>
              <button
                onClick={() => {
                  setShowSyncModal(true);
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition w-full"
              >
                <Download size={20} />
                Import Sync File (to this device)
              </button>

              <div className="border-t pt-2 mt-4">
                <p className="text-sm text-gray-600 mb-2 font-medium">Export Data</p>
              </div>
              <button
                onClick={() => {
                  navigate('/app/print');
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition w-full"
              >
                <FileText size={20} />
                Print Full List
              </button>
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

              {/* Quick Lists */}
              <div className="border-t pt-2 mt-4">
                <p className="text-sm text-gray-600 mb-2 font-medium">Quick Lists</p>
              </div>
              <button
                onClick={() => setShowStatusList({ status: 'pass', scope: selectedSection === 'All' ? 'all' : 'section' })}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition w-full"
              >
                <CheckCircle size={20} />
                View Passed
              </button>
              <button
                onClick={() => setShowStatusList({ status: 'fail', scope: selectedSection === 'All' ? 'all' : 'section' })}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded hover:bg-rose-600 transition w-full"
              >
                <XCircle size={20} />
                View Failed
              </button>
              <button
                onClick={() => setShowCategoryList({ category: 'spare' })}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 transition w-full"
              >
                <Circle size={20} />
                View Spares
              </button>
              <button
                onClick={() => setShowCategoryList({ category: 'replaced' })}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition w-full"
              >
                <History size={20} />
                View Replaced
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
          <div
            className="bg-white p-4 rounded-lg shadow text-center cursor-pointer hover:shadow-md transition"
            onClick={() => setShowStatusList({ status: 'pass', scope: selectedSection === 'All' ? 'all' : 'section' })}
            onMouseDown={() => {
              if (statusPressTimerRef.current) clearTimeout(statusPressTimerRef.current);
              statusPressTimerRef.current = setTimeout(() => {
                setShowStatusList({ status: 'pass', scope: 'all' });
              }, 600);
            }}
            onMouseUp={() => { if (statusPressTimerRef.current) { clearTimeout(statusPressTimerRef.current); statusPressTimerRef.current = null; } }}
            onMouseLeave={() => { if (statusPressTimerRef.current) { clearTimeout(statusPressTimerRef.current); statusPressTimerRef.current = null; } }}
            onTouchStart={() => {
              if (statusPressTimerRef.current) clearTimeout(statusPressTimerRef.current);
              statusPressTimerRef.current = setTimeout(() => {
                setShowStatusList({ status: 'pass', scope: 'all' });
              }, 600);
            }}
            onTouchEnd={() => { if (statusPressTimerRef.current) { clearTimeout(statusPressTimerRef.current); statusPressTimerRef.current = null; } }}
          >
            <div className="text-3xl font-bold text-green-600">{stats.pass}</div>
            <div className="text-gray-600">Passed</div>
          </div>
          <div
            className="bg-white p-4 rounded-lg shadow text-center cursor-pointer hover:shadow-md transition"
            onClick={() => setShowStatusList({ status: 'fail', scope: selectedSection === 'All' ? 'all' : 'section' })}
            onMouseDown={() => {
              if (statusPressTimerRef.current) clearTimeout(statusPressTimerRef.current);
              statusPressTimerRef.current = setTimeout(() => {
                setShowStatusList({ status: 'fail', scope: 'all' });
              }, 600);
            }}
            onMouseUp={() => { if (statusPressTimerRef.current) { clearTimeout(statusPressTimerRef.current); statusPressTimerRef.current = null; } }}
            onMouseLeave={() => { if (statusPressTimerRef.current) { clearTimeout(statusPressTimerRef.current); statusPressTimerRef.current = null; } }}
            onTouchStart={() => {
              if (statusPressTimerRef.current) clearTimeout(statusPressTimerRef.current);
              statusPressTimerRef.current = setTimeout(() => {
                setShowStatusList({ status: 'fail', scope: 'all' });
              }, 600);
            }}
            onTouchEnd={() => { if (statusPressTimerRef.current) { clearTimeout(statusPressTimerRef.current); statusPressTimerRef.current = null; } }}
          >
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

        {/* Status Quick List Modal */}
        {showStatusList && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full my-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  {showStatusList.status === 'pass' ? 'Passed' : 'Failed'} Extinguishers
                  {showStatusList.scope === 'section' && selectedSection !== 'All' ? ` — ${selectedSection}` : ' — All Sections'}
                </h3>
                <button onClick={() => setShowStatusList(null)}>
                  <X size={24} />
                </button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <label className="text-sm text-gray-700">Scope:</label>
                <select
                  value={showStatusList.scope}
                  onChange={(e) => setShowStatusList(prev => ({ ...prev, scope: e.target.value }))}
                  className="p-2 border rounded"
                >
                  <option value="section">Current Section</option>
                  <option value="all">All Sections</option>
                </select>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {(() => {
                  const scopeIsSection = showStatusList.scope === 'section' && selectedSection !== 'All';
                  const list = extinguishers
                    .filter(e => String(e.status || '').toLowerCase() === showStatusList.status)
                    .filter(e => !scopeIsSection || e.section === selectedSection)
                    .sort((a, b) => String(a.assetId || '').localeCompare(String(b.assetId || '')));
                  if (list.length === 0) {
                    return <div className="text-gray-500">No items found.</div>;
                  }
                  return (
                    <div className="space-y-2">
                      {list.map(item => (
                        <div key={item.id} className="p-3 border rounded flex items-center justify-between bg-gray-50">
                          <div>
                            <div className="font-semibold">{item.assetId}</div>
                            <div className="text-xs text-gray-600">{item.section} • {item.vicinity} {item.parentLocation ? `• ${item.parentLocation}` : ''}</div>
                          </div>
                          <button
                            className="text-blue-600 hover:underline"
                            onClick={() => { setShowStatusList(null); navigate(`/app/extinguisher/${item.assetId}`); }}
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Category Quick List Modal (Spare / Replaced) */}
        {showCategoryList && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full my-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold capitalize">{showCategoryList.category} Extinguishers</h3>
                <button onClick={() => setShowCategoryList(null)}>
                  <X size={24} />
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {(() => {
                  const list = extinguishers
                    .filter(e => (e.category || 'standard') === showCategoryList.category)
                    .sort((a, b) => String(a.assetId || '').localeCompare(String(b.assetId || '')));
                  if (list.length === 0) {
                    return <div className="text-gray-500">No items found.</div>;
                  }
                  return (
                    <div className="space-y-2">
                      {list.map(item => (
                        <div key={item.id} className="p-3 border rounded flex items-center justify-between bg-gray-50">
                          <div>
                            <div className="font-semibold">{item.assetId}</div>
                            <div className="text-xs text-gray-600">{item.section} • {item.vicinity} {item.parentLocation ? `• ${item.parentLocation}` : ''}</div>
                          </div>
                          <button
                            className="text-blue-600 hover:underline"
                            onClick={() => { setShowCategoryList(null); navigate(`/app/extinguisher/${item.assetId}`); }}
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

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
                  getViewMode={getSectionViewMode}
                  toggleView={toggleSectionView}
                  countsFor={countsForSection}
                  onEdit={handleEdit}
                />
              }
            />
            <Route
              path="extinguisher/:assetId"
              element={
                <ExtinguisherDetailView
                  extinguishers={extinguishers}
                  onPass={handlePass}
                  onFail={handleFail}
                  onEdit={handleEdit}
                  onReplace={handleOpenReplace}
                  onSaveNotes={handleSaveNotes}
                  onUpdateExpirationDate={handleUpdateExpirationDate}
                />
              }
            />
            <Route
              path="calculator"
              element={<Calculator />}
            />
            <Route
              path="print"
              element={
                <PrintableExtinguisherList
                  extinguishers={extinguishers}
                />
              }
            />
            <Route
              path="custom-assets"
              element={
                <CustomAssetChecker
                  user={user}
                  currentWorkspaceId={currentWorkspaceId}
                />
              }
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
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveForNextMonth"
                  checked={saveNoteForNextMonth}
                  onChange={(e) => setSaveNoteForNextMonth(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="saveForNextMonth" className="text-sm text-gray-700 cursor-pointer">
                  Save this note for next month's inspection (otherwise it will be cleared when starting a new month)
                </label>
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
                onClick={() => {
                  setShowSectionNotesModal(false);
                  setSaveNoteForNextMonth(false);
                }}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="standard">Standard</option>
                  <option value="spare">Spare</option>
                  <option value="replaced">Replaced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={newItem.expirationDate}
                  onChange={(e) => setNewItem({...newItem, expirationDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Date when extinguisher expires or needs service</p>
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

      {/* selectedItem modal removed - now using unified ExtinguisherDetailView */}

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editItem.category || 'standard'}
                  onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="standard">Standard</option>
                  <option value="spare">Spare</option>
                  <option value="replaced">Replaced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={editItem.expirationDate || ''}
                  onChange={(e) => setEditItem({...editItem, expirationDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Date when extinguisher expires or needs service</p>
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

      {/* Replace Extinguisher Modal */}
      {replaceItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Replace Fire Extinguisher</h3>
              <button onClick={() => {
                setReplaceItem(null);
                setReplaceForm({
                  assetId: '',
                  serial: '',
                  reason: '',
                  manufactureDate: '',
                  notes: ''
                });
              }}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Replacing:</strong> Asset #{replaceItem.assetId} • Serial: {replaceItem.serial || 'N/A'}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Location: {replaceItem.vicinity || replaceItem.parentLocation || 'N/A'} • Status: {replaceItem.status?.toUpperCase() || 'N/A'}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  The new extinguisher info will replace the old one at this location. Status will be set to PASS. Old extinguisher details are saved to history.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset ID <span className="text-gray-500">(pre-filled, editable)</span>
                </label>
                <input
                  type="text"
                  value={replaceForm.assetId}
                  onChange={(e) => setReplaceForm({...replaceForm, assetId: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Enter asset ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Serial Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={replaceForm.serial}
                  onChange={(e) => setReplaceForm({...replaceForm, serial: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Enter new serial number (must be different)"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Old serial: {replaceItem.serial || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Replacement
                </label>
                <input
                  type="text"
                  value={replaceForm.reason}
                  onChange={(e) => setReplaceForm({...replaceForm, reason: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 6-year NFPA maintenance replacement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacture Date of New Extinguisher
                </label>
                <input
                  type="text"
                  value={replaceForm.manufactureDate}
                  onChange={(e) => setReplaceForm({...replaceForm, manufactureDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 2025"
                />
                <p className="text-xs text-gray-500 mt-1">Enter manufacture year, 6-year maintenance, or hydrostatic test date</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows="4"
                  value={replaceForm.notes}
                  onChange={(e) => setReplaceForm({...replaceForm, notes: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Enter any additional notes about the replacement..."
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700">
                  <strong>What happens:</strong> The new extinguisher will be marked as PASS and will replace the failed one at this location. All old extinguisher info (serial, inspection history, photos, notes) is preserved in the replacement history for record-keeping.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4 mt-6">
              <button
                onClick={() => {
                  if (!replaceForm.serial || !replaceForm.serial.trim()) {
                    alert('Serial number is required.');
                    return;
                  }
                  if (window.confirm(`Replace extinguisher ${replaceItem.assetId}?\n\nOld Serial: ${replaceItem.serial || 'N/A'}\nNew Serial: ${replaceForm.serial}\n\nThe new extinguisher will be marked as PASS and the old info will be saved to history.`)) {
                    handleReplaceExtinguisher(replaceItem, replaceForm);
                  }
                }}
                className="flex-1 bg-orange-600 text-white p-3 rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2 font-semibold"
              >
                <RotateCcw size={20} />
                Replace Extinguisher
              </button>
              <button
                onClick={() => {
                  setReplaceItem(null);
                  setReplaceForm({
                    assetId: '',
                    serial: '',
                    reason: '',
                    manufactureDate: '',
                    notes: ''
                  });
                }}
                className="px-4 bg-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Switcher Modal */}
      {showWorkspaceSwitcher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Select Inspection Month</h3>
              <button onClick={() => setShowWorkspaceSwitcher(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3">
              {workspaces.map(workspace => {
                const isCurrentMonth = workspace.monthYear === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                const isCurrent = workspace.id === currentWorkspaceId;

                return (
                  <div
                    key={workspace.id}
                    onClick={() => switchWorkspace(workspace.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Calendar size={20} className={isCurrent ? 'text-blue-600' : 'text-gray-500'} />
                        <span className="font-semibold">{workspace.label}</span>
                        {isCurrent && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Active</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {(() => {
                          // Calculate stats for this workspace - need to fetch or use cached
                          const wsStats = getWorkspaceStats(
                            isCurrent ? extinguishers : []
                          );
                          return isCurrent ? `${wsStats.total - wsStats.pending}/${wsStats.total}` : '';
                        })()}
                      </div>
                    </div>
                    {!isCurrentMonth && (
                      <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <span>Behind schedule</span>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="border-t pt-4 mt-4 space-y-2">
                <button
                  onClick={() => {
                    setShowWorkspaceSwitcher(false);
                    setShowCreateWorkspace(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  <Plus size={20} />
                  New Inspection Month
                </button>

                {workspaces.length > 0 && getCurrentWorkspace() && (
                  <button
                    onClick={() => {
                      const ws = getCurrentWorkspace();
                      if (window.confirm(`Archive "${ws.label}" inspection?\n\nThis will save all inspection results and remove it from your active workspaces.`)) {
                        archiveWorkspace(ws.id);
                        setShowWorkspaceSwitcher(false);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    <Download size={20} />
                    Archive Current Month
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">New Inspection Month</h3>
              <button onClick={() => setShowCreateWorkspace(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Month Suggestions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select month label:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const now = new Date();
                    const suggestions = [];
                    for (let i = 0; i < 4; i++) {
                      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(' ', " '");
                      suggestions.push(label);
                    }
                    return suggestions.map(label => (
                      <button
                        key={label}
                        onClick={() => {
                          const copyFromId = workspaces.length > 0 ? workspaces[0].id : null;
                          if (copyFromId) {
                            if (window.confirm(`Copy extinguisher list from "${workspaces[0].label}"?\n\nAll items will start as pending.`)) {
                              createWorkspace(label, copyFromId);
                            } else {
                              createWorkspace(label, null);
                            }
                          } else {
                            createWorkspace(label, null);
                          }
                        }}
                        className="px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center font-medium"
                      >
                        {label}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {workspaces.length > 0 && (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <strong>Tip:</strong> When you select a month, you'll be asked if you want to copy your extinguisher list from the current workspace.
                </div>
              )}

              <button
                onClick={() => setShowCreateWorkspace(false)}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
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

      {/* Backup & Restore Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Shield className="text-green-600" size={24} />
                Data Protection
              </h3>
              <button onClick={() => setShowBackupModal(false)}>
                <X size={24} />
              </button>
            </div>

            {/* Current Status */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
                <Shield size={18} />
                Auto-Backup Active
              </div>
              <p className="text-sm text-green-600">
                Your data is automatically backed up daily to this device.
                Backups are kept for 7 days.
              </p>
              {lastAutoBackup && (
                <p className="text-sm text-green-800 mt-2">
                  Last backup: <strong>{lastAutoBackup.toLocaleString()}</strong>
                </p>
              )}
            </div>

            {/* Manual Backup */}
            <div className="mb-4">
              <button
                onClick={async () => {
                  const backup = await performAutoBackup();
                  if (backup) {
                    setAvailableBackups(getAvailableBackups());
                    alert(`Backup saved!\n\n${backup.totalItems} extinguishers backed up.`);
                  }
                }}
                className="w-full bg-teal-500 text-white p-3 rounded-lg hover:bg-teal-600 flex items-center justify-center gap-2 font-semibold"
              >
                <History size={20} />
                Create Backup Now
              </button>
            </div>

            {/* Available Backups */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <History size={18} />
                Available Backups ({availableBackups.length})
              </h4>

              {availableBackups.length === 0 ? (
                <p className="text-gray-500 text-sm">No backups found on this device.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableBackups.map((backup) => (
                    <div
                      key={backup.key}
                      className="bg-gray-50 border rounded-lg p-3"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">
                            {new Date(backup.backupTime).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(backup.backupTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">{backup.totalItems} items</div>
                          <div className="text-xs">
                            <span className="text-green-600">{backup.passedItems} pass</span>
                            {' / '}
                            <span className="text-red-600">{backup.failedItems} fail</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => restoreFromBackup(backup.key)}
                          className="flex-1 bg-orange-500 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-600 font-medium"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => downloadBackup(backup.key)}
                          className="bg-blue-500 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-600"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Warning */}
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>Important:</strong> Backups are stored on this device only.
                For extra safety, use the Download button to save backups to your computer
                or cloud storage. You can also use Admin Mode to export a full JSON backup.
              </p>
            </div>

            <button
              onClick={() => setShowBackupModal(false)}
              className="w-full mt-4 bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Device Sync Import Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">📱 Import Sync File</h3>
              <button onClick={() => setShowSyncModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-orange-800 mb-2">
                <strong>Use this to sync data FROM another device.</strong>
              </p>
              <p className="text-sm text-orange-700">
                1. On your other device (phone), tap Menu → "Export Sync File"<br/>
                2. Transfer that .json file to this device<br/>
                3. Select the file below to import
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>⚠️ Warning:</strong> This will REPLACE all data in your current workspace with the imported data.
              </p>
            </div>

            <input
              ref={syncFileInputRef}
              type="file"
              accept=".json"
              onChange={importSyncData}
              className="hidden"
            />

            <button
              onClick={() => syncFileInputRef.current?.click()}
              disabled={syncImporting}
              className="w-full bg-orange-500 text-white p-4 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 text-lg font-semibold"
            >
              {syncImporting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Download size={24} />
                  Select Sync File to Import
                </>
              )}
            </button>

            <button
              onClick={() => setShowSyncModal(false)}
              className="w-full mt-3 bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Cleanup Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Duplicate Cleanup — Current Month</h3>
              <button onClick={() => setShowDuplicateModal(false)}>
                <X size={24} />
              </button>
            </div>
            {duplicateScanRunning ? (
              <div className="text-gray-600">Scanning for duplicates…</div>
            ) : duplicateGroups.length === 0 ? (
              <div className="text-gray-600">No duplicates found.</div>
            ) : (
              <>
                <div className="mb-3 text-sm text-gray-700">
                  Found {duplicateGroups.length} Asset ID(s) with duplicates. Total duplicates: {duplicateGroups.reduce((n,g)=>n+g.remove.length,0)}
                </div>
                <div className="max-h-[60vh] overflow-y-auto space-y-3">
                  {duplicateGroups.map(group => (
                    <div key={group.assetId} className="p-3 border rounded bg-gray-50">
                      <div className="font-semibold">Asset ID: {group.assetId}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Keep: {group.keep.id} • Status: {String(group.keep.status).toUpperCase()} {group.keep.checkedDate ? `• Checked: ${new Date(group.keep.checkedDate).toLocaleString()}` : ''}
                      </div>
                      <div className="text-xs text-gray-600">Remove: {group.remove.map(r => r.id).join(', ')}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowDuplicateModal(false)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
                  <button
                    onClick={runDuplicateCleanup}
                    disabled={duplicateFixRunning}
                    className={`px-4 py-2 rounded text-white ${duplicateFixRunning ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    {duplicateFixRunning ? 'Cleaning…' : 'Merge & Remove Duplicates'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
