import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Search, Upload, CheckCircle, XCircle, Circle, Download, Filter, Edit2, Save, X, Menu, ScanLine, Plus, Clock, Play, Pause, StopCircle, LogOut, Camera, Calendar } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './Login';
import BarcodeScanner from './BarcodeScanner';

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
    
    reader.onload = async (event) => {
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
    const searchValue = scanInput.trim().toLowerCase();

    if (!searchValue) return;

    const found = extinguishers.find(item =>
      item.assetId.toLowerCase() === searchValue ||
      item.serial.toLowerCase() === searchValue ||
      item.assetId.toLowerCase().includes(searchValue) ||
      item.serial.toLowerCase().includes(searchValue)
    );

    if (found) {
      setSelectedItem(found);
      setScanInput('');
      setScanMode(false);
    } else {
      alert(`No fire extinguisher found matching: ${scanInput}`);
      setScanInput('');
    }
  };

  const handleCameraScan = (scannedText) => {
    const searchValue = scannedText.trim().toLowerCase();

    const found = extinguishers.find(item =>
      item.assetId.toLowerCase() === searchValue ||
      item.serial.toLowerCase() === searchValue ||
      item.assetId.toLowerCase().includes(searchValue) ||
      item.serial.toLowerCase().includes(searchValue)
    );

    setShowCameraScanner(false);

    if (found) {
      setSelectedItem(found);
    } else {
      alert(`No fire extinguisher found matching: ${scannedText}`);
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

  const resetMonthlyStatus = async () => {
    if (!window.confirm('Are you sure you want to reset all fire extinguisher statuses to "pending"? This will clear all inspection data for the monthly cycle. This action cannot be undone.')) {
      return;
    }

    try {
      const extinguishersQuery = query(
        collection(db, 'extinguishers'),
        where('userId', '==', user.uid)
      );

      const snapshot = await getDocs(extinguishersQuery);
      const updatePromises = snapshot.docs.map(docSnapshot => {
        const docRef = doc(db, 'extinguishers', docSnapshot.id);
        return updateDoc(docRef, {
          status: 'pending',
          checkedDate: null,
          notes: '',
          lastMonthlyReset: new Date().toISOString()
        });
      });

      await Promise.all(updatePromises);
      alert(`Successfully reset ${snapshot.docs.length} fire extinguishers for the new monthly cycle.`);

    } catch (error) {
      console.error('Error resetting monthly status:', error);
      alert('Error resetting monthly status. Please try again.');
    }
  };

  const filteredItems = extinguishers.filter(item => {
    const matchesSection = item.section === selectedSection;
    const matchesView = view === 'pending' ? item.status === 'pending' :
                       view === 'pass' ? item.status === 'pass' :
                       view === 'fail' ? item.status === 'fail' : true;
    const matchesSearch = searchTerm === '' || 
      item.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vicinity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serial.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSection && matchesView && matchesSearch;
  });

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
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-blue-600 text-white p-6 rounded-lg shadow-lg mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Brookwood Hospital</h1>
              <h2 className="text-xl mb-2">Fire Extinguisher Tracker</h2>
              <p className="text-sm opacity-90">
                Logged in as: {user.email}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-blue-700 rounded flex items-center gap-2"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-blue-700 rounded"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>

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

        {showMenu && (
          <div className="bg-white p-4 rounded-lg shadow-lg mb-6">
            <div className="space-y-2">
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
              <button
                onClick={resetMonthlyStatus}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition w-full"
              >
                <Calendar size={20} />
                Monthly Reset
              </button>
              <button
                onClick={clearAllData}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition w-full"
              >
                Clear All Data
              </button>
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
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h3 className="font-semibold text-lg">Section Filter</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
        </div>

        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap gap-4 items-center mb-4">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setView('pending')}
                className={`px-4 py-2 rounded ${
                  view === 'pending' ? 'bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setView('pass')}
                className={`px-4 py-2 rounded ${
                  view === 'pass' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Passed
              </button>
              <button
                onClick={() => setView('fail')}
                className={`px-4 py-2 rounded ${
                  view === 'fail' ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Failed
              </button>
              <button
                onClick={() => setView('all')}
                className={`px-4 py-2 rounded ${
                  view === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                All
              </button>
            </div>
          </div>
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

        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
              {extinguishers.length === 0
                ? 'No data yet. Import a file or add fire extinguishers manually to get started.'
                : `No items found.`}
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {item.status === 'pass' && <CheckCircle size={24} className="text-green-500" />}
                    {item.status === 'fail' && <XCircle size={24} className="text-red-500" />}
                    {item.status === 'pending' && <Circle size={24} className="text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-sm text-gray-500 uppercase font-medium">Asset ID</div>
                        <div className="font-bold text-2xl">{item.assetId}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(item);
                        }}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <Edit2 size={20} className="text-gray-600" />
                      </button>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm text-gray-500 font-medium">Building/Section</div>
                      <div className="font-semibold text-lg text-blue-600">{item.section}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="text-sm text-gray-500 font-medium">Serial Number</div>
                        <div className="font-mono text-base font-medium">{item.serial}</div>
                      </div>
                      {item.checkedDate && (
                        <div>
                          <div className="text-sm text-gray-500 font-medium">Last Checked</div>
                          <div className="text-base font-medium">{new Date(item.checkedDate).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>

                    <div className="mb-2">
                      <div className="text-sm text-gray-500 font-medium">Location</div>
                      <div className="text-base font-medium text-gray-700">{item.vicinity}</div>
                      {item.parentLocation && (
                        <div className="text-sm text-gray-600">{item.parentLocation}</div>
                      )}
                    </div>
                    {item.notes && (
                      <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded mt-2">
                        <strong>Notes:</strong> {item.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
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

      <BarcodeScanner
        isOpen={showCameraScanner}
        onScan={handleCameraScan}
        onClose={() => setShowCameraScanner(false)}
      />

      {selectedItem && !editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Inspect Fire Extinguisher</h3>
              <button onClick={() => setSelectedItem(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Asset ID</div>
                  <div className="font-semibold text-xl">{selectedItem.assetId}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Serial Number</div>
                  <div className="font-mono">{selectedItem.serial}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Location</div>
                <div className="font-medium">{selectedItem.vicinity}</div>
                <div className="text-sm text-gray-600">{selectedItem.parentLocation}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Section</div>
                <div className="font-medium">{selectedItem.section}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-2">Current Status</div>
                <div className="flex items-center gap-2">
                  {selectedItem.status === 'pass' && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">PASSED</span>
                  )}
                  {selectedItem.status === 'fail' && (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full">FAILED</span>
                  )}
                  {selectedItem.status === 'pending' && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">PENDING</span>
                  )}
                  {selectedItem.status !== 'pending' && (
                    <button
                      onClick={() => resetStatus(selectedItem)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Reset Status
                    </button>
                  )}
                </div>
              </div>

              {selectedItem.inspectionHistory && selectedItem.inspectionHistory.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">Inspection History</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedItem.inspectionHistory.map((hist, idx) => (
                      <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                        <div className="flex justify-between">
                          <span className={hist.status === 'pass' ? 'text-green-600' : 'text-red-600'}>
                            {hist.status.toUpperCase()}
                          </span>
                          <span className="text-gray-500">
                            {new Date(hist.date).toLocaleString()}
                          </span>
                        </div>
                        {hist.notes && <div className="text-gray-600 mt-1">{hist.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedItem.status === 'pending' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inspection Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    rows="3"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="Add any notes about this inspection..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      const notes = document.getElementById('notes').value;
                      handleInspection(selectedItem, 'pass', notes);
                    }}
                    className="bg-green-500 text-white p-4 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={24} />
                    PASS
                  </button>
                  <button
                    onClick={() => {
                      const notes = document.getElementById('notes').value;
                      handleInspection(selectedItem, 'fail', notes);
                    }}
                    className="bg-red-500 text-white p-4 rounded-lg hover:bg-red-600 flex items-center justify-center gap-2"
                  >
                    <XCircle size={24} />
                    FAIL
                  </button>
                </div>
              </div>
            )}
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
