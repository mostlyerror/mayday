'use client';

import { useState, useEffect } from 'react';

interface Lead {
  place_id: string;
  name: string;
  phone?: string;
  address?: string;
  website_url?: string;
  status: string;
  status_detail?: string;
  lead_type?: string;
  days_down?: number;
}

interface Stats {
  totalBusinesses: number;
  byLeadType: Record<string, number>;
  hotLeads: number;
}

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    businessesScanned: number;
    newLeadsFound: number;
    apiCallsUsed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [statsRes, leadsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/leads')
      ]);

      const statsData = await statsRes.json();
      const leadsData = await leadsRes.json();

      setStats(statsData);
      setLeads(leadsData.leads || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const runScan = async () => {
    setError(null);
    setScanning(true);
    setScanProgress(null);

    try {
      // Start the scan
      await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxBusinesses: 60 })
      });

      // Poll for progress
      let attempts = 0;
      const maxAttempts = 300; // 5 minutes max

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          const progressRes = await fetch('/api/scan');
          if (!progressRes.ok) {
            // If we get a 404 or other error during recompilation, just retry
            attempts++;
            continue;
          }

          const progress = await progressRes.json();

          // Update progress display
          setScanProgress({
            businessesScanned: progress.businessesScanned || 0,
            newLeadsFound: progress.newLeadsFound || 0,
            apiCallsUsed: progress.apiCallsUsed || 0
          });

          if (progress.status === 'completed') {
            await loadData(); // Refresh data
            break;
          }
          if (progress.status === 'error') {
            throw new Error(progress.error || 'Scan failed');
          }
        } catch {
          // If JSON parsing fails (e.g., during recompilation), just retry
          console.warn('Failed to parse scan progress, retrying...');
        }

        attempts++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      setError(message);
    } finally {
      setScanning(false);
      setScanProgress(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">🚨 Mayday - Broken Website Lead Finder</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Total Businesses</div>
          <div className="text-2xl font-bold">{stats?.totalBusinesses || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">🔥 Hot Leads</div>
          <div className="text-2xl font-bold text-red-600">{stats?.hotLeads || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Lead Types</div>
          <div className="text-sm space-y-1 mt-2">
            {Object.entries(stats?.byLeadType || {}).map(([type, count]) => (
              <div key={type} className="flex justify-between">
                <span>{type}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scan Controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Scan Controls</h2>
        <button
          onClick={runScan}
          disabled={scanning}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {scanning && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {scanning ? 'Scanning...' : 'Run Scan'}
        </button>

        {scanning && scanProgress && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-blue-600 font-medium">Businesses Scanned:</span>
                <span className="ml-2 font-bold text-blue-900">{scanProgress.businessesScanned}</span>
              </div>
              <div>
                <span className="text-blue-600 font-medium">New Leads:</span>
                <span className="ml-2 font-bold text-blue-900">{scanProgress.newLeadsFound}</span>
              </div>
              <div>
                <span className="text-blue-600 font-medium">API Calls:</span>
                <span className="ml-2 font-bold text-blue-900">{scanProgress.apiCallsUsed}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Down</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.place_id}>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 min-w-[150px]">{lead.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500 min-w-[200px]">{lead.phone || 'N/A'}</div>
                  <div className="text-sm text-gray-400">{lead.address}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 whitespace-nowrap">
                    {lead.status}
                  </span>
                  {lead.status_detail && (
                    <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">{lead.status_detail}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {lead.lead_type || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {lead.days_down !== undefined ? `${lead.days_down}d` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {lead.website_url && (
                    <a
                      href={lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Visit
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <div className="text-lg mb-2">No leads yet</div>
                  <div className="text-sm">Click &quot;Run Scan&quot; to find businesses with broken websites</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
