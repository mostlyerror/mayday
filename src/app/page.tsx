'use client';

import { useState, useEffect, useCallback } from 'react';

interface Lead {
  place_id: string;
  name: string;
  phone?: string;
  address?: string;
  website_url?: string;
  category?: string;
  status: string;
  status_detail?: string;
  lead_type?: string;
  days_down?: number;
  distance_miles?: number;
  review_count: number;
  rating?: number;
  social_links?: string;
  tracking_status?: string;
  notes?: string;
}

interface Stats {
  totalBusinesses: number;
  byStatus: Record<string, number>;
  byLeadType: Record<string, number>;
  hotLeads: number;
  apiUsage: {
    today: { calls: number; cost: number };
    thisMonth: { calls: number; cost: number };
    monthlyBudget: number;
    remainingBudget: number;
  };
  recentScans: Array<{
    id: number;
    started_at: string;
    completed_at: string;
    businesses_scanned: number;
    new_leads_found: number;
  }>;
}

interface ScanProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  currentZip?: string;
  businessesScanned: number;
  newLeadsFound: number;
  apiCallsUsed: number;
  error?: string;
}

const STATUS_COLORS: Record<string, string> = {
  up: 'bg-green-100 text-green-800',
  http_4xx: 'bg-red-100 text-red-800',
  http_5xx: 'bg-red-100 text-red-800',
  timeout: 'bg-orange-100 text-orange-800',
  ssl_expired: 'bg-red-100 text-red-800',
  ssl_invalid: 'bg-red-100 text-red-800',
  connection_refused: 'bg-red-100 text-red-800',
  dns_failure: 'bg-red-100 text-red-800',
  hosting_expired: 'bg-red-100 text-red-800',
  parked: 'bg-yellow-100 text-yellow-800',
  redirect_social: 'bg-blue-100 text-blue-800',
  no_website: 'bg-gray-100 text-gray-800',
};

const LEAD_TYPE_LABELS: Record<string, string> = {
  fix: '🔧 Fix',
  build: '🏗️ Build',
  social_only: '📱 Social Only',
};

