'use client';

import { useState } from 'react';
import { AVAILABLE_COLUMNS, DEFAULT_COLUMNS } from '@/lib/export-utils';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: { lead_type?: string; status?: string; max_distance?: number };
  totalLeads: number;
  filteredLeadsCount: number;
}

export default function ExportDialog({
  isOpen,
  onClose,
  currentFilters,
  totalLeads,
  filteredLeadsCount,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'json'>('csv');
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [exporting, setExporting] = useState(false);

  const hasActiveFilters =
    currentFilters.lead_type || currentFilters.status || currentFilters.max_distance;

  if (!isOpen) return null;

  const handleColumnToggle = (columnKey: string) => {
    const column = AVAILABLE_COLUMNS.find(c => c.key === columnKey);
    if (column?.required) return; // Can't toggle required columns

    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(c => c !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleSelectAll = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.map(c => c.key));
  };

  const handleDeselectAll = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.filter(c => c.required).map(c => c.key));
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      // Build query params
      const params = new URLSearchParams();
      params.set('format', format);
      params.set('columns', selectedColumns.join(','));

      // Add filters only if exporting filtered results
      if (scope === 'filtered') {
        if (currentFilters.lead_type) {
          params.set('lead_type', currentFilters.lead_type);
        }
        if (currentFilters.status) {
          params.set('status', currentFilters.status);
        }
        if (currentFilters.max_distance) {
          params.set('max_distance', currentFilters.max_distance.toString());
        }
      }

      // Fetch export
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`/api/export?${params.toString()}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No leads match the current filters. Try exporting all leads instead.');
        }
        throw new Error('Failed to export leads');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mayday-leads-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Close dialog on success
      onClose();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        alert('Export timed out. Try filtering to reduce the number of leads.');
      } else {
        alert((error as Error).message || 'Failed to export leads');
      }
    } finally {
      setExporting(false);
    }
  };

  const leadsToExport = scope === 'filtered' ? filteredLeadsCount : totalLeads;
  const canExport = leadsToExport > 0 && selectedColumns.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Export Leads</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-6">
          {/* Format Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Export Format</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  className="mr-2"
                />
                <span className="text-sm">CSV (Comma-Separated Values)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={() => setFormat('xlsx')}
                  className="mr-2"
                />
                <span className="text-sm">Excel (XLSX)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={format === 'json'}
                  onChange={() => setFormat('json')}
                  className="mr-2"
                />
                <span className="text-sm">JSON</span>
              </label>
            </div>
          </div>

          {/* Scope Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Export Scope</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scope"
                  value="filtered"
                  checked={scope === 'filtered'}
                  onChange={() => setScope('filtered')}
                  className="mr-2"
                  disabled={!hasActiveFilters}
                />
                <span className={`text-sm ${!hasActiveFilters ? 'text-gray-400' : ''}`}>
                  Export filtered results ({filteredLeadsCount} leads)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scope"
                  value="all"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="mr-2"
                />
                <span className="text-sm">Export all leads ({totalLeads} leads)</span>
              </label>
            </div>
            {!hasActiveFilters && (
              <p className="text-xs text-gray-500 mt-2">
                No filters are currently active. Only &quot;Export all&quot; is available.
              </p>
            )}
          </div>

          {/* Column Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Columns to Export</h3>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded p-3">
              {AVAILABLE_COLUMNS.map(column => (
                <label
                  key={column.key}
                  className={`flex items-center ${column.required ? 'text-gray-500' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.key)}
                    onChange={() => handleColumnToggle(column.key)}
                    disabled={column.required}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    {column.label}
                    {column.required && <span className="text-xs ml-1">(required)</span>}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {selectedColumns.length} of {AVAILABLE_COLUMNS.length} columns selected
            </p>
          </div>

          {/* Warning if no leads to export */}
          {leadsToExport === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                No leads match the current filters. Please select &quot;Export all leads&quot; or adjust your
                filters.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!canExport || exporting}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded text-sm font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : `Export ${leadsToExport} Leads`}
          </button>
        </div>
      </div>
    </div>
  );
}
