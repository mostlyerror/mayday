import { 
  upsertBusiness, 
  businessExists, 
  insertScanResult, 
  getLatestScanResult,
  startScanRun, 
  completeScanRun,
  getBusinessesDueForRescan,
  getBusinessByPlaceId,
  Business
} from './db';
import { searchPlaces, getPlaceDetails, placeToBusinessData, milesToMeters } from './google-places';
import { checkWebsite, getNextScanDate, WebsiteStatus } from './website-checker';
import * as fs from 'fs';
import * as path from 'path';

interface ScanProgress {
  status: 'idle' | 'running' | 'completed' | 'error' | 'cancelled';
  currentZip?: string;
  businessesScanned: number;
  newLeadsFound: number;
  apiCallsUsed: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

let scanProgress: ScanProgress = {
  status: 'idle',
  businessesScanned: 0,
  newLeadsFound: 0,
  apiCallsUsed: 0
};

let shouldCancelScan = false;

export function getScanProgress(): ScanProgress {
  return { ...scanProgress };
}

export function cancelScan(): void {
  if (scanProgress.status === 'running') {
    shouldCancelScan = true;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const DOWN_STATUSES: WebsiteStatus[] = [
  'http_4xx', 'http_5xx', 'timeout', 'ssl_expired', 'ssl_invalid',
  'connection_refused', 'dns_failure', 'hosting_expired', 'parked'
];

export async function runScan(options: {
  zipCodes?: string[];
  query?: string;
  maxBusinesses?: number;
}): Promise<void> {
  if (scanProgress.status === 'running') {
    throw new Error('Scan already in progress');
  }

  const configPath = path.join(process.cwd(), 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Use actual business categories for better search results
  const searchQueries = options.query ? [options.query] : [
    'restaurant',
    'retail store',
    'professional services',
    'health services',
    'home services',
    'auto services'
  ];
  const radiusMeters = milesToMeters(config.radius_miles);
  const maxBusinesses = options.maxBusinesses || 1000;

  scanProgress = {
    status: 'running',
    businessesScanned: 0,
    newLeadsFound: 0,
    apiCallsUsed: 0,
    startedAt: new Date().toISOString()
  };

  shouldCancelScan = false;
  const runId = await startScanRun();

  try {
    let totalProcessed = 0;

    for (const searchQuery of searchQueries) {
      if (totalProcessed >= maxBusinesses) break;
      if (shouldCancelScan) break;

      scanProgress.currentZip = searchQuery; // Using currentZip field to show current search query

      let pageToken: string | undefined;

      do {
        const searchResult = await searchPlaces(
          searchQuery,
          config.center,
          radiusMeters,
          pageToken
        );

        scanProgress.apiCallsUsed++;

        for (const place of searchResult.places) {
          if (totalProcessed >= maxBusinesses) break;
          if (shouldCancelScan) break;

          const exists = await businessExists(place.place_id);
          
          if (!exists) {
            const details = await getPlaceDetails(place.place_id);
            scanProgress.apiCallsUsed++;
            
            if (details) {
              const businessData = placeToBusinessData(details);
              await upsertBusiness(businessData as Business);
            }
          }

          await delay(1000);

          const business = await getBusinessByPlaceId(place.place_id);
          if (!business) continue;

          const websiteResult = await checkWebsite(business.website_url || null, place.place_id);
          
          const previousScan = await getLatestScanResult(place.place_id);
          const wasUp = !previousScan || previousScan.status === 'up';
          const isDown = DOWN_STATUSES.includes(websiteResult.status);

          let firstDetectedDown: string | null = null;
          if (isDown) {
            if (previousScan?.first_detected_down && DOWN_STATUSES.includes(previousScan.status as WebsiteStatus)) {
              firstDetectedDown = previousScan.first_detected_down || null;
            } else {
              firstDetectedDown = new Date().toISOString();
            }
          }

          await insertScanResult({
            place_id: place.place_id,
            status: websiteResult.status,
            status_detail: websiteResult.statusDetail,
            platform_detected: websiteResult.platformDetected,
            lead_type: websiteResult.leadType || undefined,
            first_detected_down: firstDetectedDown || undefined,
            next_scan_date: getNextScanDate(websiteResult.status, firstDetectedDown)
          });

          scanProgress.businessesScanned++;
          if (websiteResult.leadType && wasUp && isDown) {
            scanProgress.newLeadsFound++;
          }

          totalProcessed++;
        }

        pageToken = searchResult.nextPageToken;
        
        if (pageToken) {
          await delay(2000);
        }
        
      } while (pageToken && totalProcessed < maxBusinesses && !shouldCancelScan);
    }

    if (shouldCancelScan) {
      scanProgress.status = 'cancelled';
      scanProgress.completedAt = new Date().toISOString();
    } else {
      scanProgress.status = 'completed';
      scanProgress.completedAt = new Date().toISOString();
    }

  } catch (error) {
    scanProgress.status = 'error';
    scanProgress.error = (error as Error).message;
    scanProgress.completedAt = new Date().toISOString();
  }

  await completeScanRun(
    runId,
    scanProgress.businessesScanned,
    scanProgress.newLeadsFound,
    scanProgress.apiCallsUsed
  );
}

export async function rescanDueBusinesses(): Promise<void> {
  if (scanProgress.status === 'running') {
    throw new Error('Scan already in progress');
  }

  scanProgress = {
    status: 'running',
    businessesScanned: 0,
    newLeadsFound: 0,
    apiCallsUsed: 0,
    startedAt: new Date().toISOString()
  };

  shouldCancelScan = false;
  const runId = await startScanRun();

  try {
    const businesses = await getBusinessesDueForRescan();

    for (const business of businesses) {
      if (shouldCancelScan) break;
      await delay(1000);

      const websiteResult = await checkWebsite(business.website_url || null, business.place_id);
      
      const previousScan = await getLatestScanResult(business.place_id);
      const wasUp = !previousScan || previousScan.status === 'up';
      const isDown = DOWN_STATUSES.includes(websiteResult.status);

      let firstDetectedDown: string | null = null;
      if (isDown) {
        if (previousScan?.first_detected_down && DOWN_STATUSES.includes(previousScan.status as WebsiteStatus)) {
          firstDetectedDown = previousScan.first_detected_down || null;
        } else {
          firstDetectedDown = new Date().toISOString();
        }
      }

      await insertScanResult({
        place_id: business.place_id,
        status: websiteResult.status,
        status_detail: websiteResult.statusDetail,
        platform_detected: websiteResult.platformDetected,
        lead_type: websiteResult.leadType || undefined,
        first_detected_down: firstDetectedDown || undefined,
        next_scan_date: getNextScanDate(websiteResult.status, firstDetectedDown)
      });

      scanProgress.businessesScanned++;
      if (websiteResult.leadType && wasUp && isDown) {
        scanProgress.newLeadsFound++;
      }
    }

    if (shouldCancelScan) {
      scanProgress.status = 'cancelled';
      scanProgress.completedAt = new Date().toISOString();
    } else {
      scanProgress.status = 'completed';
      scanProgress.completedAt = new Date().toISOString();
    }

  } catch (error) {
    scanProgress.status = 'error';
    scanProgress.error = (error as Error).message;
    scanProgress.completedAt = new Date().toISOString();
  }

  await completeScanRun(
    runId,
    scanProgress.businessesScanned,
    scanProgress.newLeadsFound,
    scanProgress.apiCallsUsed
  );
}