const TRACKING_STATUSES = ['new', 'contacted', 'responded', 'closed_won', 'closed_lost', 'dismissed'];

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads'>('dashboard');
  const [filters, setFilters] = useState({ lead_type: '', status: '', max_distance: '' });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.lead_type) params.set('lead_type', filters.lead_type);
      if (filters.status) params.set('status', filters.status);
      if (filters.max_distance) params.set('max_distance', filters.max_distance);
      
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    }
  }, [filters]);

  const fetchScanProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/scan');
      const data = await res.json();
      setScanProgress(data);
      return data;
    } catch (error) {
      console.error('Failed to fetch scan progress:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLeads(), fetchScanProgress()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchLeads, fetchScanProgress]);

  useEffect(() => {
    fetchLeads();
  }, [filters, fetchLeads]);

  // Poll scan progress while running
  useEffect(() => {
    if (scanProgress?.status !== 'running') return;
    
    const interval = setInterval(async () => {
      const progress = await fetchScanProgress();
      if (progress?.status !== 'running') {
        fetchStats();
        fetchLeads();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [scanProgress?.status, fetchScanProgress, fetchStats, fetchLeads]);

  const startScan = async (type: 'new' | 'rescan') => {
    try {
      await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, maxBusinesses: 50 })
      });
      fetchScanProgress();
    } catch (error) {
      console.error('Failed to start scan:', error);
    }
  };

  const updateLeadStatus = async (placeId: string, status: string) => {
    try {
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: placeId, tracking_status: status })
      });
      fetchLeads();
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🚨 Mayday</h1>
        <p className="text-gray-600 mt-1">Broken Website Lead Finder</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'leads'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Leads ({leads.length})
          </button>
        </nav>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Scan Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Scan Controls</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => startScan('new')}
                disabled={scanProgress?.status === 'running'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Run New Scan
              </button>
              <button
                onClick={() => startScan('rescan')}
                disabled={scanProgress?.status === 'running'}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rescan Due Businesses
              </button>
              {scanProgress?.status === 'running' && (
                <div className="flex items-center gap-2 text-blue-600">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>
                    Scanning... {scanProgress.businessesScanned} businesses, {scanProgress.newLeadsFound} leads
                  </span>
                </div>
              )}
              {scanProgress?.status === 'completed' && (
                <span className="text-green-600">✓ Scan completed</span>
              )}
              {scanProgress?.status === 'error' && (
                <span className="text-red-600">✗ Error: {scanProgress.error}</span>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500">Total Businesses</div>
              <div className="text-2xl font-bold">{stats?.totalBusinesses || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500">🔥 Hot Leads (7 days)</div>
              <div className="text-2xl font-bold text-red-600">{stats?.hotLeads || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500">API Cost This Month</div>
              <div className="text-2xl font-bold">${stats?.apiUsage?.thisMonth?.cost?.toFixed(2) || '0.00'}</div>
              <div className="text-xs text-gray-400">
                ${stats?.apiUsage?.remainingBudget?.toFixed(2)} remaining
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500">API Calls Today</div>
              <div className="text-2xl font-bold">{stats?.apiUsage?.today?.calls || 0}</div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">By Status</h3>
              <div className="space-y-2">
                {Object.entries(stats?.byStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100'}`}>
                      {status}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
                {Object.keys(stats?.byStatus || {}).length === 0 && (
                  <div className="text-gray-500 text-sm">No data yet. Run a scan to get started.</div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">By Lead Type</h3>
              <div className="space-y-2">
                {Object.entries(stats?.byLeadType || {}).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span>{LEAD_TYPE_LABELS[type] || type}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
                {Object.keys(stats?.byLeadType || {}).length === 0 && (
                  <div className="text-gray-500 text-sm">No leads yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Scans */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Scans</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Businesses</th>
                    <th className="text-left py-2">New Leads</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentScans?.map(scan => (
                    <tr key={scan.id} className="border-b">
                      <td className="py-2">{new Date(scan.started_at).toLocaleString()}</td>
                      <td className="py-2">{scan.businesses_scanned}</td>
                      <td className="py-2">{scan.new_leads_found}</td>
                      <td className="py-2">
                        {scan.completed_at ? (
                          <span className="text-green-600">Completed</span>
                        ) : (
                          <span className="text-yellow-600">In Progress</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!stats?.recentScans || stats.recentScans.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500">
                        No scans yet. Run a scan to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Lead Type</label>
                <select
                  value={filters.lead_type}
                  onChange={e => setFilters(f => ({ ...f, lead_type: e.target.value }))}
                  className="border rounded px-3 py-1.5 text-sm"
                >
                  <option value="">All</option>
                  <option value="fix">Fix</option>
                  <option value="build">Build</option>
                  <option value="social_only">Social Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="border rounded px-3 py-1.5 text-sm"
                >
                  <option value="">All</option>
                  <option value="http_4xx">HTTP 4xx</option>
                  <option value="http_5xx">HTTP 5xx</option>
                  <option value="timeout">Timeout</option>
                  <option value="dns_failure">DNS Failure</option>
                  <option value="hosting_expired">Hosting Expired</option>
                  <option value="parked">Parked</option>
                  <option value="no_website">No Website</option>
                  <option value="redirect_social">Social Redirect</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Distance (mi)</label>
                <input
                  type="number"
                  value={filters.max_distance}
                  onChange={e => setFilters(f => ({ ...f, max_distance: e.target.value }))}
                  placeholder="Any"
                  className="border rounded px-3 py-1.5 text-sm w-24"
                />
              </div>
              <div className="ml-auto">
                <a
                  href={`/api/export?lead_type=${filters.lead_type}`}
                  className="px-4 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Export CSV
                </a>
              </div>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Business</th>
                    <th className="text-left px-4 py-3 font-medium">Contact</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Lead Type</th>
                    <th className="text-left px-4 py-3 font-medium">Distance</th>
                    <th className="text-left px-4 py-3 font-medium">Days Down</th>
                    <th className="text-left px-4 py-3 font-medium">Tracking</th>
                    <th className="text-left px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map(lead => (
                    <tr key={lead.place_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-gray-500">{lead.category}</div>
                        <div className="text-xs text-gray-400">
                          ⭐ {lead.rating || 'N/A'} ({lead.review_count} reviews)
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{lead.phone || 'No phone'}</div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">{lead.address}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
                          {lead.status}
                        </span>
                        {lead.status_detail && (
                          <div className="text-xs text-gray-500 mt-1">{lead.status_detail}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{LEAD_TYPE_LABELS[lead.lead_type || ''] || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {lead.distance_miles ? `${lead.distance_miles.toFixed(1)} mi` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {lead.days_down !== undefined && lead.days_down !== null ? (
                          <span className={lead.days_down <= 7 ? 'text-red-600 font-medium' : ''}>
                            {lead.days_down}d {lead.days_down <= 7 && '🔥'}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.tracking_status || 'new'}
                          onChange={e => updateLeadStatus(lead.place_id, e.target.value)}
                          className="text-xs border rounded px-2 py-1"
                        >
                          {TRACKING_STATUSES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {lead.website_url && (
                            <a
                              href={lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Website
                            </a>
                          )}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name + ' ' + (lead.address || ''))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Maps
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No leads found. Run a scan or adjust filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
