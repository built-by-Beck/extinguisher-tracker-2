import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';

export default function PrintableExtinguisherList({ extinguishers = [] }) {
  const navigate = useNavigate();

  const rows = useMemo(() => {
    const safe = Array.isArray(extinguishers) ? extinguishers : [];
    const norm = safe.map((it) => ({
      assetId: it.assetId || '',
      serial: it.serial || '',
      section: it.section || '',
      vicinity: it.vicinity || '',
      parentLocation: it.parentLocation || '',
      category: it.category || '',
      status: (it.status || '').toUpperCase(),
      expirationDate: it.expirationDate || '',
      checkedDate: it.checkedDate || it.checkedAt || '',
      checkedBy: it.checkedBy || ''
    }));
    // Sort by Section, then Vicinity, then Asset ID
    norm.sort((a, b) => {
      const sa = String(a.section).localeCompare(String(b.section));
      if (sa !== 0) return sa;
      const va = String(a.vicinity).localeCompare(String(b.vicinity));
      if (va !== 0) return va;
      return String(a.assetId).localeCompare(String(b.assetId), undefined, { numeric: true });
    });
    return norm;
  }, [extinguishers]);

  const formatDate = (d) => {
    if (!d) return '';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return String(d);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Inline print CSS for compact, printer-friendly output */}
      <style>{`
        @page { size: landscape; margin: 0.5in; }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body, html { background: #ffffff !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>

      {/* Controls */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-300">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/app')} className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-100 flex items-center gap-2">
              <ArrowLeft size={18} />
              Back
            </button>
            <h1 className="text-lg font-semibold">Printable List — All Extinguishers</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
              <Printer size={18} />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Header for print */}
      <div className="print-only hidden px-4 pt-2">
        <div className="flex items-baseline justify-between max-w-[1400px] mx-auto">
          <h1 className="text-xl font-bold">Fire Extinguisher Inventory</h1>
          <div className="text-sm">Printed: {new Date().toLocaleString()}</div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-[1400px] mx-auto p-4">
        <div className="text-sm text-gray-700 mb-2">
          Total: {rows.length} extinguishers
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-gray-300" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left w-[110px]">Asset ID</th>
                <th className="border border-gray-300 px-2 py-1 text-left w-[140px]">Serial</th>
                <th className="border border-gray-300 px-2 py-1 text-left w-[160px]">Section</th>
                <th className="border border-gray-300 px-2 py-1 text-left w-[200px]">Vicinity</th>
                <th className="border border-gray-300 px-2 py-1 text-left w-[220px]">Parent Location</th>
                <th className="border border-gray-300 px-2 py-1 text-left w-[120px]">Category</th>
                <th className="border border-gray-300 px-2 py-1 text-left w-[90px]">Status</th>
                <th className="border border-gray-300 px-2 py-1 text-left w-[140px]">Expiration</th>
                <th className="border border-gray-300 px-2 py-1 text-left w-[150px]">Last Check</th>
                <th className="border border-gray-300 px-2 py-1 text-left w-[160px]">Checked By</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-2 py-1 break-words">{r.assetId}</td>
                  <td className="border border-gray-300 px-2 py-1 break-words">{r.serial}</td>
                  <td className="border border-gray-300 px-2 py-1 break-words">{r.section}</td>
                  <td className="border border-gray-300 px-2 py-1 break-words">{r.vicinity}</td>
                  <td className="border border-gray-300 px-2 py-1 break-words">{r.parentLocation}</td>
                  <td className="border border-gray-300 px-2 py-1 break-words">{r.category}</td>
                  <td className="border border-gray-300 px-2 py-1 break-words">{r.status}</td>
                  <td className="border border-gray-300 px-2 py-1 break-words">{formatDate(r.expirationDate)}</td>
                  <td className="border border-gray-300 px-2 py-1 break-words">{formatDate(r.checkedDate)}</td>
                  <td className="border border-gray-300 px-2 py-1 break-words">{r.checkedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="no-print mt-4 text-right">
          <button onClick={() => window.print()} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2">
            <Printer size={18} />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

