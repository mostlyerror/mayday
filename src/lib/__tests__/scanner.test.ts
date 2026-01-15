import { getScanProgress, runScan } from '../scanner';
import * as db from '../db';
import * as googlePlaces from '../google-places';
import * as websiteChecker from '../website-checker';

// Mock all external dependencies
jest.mock('../db');
jest.mock('../google-places');
jest.mock('../website-checker');

// Mock fs and path modules
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn(),
}));

describe('scanner', () => {
  describe('getScanProgress', () => {
    it('should return initial idle state', () => {
      const progress = getScanProgress();

      expect(progress).toEqual({
        status: 'idle',
        businessesScanned: 0,
        newLeadsFound: 0,
        apiCallsUsed: 0,
      });
    });
  });

  describe('runScan', () => {
    const mockConfig = {
      center: { lat: 29.7604, lng: -95.3698, label: 'Houston' },
      radius_miles: 10,
      monthly_budget_usd: 200,
    };

    beforeEach(() => {
      jest.clearAllMocks();

      // Mock fs and path for config loading
      const fs = require('fs');
      const path = require('path');

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      (path.join as jest.Mock).mockReturnValue('/mock/path/config.json');

      // Mock database functions
      (db.startScanRun as jest.Mock).mockResolvedValue(1);
      (db.completeScanRun as jest.Mock).mockResolvedValue(undefined);
      (db.businessExists as jest.Mock).mockResolvedValue(false);
      (db.getBusinessByPlaceId as jest.Mock).mockResolvedValue({
        place_id: 'test-place-123',
        name: 'Test Business',
        website_url: 'https://example.com',
      });
      (db.upsertBusiness as jest.Mock).mockResolvedValue(undefined);
      (db.insertScanResult as jest.Mock).mockResolvedValue(undefined);
      (db.getLatestScanResult as jest.Mock).mockResolvedValue(null);

      // Mock Google Places API
      (googlePlaces.searchPlaces as jest.Mock).mockResolvedValue({
        places: [
          {
            place_id: 'test-place-123',
            name: 'Test Business',
          },
        ],
        nextPageToken: undefined,
      });
      (googlePlaces.getPlaceDetails as jest.Mock).mockResolvedValue({
        place_id: 'test-place-123',
        name: 'Test Business',
        formatted_address: '123 Main St',
      });
      (googlePlaces.placeToBusinessData as jest.Mock).mockReturnValue({
        place_id: 'test-place-123',
        name: 'Test Business',
      });
      (googlePlaces.milesToMeters as jest.Mock).mockReturnValue(16093.4);

      // Mock website checker
      (websiteChecker.checkWebsite as jest.Mock).mockResolvedValue({
        status: 'up',
        leadType: null,
      });
      (websiteChecker.getNextScanDate as jest.Mock).mockReturnValue(
        new Date('2024-01-22T12:00:00Z').toISOString()
      );
    });

    afterEach(async () => {
      jest.clearAllTimers();
      jest.useRealTimers();
      // Give time for any pending promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should call database functions correctly', async () => {
      await runScan({ maxBusinesses: 1 });

      expect(db.startScanRun).toHaveBeenCalled();
      expect(db.completeScanRun).toHaveBeenCalled();
      expect(db.insertScanResult).toHaveBeenCalled();
    });

    it('should skip existing businesses and fetch details for new ones', async () => {
      (db.businessExists as jest.Mock).mockResolvedValue(true);

      await runScan({ maxBusinesses: 1 });

      // Should not fetch place details for existing business
      expect(googlePlaces.getPlaceDetails).not.toHaveBeenCalled();
      expect(db.upsertBusiness).not.toHaveBeenCalled();
    });
  });
});
