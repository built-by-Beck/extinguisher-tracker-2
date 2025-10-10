import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Search, Upload, CheckCircle, XCircle, Circle, Download, Filter, Edit2, Save, X, Menu, ScanLine, Plus, Clock, Play, Pause, StopCircle, LogOut, Camera, Calendar, Settings, RotateCcw } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './Login';
import CameraScanner from './components/BarcodeScanner.jsx';
import SectionGrid from './components/SectionGrid';
import SectionDetail from './components/SectionDetail';

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
  
  const [sectionTimes, setSectionTimes] = useState({});
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [currentElapsed, setCurrentElapsed] = useState(0);
  const [sectionViewMode, setSectionViewMode] = useState({}); // 'unchecked' or 'checked' per section
  
  const scanInputRef = useRef(null);
  const fileInputRef = useRef(null);
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

    return () => {
      unsubscribeExtinguishers();
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

  const saveData = async (newData) => {
    // Firestore handles the state updates through onSnapshot
    // This function is now mainly for compatibility
    setExtinguishers(newData);
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

          const parsed = jsonData.map((row, index) => {
            const assetId = row['Asset ID'] || row['Asset\nID'] || row['AssetID'] || '';
            const vicinity = row['Vicinity'] || '';
            const serial = row['Serial'] || '';
            const parentLocation = row['Parent Location'] || row['Parent\nLocation'] || '';

            return {
              assetId: String(assetId),
              vicinity,
              serial,
              parentLocation,
              section: importSection,
              status: 'pending',
              checkedDate: null,
              notes: '',
              inspectionHistory: [],
              userId: user.uid,
              createdAt: new Date().toISOString()
            };
          }).filter(item => item.assetId);

          // Add each item to Firestore
          for (const item of parsed) {
            try {
              await addDoc(collection(db, 'extinguishers'), item);
          } catch (error) {
            console.error('Error adding item:', error);
          }
        }

        setShowImportModal(false);
        alert(`Successfully imported ${parsed.length} fire extinguishers to ${importSection}!`);
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
        createdAt: new Date().toISOString()
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
      alert('New fire extinguisher added successfully!');
    } catch (error) {
      console.error('Error adding extinguisher:', error);
      alert('Error adding fire extinguisher. Please try again.');
    }
  };

  const handleInspection = async (item, status, notes = '') => {
    try {
      const inspection = {
        date: new Date().toISOString(),
        status,
        notes,
        inspector: user.email || 'Current User'
      };

      const docRef = doc(db, 'extinguishers', item.id);
      await updateDoc(docRef, {
        status,
        checkedDate: new Date().toISOString(),
        notes,
        inspectionHistory: [...(item.inspectionHistory || []), inspection]
      });

      setSelectedItem(null);
    } catch (error) {
      console.error('Error updating inspection:', error);
      alert('Error saving inspection. Please try again.');
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
        section: editItem.section
      });

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

  const exportData = (type = 'all') => {
    let dataToExport;
    
    if (type === 'passed') {
      dataToExport = extinguishers.filter(e => e.status === 'pass');
    } else if (type === 'failed') {
      dataToExport = extinguishers.filter(e => e.status === 'fail');
    } else {
      dataToExport = extinguishers;
    }

    const formatted = dataToExport.map(item => ({
      'Asset ID': item.assetId,
      'Serial': item.serial,
      'Vicinity': item.vicinity,
      'Parent Location': item.parentLocation,
      'Section': item.section,
      'Status': item.status.toUpperCase(),
      'Checked Date': item.checkedDate ? new Date(item.checkedDate).toLocaleString() : '',
      'Notes': item.notes
    }));

    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inspections');
    XLSX.writeFile(wb, `fire-extinguishers-${type}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportTimeData = () => {
    const timeData = SECTIONS.map(section => ({
      'Section': section,
      'Time Spent': formatTime(sectionTimes[section] || 0),
      'Total Milliseconds': sectionTimes[section] || 0,
      'Total Minutes': Math.round((sectionTimes[section] || 0) / 60000),
      'Items Checked': extinguishers.filter(e => e.section === section && e.status !== 'pending').length,
      'Items Pending': extinguishers.filter(e => e.section === section && e.status === 'pending').length
    }));

    const ws = XLSX.utils.json_to_sheet(timeData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Time Tracking');
    XLSX.writeFile(wb, `time-tracking-${new Date().toISOString().split('T')[0]}.xlsx`);
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
  const handlePass = (item, notesSummary = '') => handleInspection(item, 'pass', notesSummary);
  const handleFail = (item, notesSummary = '') => handleInspection(item, 'fail', notesSummary);
  const handleSaveNotes = async (item, notesSummary) => {
    try {
      const docRef = doc(db, 'extinguishers', item.id);
      await updateDoc(docRef, { notes: notesSummary || '' });
    } catch (e) {
      console.error('Error saving notes:', e);
    }
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

      // Create inspection log entry
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

      // Save inspection log
      console.log('Saving inspection log...');
      await addDoc(collection(db, 'inspectionLogs'), inspectionLog);
      console.log('Inspection log saved successfully');

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
            src="/banner.jpg"
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
                <span className="text-gray-400">Brookwood Hospital</span>
                <span className="text-white font-semibold ml-2">Fire Extinguisher Tracker</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Logged in as:</span>
              <span className="text-sm text-white">{user.email}</span>
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
                      setShowImportModal(true);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition w-full"
                  >
                    <Upload size={20} />
                    Import Data File (By Section)
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
                onClick={() => exportData('all')}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition w-full"
              >
                <Download size={20} />
                Export All Data
              </button>
              <button
                onClick={() => exportData('passed')}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition w-full"
              >
                <Download size={20} />
                Export Passed Only
              </button>
              <button
                onClick={() => exportData('failed')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition w-full"
              >
                <Download size={20} />
                Export Failed Only
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

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setShowCameraScanner(true)}
            className="bg-blue-500 text-white p-4 rounded-lg shadow-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 text-lg font-semibold"
          >
            <Camera size={24} />
            Camera Scan
          </button>
          <button
            onClick={() => setScanMode(true)}
            className="bg-green-500 text-white p-4 rounded-lg shadow-lg hover:bg-green-600 transition flex items-center justify-center gap-2 text-lg font-semibold"
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

        <Routes>
          <Route
            path="/"
            element={<SectionGrid sections={SECTIONS} extinguishers={extinguishers} />}
          />
          <Route
            path="/section/:name"
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
        </Routes>
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
                  Which section does this file contain?
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

            {selectedItem.status === 'pending' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Inspection Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    rows="3"
                    className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Add any notes about this inspection..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      const notes = document.getElementById('notes').value;
                      handleInspection(selectedItem, 'pass', notes);
                    }}
                    className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-bold text-lg shadow-lg transition"
                  >
                    <CheckCircle size={24} />
                    PASS
                  </button>
                  <button
                    onClick={() => {
                      const notes = document.getElementById('notes').value;
                      handleInspection(selectedItem, 'fail', notes);
                    }}
                    className="bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-bold text-lg shadow-lg transition"
                  >
                    <XCircle size={24} />
                    FAIL
                  </button>
                </div>
              </div>
            )}

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
    </div>
  );
}

export default App;
