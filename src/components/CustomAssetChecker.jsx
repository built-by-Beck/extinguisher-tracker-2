import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, Plus, X, Trash2, Edit2, Check, CheckSquare, Type } from 'lucide-react';
import CustomAssetTable from './CustomAssetTable';

export default function CustomAssetChecker({ user, currentWorkspaceId }) {
  const navigate = useNavigate();
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [editingTab, setEditingTab] = useState(null);
  const [editTabName, setEditTabName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Load tabs from Firestore
  useEffect(() => {
    if (!user || !currentWorkspaceId) {
      setTabs([]);
      setLoading(false);
      return;
    }

    const tabsQuery = query(
      collection(db, 'customAssetTabs'),
      where('userId', '==', user.uid),
      where('workspaceId', '==', currentWorkspaceId)
    );

    const unsubscribe = onSnapshot(tabsQuery, (snapshot) => {
      const tabData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.order - b.order);
      setTabs(tabData);

      // Auto-select first tab if none selected or current tab was deleted
      if (tabData.length > 0) {
        if (!activeTabId || !tabData.find(t => t.id === activeTabId)) {
          setActiveTabId(tabData[0].id);
        }
      } else {
        setActiveTabId(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Custom asset tabs listener error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentWorkspaceId]);

  // Create new tab
  const handleCreateTab = async () => {
    if (!newTabName.trim()) return;

    try {
      const newTab = {
        userId: user.uid,
        workspaceId: currentWorkspaceId,
        name: newTabName.trim(),
        order: tabs.length,
        createdAt: new Date().toISOString(),
        columns: []
      };

      const docRef = await addDoc(collection(db, 'customAssetTabs'), newTab);
      setActiveTabId(docRef.id);
      setNewTabName('');
      setShowAddTabModal(false);
    } catch (error) {
      console.error('Failed to create tab:', error);
      alert('Failed to create asset type. Please try again.');
    }
  };

  // Update tab name
  const handleUpdateTabName = async () => {
    if (!editingTab || !editTabName.trim()) return;

    try {
      await updateDoc(doc(db, 'customAssetTabs', editingTab), {
        name: editTabName.trim(),
        updatedAt: new Date().toISOString()
      });
      setEditingTab(null);
      setEditTabName('');
    } catch (error) {
      console.error('Failed to update tab:', error);
      alert('Failed to update tab name. Please try again.');
    }
  };

  // Delete tab and all its rows
  const handleDeleteTab = async (tabId) => {
    try {
      // First get all rows in this tab
      const rowsQuery = query(
        collection(db, 'customAssetRows'),
        where('tabId', '==', tabId)
      );

      const snapshot = await getDocs(rowsQuery);

      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.delete(doc(db, 'customAssetRows', d.id));
      });

      // Delete the tab itself
      batch.delete(doc(db, 'customAssetTabs', tabId));

      await batch.commit();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete tab:', error);
      alert('Failed to delete tab. Please try again.');
    }
  };

  // Update tab columns
  const handleUpdateTab = async (tabId, updates) => {
    try {
      await updateDoc(doc(db, 'customAssetTabs', tabId), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update tab:', error);
      throw error;
    }
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 via-gray-900 to-black text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app')}
            className="p-2 hover:bg-gray-700 rounded-lg"
            title="Back to Home"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Custom Asset Checker</h1>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <div key={tab.id} className="relative flex items-center">
              {editingTab === tab.id ? (
                <div className="flex items-center gap-1 bg-gray-700 rounded-lg px-2 py-1">
                  <input
                    type="text"
                    value={editTabName}
                    onChange={(e) => setEditTabName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateTabName();
                      if (e.key === 'Escape') { setEditingTab(null); setEditTabName(''); }
                    }}
                    className="bg-gray-600 text-white px-2 py-1 rounded text-sm w-32"
                    autoFocus
                  />
                  <button
                    onClick={handleUpdateTabName}
                    className="p-1 hover:bg-gray-600 rounded text-green-400"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => { setEditingTab(null); setEditTabName(''); }}
                    className="p-1 hover:bg-gray-600 rounded text-gray-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveTabId(tab.id)}
                  onDoubleClick={() => { setEditingTab(tab.id); setEditTabName(tab.name); }}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTabId === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {tab.name}
                </button>
              )}
              {activeTabId === tab.id && !editingTab && (
                <button
                  onClick={() => setShowDeleteConfirm(tab.id)}
                  className="absolute -top-1 -right-1 p-1 bg-red-600 hover:bg-red-700 rounded-full text-white"
                  title="Delete tab"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setShowAddTabModal(true)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium flex items-center gap-2 text-gray-300 whitespace-nowrap"
          >
            <Plus size={16} />
            Add Tab
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {tabs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">No asset types created yet</div>
            <button
              onClick={() => setShowAddTabModal(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center gap-2 mx-auto"
            >
              <Plus size={20} />
              Create Your First Asset Type
            </button>
          </div>
        ) : activeTab ? (
          <CustomAssetTable
            user={user}
            workspaceId={currentWorkspaceId}
            tab={activeTab}
            onUpdateTab={(updates) => handleUpdateTab(activeTab.id, updates)}
          />
        ) : null}
      </div>

      {/* Add Tab Modal */}
      {showAddTabModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Create New Asset Type</h3>
              <button onClick={() => { setShowAddTabModal(false); setNewTabName(''); }}>
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            <input
              type="text"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTab(); }}
              placeholder="e.g., Elevators, HVAC Units, Fire Doors"
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-gray-800"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowAddTabModal(false); setNewTabName(''); }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTab}
                disabled={!newTabName.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Delete Asset Type?</h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete "{tabs.find(t => t.id === showDeleteConfirm)?.name}" and all its assets. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTab(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
