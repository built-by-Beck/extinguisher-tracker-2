import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, X, Trash2, Type, CheckSquare, GripVertical } from 'lucide-react';

export default function CustomAssetTable({ user, workspaceId, tab, onUpdateTab }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');
  const [newAssetName, setNewAssetName] = useState('');
  const [showDeleteColumnConfirm, setShowDeleteColumnConfirm] = useState(null);

  // Editing state
  const [editingCell, setEditingCell] = useState(null); // { rowId, columnId }
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef(null);

  // Load rows from Firestore
  useEffect(() => {
    if (!tab?.id) {
      setRows([]);
      setLoading(false);
      return;
    }

    const rowsQuery = query(
      collection(db, 'customAssetRows'),
      where('tabId', '==', tab.id),
      where('userId', '==', user.uid),
      where('workspaceId', '==', workspaceId)
    );

    const unsubscribe = onSnapshot(rowsQuery, (snapshot) => {
      const rowData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.order - b.order);
      setRows(rowData);
      setLoading(false);
    }, (error) => {
      console.error('Custom asset rows listener error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tab?.id, user.uid, workspaceId]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingCell]);

  // Add new column
  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;

    const newColumn = {
      id: `col_${Date.now()}`,
      name: newColumnName.trim(),
      type: newColumnType,
      order: (tab.columns || []).length
    };

    try {
      await onUpdateTab({
        columns: [...(tab.columns || []), newColumn]
      });
      setNewColumnName('');
      setNewColumnType('text');
      setShowAddColumnModal(false);
    } catch (error) {
      console.error('Failed to add column:', error);
      alert('Failed to add column. Please try again.');
    }
  };

  // Delete column
  const handleDeleteColumn = async (columnId) => {
    try {
      const updatedColumns = tab.columns.filter(c => c.id !== columnId);
      await onUpdateTab({ columns: updatedColumns });
      setShowDeleteColumnConfirm(null);
    } catch (error) {
      console.error('Failed to delete column:', error);
      alert('Failed to delete column. Please try again.');
    }
  };

  // Add new row
  const handleAddRow = async () => {
    if (!newAssetName.trim()) return;

    try {
      const newRow = {
        userId: user.uid,
        workspaceId: workspaceId,
        tabId: tab.id,
        assetName: newAssetName.trim(),
        order: rows.length,
        createdAt: new Date().toISOString(),
        values: {}
      };

      await addDoc(collection(db, 'customAssetRows'), newRow);
      setNewAssetName('');
      setShowAddAssetModal(false);
    } catch (error) {
      console.error('Failed to add row:', error);
      alert('Failed to add asset. Please try again.');
    }
  };

  // Delete row
  const handleDeleteRow = async (rowId) => {
    if (!window.confirm('Delete this asset?')) return;

    try {
      await deleteDoc(doc(db, 'customAssetRows', rowId));
    } catch (error) {
      console.error('Failed to delete row:', error);
      alert('Failed to delete asset. Please try again.');
    }
  };

  // Update cell value
  const handleUpdateCell = async (rowId, columnId, value) => {
    try {
      const row = rows.find(r => r.id === rowId);
      const updatedValues = {
        ...row.values,
        [columnId]: value
      };

      await updateDoc(doc(db, 'customAssetRows', rowId), {
        values: updatedValues,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update cell:', error);
    }
  };

  // Update asset name
  const handleUpdateAssetName = async (rowId, newName) => {
    if (!newName.trim()) return;

    try {
      await updateDoc(doc(db, 'customAssetRows', rowId), {
        assetName: newName.trim(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update asset name:', error);
    }
  };

  // Handle checkbox toggle
  const handleCheckboxToggle = async (rowId, columnId, currentValue) => {
    await handleUpdateCell(rowId, columnId, !currentValue);
  };

  // Start editing a cell
  const startEditing = (rowId, columnId, currentValue) => {
    setEditingCell({ rowId, columnId });
    setEditValue(currentValue || '');
  };

  // Save edit and close
  const saveEdit = async () => {
    if (editingCell) {
      if (editingCell.columnId === 'assetName') {
        await handleUpdateAssetName(editingCell.rowId, editValue);
      } else {
        await handleUpdateCell(editingCell.rowId, editingCell.columnId, editValue);
      }
      setEditingCell(null);
      setEditValue('');
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const columns = tab.columns || [];

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400">
        Loading assets...
      </div>
    );
  }

  return (
    <div>
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setShowAddAssetModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus size={16} />
          Add Asset
        </button>
        <button
          onClick={() => { setNewColumnType('text'); setShowAddColumnModal(true); }}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium flex items-center gap-2"
        >
          <Type size={16} />
          Add Column
        </button>
        <button
          onClick={() => { setNewColumnType('checkbox'); setShowAddColumnModal(true); }}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium flex items-center gap-2"
        >
          <CheckSquare size={16} />
          Add Checkbox Column
        </button>
      </div>

      {/* Table */}
      {rows.length === 0 && columns.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="text-gray-400 mb-4">No assets or columns yet</div>
          <div className="text-gray-500 text-sm">
            Click "Add Asset" to create your first asset, then add columns to track data.
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-gray-800/50 rounded-lg border border-gray-700">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left font-semibold text-gray-300 bg-gray-800/80 sticky left-0 min-w-[150px]">
                  Asset Name
                </th>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className="px-4 py-3 text-left font-semibold text-gray-300 bg-gray-800/80 min-w-[120px] relative group"
                  >
                    <div className="flex items-center gap-2">
                      {col.type === 'checkbox' ? (
                        <CheckSquare size={14} className="text-gray-500" />
                      ) : (
                        <Type size={14} className="text-gray-500" />
                      )}
                      {col.name}
                      <button
                        onClick={() => setShowDeleteColumnConfirm(col.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600 rounded text-gray-400 hover:text-white transition-opacity"
                        title="Delete column"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold text-gray-300 bg-gray-800/80 w-16">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${
                    rowIndex % 2 === 0 ? 'bg-gray-800/20' : ''
                  }`}
                >
                  {/* Asset Name Cell */}
                  <td className="px-4 py-3 sticky left-0 bg-gray-800/90">
                    {editingCell?.rowId === row.id && editingCell?.columnId === 'assetName' ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded border border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <div
                        onClick={() => startEditing(row.id, 'assetName', row.assetName)}
                        className="cursor-pointer hover:text-blue-400 font-medium"
                      >
                        {row.assetName || <span className="text-gray-500 italic">Click to edit</span>}
                      </div>
                    )}
                  </td>

                  {/* Dynamic Columns */}
                  {columns.map((col) => (
                    <td key={col.id} className="px-4 py-3">
                      {col.type === 'checkbox' ? (
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={row.values?.[col.id] || false}
                            onChange={() => handleCheckboxToggle(row.id, col.id, row.values?.[col.id])}
                            className="w-5 h-5 rounded border-gray-500 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                      ) : editingCell?.rowId === row.id && editingCell?.columnId === col.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="w-full bg-gray-700 text-white px-2 py-1 rounded border border-blue-500 focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => startEditing(row.id, col.id, row.values?.[col.id])}
                          className="cursor-pointer hover:text-blue-400 min-h-[24px]"
                        >
                          {row.values?.[col.id] || <span className="text-gray-500 italic text-sm">-</span>}
                        </div>
                      )}
                    </td>
                  ))}

                  {/* Actions Cell */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="p-2 hover:bg-red-600 rounded text-gray-400 hover:text-white"
                      title="Delete asset"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {rows.length > 0 && (
        <div className="mt-4 text-sm text-gray-400">
          {rows.length} asset{rows.length !== 1 ? 's' : ''} • {columns.length} column{columns.length !== 1 ? 's' : ''}
          {columns.filter(c => c.type === 'checkbox').length > 0 && (
            <span className="ml-4">
              {rows.filter(r =>
                columns.filter(c => c.type === 'checkbox').every(c => r.values?.[c.id])
              ).length} / {rows.length} complete
            </span>
          )}
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddAssetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Add Asset</h3>
              <button onClick={() => { setShowAddAssetModal(false); setNewAssetName(''); }}>
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            <input
              type="text"
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddRow(); }}
              placeholder="e.g., Elevator #1, Unit A-101"
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-gray-800"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowAddAssetModal(false); setNewAssetName(''); }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRow}
                disabled={!newAssetName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                Add {newColumnType === 'checkbox' ? 'Checkbox' : 'Text'} Column
              </h3>
              <button onClick={() => { setShowAddColumnModal(false); setNewColumnName(''); }}>
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 text-gray-600">
                {newColumnType === 'checkbox' ? (
                  <>
                    <CheckSquare size={18} />
                    <span>Checkbox column for pass/fail tracking</span>
                  </>
                ) : (
                  <>
                    <Type size={18} />
                    <span>Text column for notes or details</span>
                  </>
                )}
              </div>
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); }}
                placeholder={newColumnType === 'checkbox' ? 'e.g., Inspected, Passed' : 'e.g., Notes, Location'}
                className="w-full p-3 border border-gray-300 rounded-lg text-gray-800"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowAddColumnModal(false); setNewColumnName(''); }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                disabled={!newColumnName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Column Confirmation Modal */}
      {showDeleteColumnConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Delete Column?</h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete the "{columns.find(c => c.id === showDeleteColumnConfirm)?.name}" column and all its data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteColumnConfirm(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteColumn(showDeleteColumnConfirm)}
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
