import * as XLSX from 'xlsx';

export interface ColumnDefinition {
  key: string;
  label: string;
  required: boolean;
}

export const AVAILABLE_COLUMNS: ColumnDefinition[] = [
  // Required columns
  { key: 'name', label: 'Business Name', required: true },
  { key: 'status', label: 'Status', required: true },
  { key: 'lead_type', label: 'Lead Type', required: true },

  // Optional columns
  { key: 'phone', label: 'Phone', required: false },
  { key: 'address', label: 'Address', required: false },
  { key: 'website_url', label: 'Website URL', required: false },
  { key: 'category', label: 'Category', required: false },
  { key: 'status_detail', label: 'Status Detail', required: false },
  { key: 'days_down', label: 'Days Down', required: false },
  { key: 'distance_miles', label: 'Distance (miles)', required: false },
  { key: 'review_count', label: 'Review Count', required: false },
  { key: 'rating', label: 'Rating', required: false },
  { key: 'social_links', label: 'Social Links', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'latitude', label: 'Latitude', required: false },
  { key: 'longitude', label: 'Longitude', required: false },
  { key: 'tracking_status', label: 'Tracking Status', required: false },
  { key: 'first_detected_down', label: 'First Detected Down', required: false },
  { key: 'place_id', label: 'Place ID', required: false },
  { key: 'business_status', label: 'Business Status', required: false },
];

export const DEFAULT_COLUMNS = [
  'name',
  'phone',
  'address',
  'website_url',
  'status',
  'status_detail',
  'lead_type',
  'days_down',
];

/**
 * Escape CSV value to handle commas, quotes, and newlines
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Generate CSV content from leads data
 */
export function generateCSV(leads: Record<string, unknown>[], columns: string[]): string {
  if (leads.length === 0) {
    return '';
  }

  // Get column labels
  const columnDefs = AVAILABLE_COLUMNS.filter(col => columns.includes(col.key));
  const headers = columnDefs.map(col => col.label);

  // Create CSV rows
  const rows = leads.map(lead => {
    return columns.map(key => {
      const value = lead[key];
      return escapeCSV(value);
    });
  });

  // Combine headers and rows
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ];

  return csvLines.join('\n');
}

/**
 * Generate Excel workbook from leads data
 */
export function generateXLSX(leads: Record<string, unknown>[], columns: string[]): Buffer {
  if (leads.length === 0) {
    // Create empty workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['No data']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  // Get column labels
  const columnDefs = AVAILABLE_COLUMNS.filter(col => columns.includes(col.key));
  const headers = columnDefs.map(col => col.label);

  // Create data rows
  const data = leads.map(lead => {
    return columns.map(key => {
      const value = lead[key];
      // Convert objects to JSON strings
      if (value !== null && typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value;
    });
  });

  // Create worksheet with headers and data
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Set column widths
  const colWidths = columns.map((key) => {
    // Set default width based on column type
    const widthMap: Record<string, number> = {
      name: 25,
      address: 30,
      website_url: 30,
      phone: 15,
      status_detail: 25,
      social_links: 30,
      notes: 30,
    };
    return { wch: widthMap[key] || 12 };
  });
  ws['!cols'] = colWidths;

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');

  // Generate buffer
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

/**
 * Generate JSON content from leads data
 */
export function generateJSON(leads: Record<string, unknown>[], columns: string[]): string {
  if (leads.length === 0) {
    return '[]';
  }

  // Filter leads to only include selected columns
  const filteredLeads = leads.map(lead => {
    const filtered: Record<string, unknown> = {};
    columns.forEach(key => {
      filtered[key] = lead[key];
    });
    return filtered;
  });

  // Pretty print JSON with 2-space indentation
  return JSON.stringify(filteredLeads, null, 2);
}

/**
 * Get content type for format
 */
export function getContentType(format: 'csv' | 'xlsx' | 'json'): string {
  const contentTypes = {
    csv: 'text/csv',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    json: 'application/json',
  };
  return contentTypes[format];
}

/**
 * Get filename with timestamp
 */
export function getFilename(format: 'csv' | 'xlsx' | 'json'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const extensions = {
    csv: 'csv',
    xlsx: 'xlsx',
    json: 'json',
  };
  return `mayday-leads-${timestamp}.${extensions[format]}`;
}
