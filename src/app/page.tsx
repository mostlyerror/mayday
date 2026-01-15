'use client';

import { useState, useEffect } from 'react';
import { COSTS } from '@/lib/constants';

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
  apiUsage?: {
    today: { calls: number; cost: number };
    thisMonth: { calls: number; cost: number };
    total: { calls: number; cost: number };
    monthlyBudget: number;
    remainingBudget: number;
  };
}

interface Config {
  center: {
    lat: number;
    lng: number;
    label: string;
  };
  radius_miles: number;
  monthly_budget_usd: number;
}

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    businessesScanned: number;
    newLeadsFound: number;
    apiCallsUsed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, leadsRes, configRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/leads'),
        fetch('/api/config')
      ]);

      const statsData = await statsRes.json();
      const leadsData = await leadsRes.json();
      const configData = await configRes.json();

      setStats(statsData);
      setLeads(leadsData.leads || []);
      setConfig(configData);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="text-3xl">🚨</div>
                <h1 className="text-3xl font-bold text-white">Mayday</h1>
              </div>
              <p className="text-slate-400 text-sm ml-12">Emergency Website Lead Finder</p>
            </div>

            {/* Toggle button for side panel */}
            <button
              onClick={() => setSidePanelOpen(!sidePanelOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-slate-200">
                {sidePanelOpen ? 'Hide' : 'Show'} Guide
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="flex gap-6">
          {/* Main content */}
          <div className={`flex-1 transition-all ${sidePanelOpen ? 'max-w-4xl' : 'max-w-full'}`}>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Businesses</div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-900">{stats?.totalBusinesses || 0}</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-orange-100 uppercase tracking-wide">Hot Leads</div>
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{stats?.hotLeads || 0}</div>
            <div className="text-orange-100 text-sm font-medium">Urgent opportunities</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Lead Types</div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(stats?.byLeadType || {}).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600 capitalize">{type}</span>
                <span className="text-lg font-bold text-gray-900">{count}</span>
              </div>
            ))}
            {Object.keys(stats?.byLeadType || {}).length === 0 && (
              <div className="text-sm text-gray-400 italic">No leads yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Scan Controls */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Scan Controls</h2>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {showConfig ? 'Hide' : 'Show'} Configuration
          </button>
          {scanning && (
            <span className="flex items-center gap-2 text-sm text-orange-600 font-medium">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              Scan in progress
            </span>
          )}
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
        >
          {scanning ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Scanning...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Run Scan
            </>
          )}
        </button>

        {scanning && scanProgress && (
          <div className="mt-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-orange-600 font-medium mb-1">Businesses Scanned</div>
                <div className="text-2xl font-bold text-orange-900">{scanProgress.businessesScanned}</div>
              </div>
              <div>
                <div className="text-orange-600 font-medium mb-1">New Leads</div>
                <div className="text-2xl font-bold text-orange-900">{scanProgress.newLeadsFound}</div>
              </div>
              <div>
                <div className="text-orange-600 font-medium mb-1">API Calls</div>
                <div className="text-2xl font-bold text-orange-900">{scanProgress.apiCallsUsed}</div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Configuration Panel */}
        {showConfig && config && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Location & Radius */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Scan Location</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium text-gray-900">{config.center.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Coordinates:</span>
                    <span className="font-mono text-xs text-gray-700">
                      {config.center.lat.toFixed(4)}, {config.center.lng.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Radius:</span>
                    <span className="font-medium text-gray-900">{config.radius_miles} miles</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-gray-600">
                      Scanning within {config.radius_miles} miles of {config.center.label}
                    </p>
                  </div>
                </div>
              </div>

              {/* Budget & API Costs */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">API Budget</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Budget:</span>
                    <span className="font-medium text-gray-900">${config.monthly_budget_usd}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Used This Month:</span>
                    <span className="font-medium text-gray-900">
                      ${scanProgress ? ((scanProgress.apiCallsUsed * COSTS.textSearch) + (scanProgress.apiCallsUsed * COSTS.placeDetails)).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Remaining:</span>
                    <span className="font-medium text-green-700">
                      ${scanProgress ? (config.monthly_budget_usd - ((scanProgress.apiCallsUsed * COSTS.textSearch) + (scanProgress.apiCallsUsed * COSTS.placeDetails))).toFixed(2) : config.monthly_budget_usd}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Text Search:</span>
                        <span>${COSTS.textSearch.toFixed(3)} per request</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Place Details:</span>
                        <span>${COSTS.placeDetails.toFixed(3)} per request</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity Estimate */}
            <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-gray-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">Monthly Capacity</p>
                  <p className="text-sm text-gray-600">
                    With your ${config.monthly_budget_usd} budget, you can scan approximately{' '}
                    <span className="font-semibold text-gray-900">
                      {Math.floor(config.monthly_budget_usd / ((COSTS.textSearch + COSTS.placeDetails)))} businesses
                    </span>{' '}
                    per month (includes Text Search + Place Details for each business).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {leads.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="max-w-md mx-auto">
              {/* Icon */}
              <div className="mb-6">
                <svg className="mx-auto h-24 w-24 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 0v.01" />
                </svg>
              </div>

              {/* Heading */}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No leads yet
              </h3>

              {/* Description */}
              <p className="text-gray-500 mb-6">
                Start scanning to discover local businesses with broken websites, expired hosting, or no web presence at all.
              </p>

              {/* What to expect */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-medium text-gray-900 mb-3">What you&apos;ll find:</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Fix leads:</strong> Broken sites, expired SSL, server errors</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Build leads:</strong> No website listed on Google</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                      <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                    </svg>
                    <span><strong>Social-only leads:</strong> Website redirects to Facebook/Instagram</span>
                  </li>
                </ul>
              </div>

              {/* CTA Button */}
              <button
                onClick={runScan}
                disabled={scanning}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {scanning ? (
                  <>
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scanning...
                  </>
                ) : (
                  <>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Start Your First Scan
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{lead.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{lead.phone || 'N/A'}</div>
                    <div className="text-sm text-gray-400">{lead.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {lead.status !== 'up' && (
                        <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      {lead.status === 'up' && (
                        <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        lead.status === 'up'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {lead.status}
                      </span>
                    </div>
                    {lead.status_detail && (
                      <div className="text-xs text-gray-500 mt-1">{lead.status_detail}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {lead.lead_type ? (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        lead.lead_type === 'fix'
                          ? 'bg-orange-100 text-orange-800'
                          : lead.lead_type === 'build'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {lead.lead_type}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {lead.days_down !== undefined && lead.days_down > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{lead.days_down}d</span>
                        {lead.days_down > 30 && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {lead.website_url && (
                      <a
                        href={lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-1"
                      >
                        Visit
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
          </div>

          {/* Side Panel */}
          {sidePanelOpen && (
            <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sticky top-8">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Lead Status Guide</h2>
                </div>

                {/* Fix Opportunities */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    Fix Opportunities
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          http_5xx
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs">Server error - site is completely down</p>
                      <p className="text-gray-500 text-xs italic mt-0.5">&quot;Your server crashed, customers see errors&quot;</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          http_4xx
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs">Page not found or access denied</p>
                      <p className="text-gray-500 text-xs italic mt-0.5">&quot;Your site is broken, losing customers&quot;</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          ssl_expired
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs">SSL certificate expired - browser warnings</p>
                      <p className="text-gray-500 text-xs italic mt-0.5">&quot;Your site isn&apos;t secure, scaring customers&quot;</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          ssl_invalid
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs">SSL certificate has issues</p>
                      <p className="text-gray-500 text-xs italic mt-0.5">&quot;Security warnings driving away customers&quot;</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          hosting_expired
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs">Hosting subscription lapsed (Squarespace, Wix)</p>
                      <p className="text-gray-500 text-xs italic mt-0.5">&quot;Your subscription ended, site is offline&quot;</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          parked
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs">Domain parked - no real content</p>
                      <p className="text-gray-500 text-xs italic mt-0.5">&quot;Your domain is wasted, just sitting there&quot;</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          timeout
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs">Site takes too long to load</p>
                      <p className="text-gray-500 text-xs italic mt-0.5">&quot;Customers leaving before site loads&quot;</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          dns_failure
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs">Domain not found - DNS issues</p>
                      <p className="text-gray-500 text-xs italic mt-0.5">&quot;Your domain isn&apos;t working at all&quot;</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          connection_refused
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs">Server refusing connections</p>
                      <p className="text-gray-500 text-xs italic mt-0.5">&quot;Your server is blocking visitors&quot;</p>
                    </div>
                  </div>
                </div>

                {/* Build Opportunities */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    Build Opportunities
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          no_website
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs">No website listed on Google</p>
                      <p className="text-gray-500 text-xs italic mt-0.5">&quot;You need a web presence to compete&quot;</p>
                    </div>
                  </div>
                </div>

                {/* Social-Only Leads */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-purple-600 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    Social-Only Leads
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          redirect_social
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs">Website redirects to Facebook/Instagram</p>
                      <p className="text-gray-500 text-xs italic mt-0.5">&quot;Facebook isn&apos;t enough in 2025&quot;</p>
                    </div>
                  </div>
                </div>

                {/* Working Sites */}
                <div>
                  <h3 className="text-sm font-semibold text-green-600 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    Working Sites
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          up
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs">Site is working properly - not a lead</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Built by{' '}
            <a
              href="https://goodrobotco.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Good Robot Co.
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
