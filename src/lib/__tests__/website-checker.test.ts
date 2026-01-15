import { getNextScanDate, checkWebsite } from '../website-checker';

// Mock the db module
jest.mock('../db', () => ({
  updateBusinessSocialLinks: jest.fn().mockResolvedValue(undefined),
}));

describe('website-checker', () => {
  describe('getNextScanDate', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should schedule weekly scans for working sites', () => {
      const result = getNextScanDate('up', null);
      const nextDate = new Date(result);
      const expectedDate = new Date('2024-01-22T12:00:00Z');

      expect(nextDate.toISOString()).toBe(expectedDate.toISOString());
    });

    it('should schedule monthly scans for no_website status', () => {
      const result = getNextScanDate('no_website', null);
      const nextDate = new Date(result);
      const expectedDate = new Date('2024-02-14T12:00:00Z');

      expect(nextDate.toISOString()).toBe(expectedDate.toISOString());
    });

    it('should schedule monthly scans for redirect_social status', () => {
      const result = getNextScanDate('redirect_social', null);
      const nextDate = new Date(result);
      const expectedDate = new Date('2024-02-14T12:00:00Z');

      expect(nextDate.toISOString()).toBe(expectedDate.toISOString());
    });

    it('should schedule weekly scans for freshly down sites (< 7 days)', () => {
      const firstDetectedDown = new Date('2024-01-12T12:00:00Z').toISOString();
      const result = getNextScanDate('http_5xx', firstDetectedDown);
      const nextDate = new Date(result);
      const expectedDate = new Date('2024-01-22T12:00:00Z');

      expect(nextDate.toISOString()).toBe(expectedDate.toISOString());
    });

    it('should schedule bi-weekly scans for sites down 7-30 days', () => {
      const firstDetectedDown = new Date('2024-01-01T12:00:00Z').toISOString();
      const result = getNextScanDate('http_5xx', firstDetectedDown);
      const nextDate = new Date(result);
      const expectedDate = new Date('2024-01-29T12:00:00Z');

      expect(nextDate.toISOString()).toBe(expectedDate.toISOString());
    });

    it('should schedule monthly scans for sites down 30+ days', () => {
      const firstDetectedDown = new Date('2023-12-01T12:00:00Z').toISOString();
      const result = getNextScanDate('http_5xx', firstDetectedDown);
      const nextDate = new Date(result);
      const expectedDate = new Date('2024-02-14T12:00:00Z');

      expect(nextDate.toISOString()).toBe(expectedDate.toISOString());
    });

    it('should default to weekly scans when no firstDetectedDown is provided for down sites', () => {
      const result = getNextScanDate('timeout', null);
      const nextDate = new Date(result);
      const expectedDate = new Date('2024-01-22T12:00:00Z');

      expect(nextDate.toISOString()).toBe(expectedDate.toISOString());
    });
  });

  describe('checkWebsite', () => {
    const mockPlaceId = 'test-place-123';

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return no_website status when URL is null', async () => {
      const result = await checkWebsite(null, mockPlaceId);

      expect(result).toEqual({
        status: 'no_website',
        leadType: 'build',
      });
    });

    it('should normalize URLs without protocol', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        url: 'https://example.com',
        text: jest.fn().mockResolvedValue('<html></html>'),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await checkWebsite('example.com', mockPlaceId);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.any(Object)
      );
    });

    it('should detect social redirects', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        url: 'https://www.facebook.com/somebusiness',
        text: jest.fn().mockResolvedValue('<html></html>'),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await checkWebsite('https://example.com', mockPlaceId);

      expect(result.status).toBe('redirect_social');
      expect(result.statusDetail).toContain('facebook.com');
      expect(result.leadType).toBe('social_only');
    });

    it('should detect 4xx errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        url: 'https://example.com',
        text: jest.fn().mockResolvedValue('<html><h1>404 Not Found</h1></html>'),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await checkWebsite('https://example.com', mockPlaceId);

      expect(result.status).toBe('http_4xx');
      expect(result.statusDetail).toBe('404');
      expect(result.leadType).toBe('fix');
    });

    it('should detect 5xx errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        url: 'https://example.com',
        text: jest.fn().mockResolvedValue('<html><h1>500 Internal Server Error</h1></html>'),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await checkWebsite('https://example.com', mockPlaceId);

      expect(result.status).toBe('http_5xx');
      expect(result.statusDetail).toBe('500');
      expect(result.leadType).toBe('fix');
    });

    it('should detect parked domains', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        url: 'https://example.com',
        text: jest.fn().mockResolvedValue('<html><body>This domain is parked free, courtesy of GoDaddy.com</body></html>'),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await checkWebsite('https://example.com', mockPlaceId);

      expect(result.status).toBe('parked');
      expect(result.statusDetail).toBe('GoDaddy parked');
      expect(result.leadType).toBe('fix');
    });

    it('should detect expired hosting', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        url: 'https://example.com',
        text: jest.fn().mockResolvedValue('<html><body>This website has expired. Please login to Squarespace to renew.</body></html>'),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await checkWebsite('https://example.com', mockPlaceId);

      expect(result.status).toBe('hosting_expired');
      expect(result.statusDetail).toBe('Squarespace expired');
      expect(result.leadType).toBe('fix');
    });

    it('should detect timeout errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('The operation was aborted'));

      const result = await checkWebsite('https://example.com', mockPlaceId);

      expect(result.status).toBe('timeout');
      expect(result.statusDetail).toBe('Request timed out');
      expect(result.leadType).toBe('fix');
    });

    it('should detect DNS failures', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('getaddrinfo ENOTFOUND example.com'));

      const result = await checkWebsite('https://example.com', mockPlaceId);

      expect(result.status).toBe('dns_failure');
      expect(result.statusDetail).toBe('Domain not found');
      expect(result.leadType).toBe('fix');
    });

    it('should detect connection refused', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('connect ECONNREFUSED'));

      const result = await checkWebsite('https://example.com', mockPlaceId);

      expect(result.status).toBe('connection_refused');
      expect(result.statusDetail).toBe('Connection refused');
      expect(result.leadType).toBe('fix');
    });

    it('should detect SSL expired', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('certificate has expired'));

      const result = await checkWebsite('https://example.com', mockPlaceId);

      expect(result.status).toBe('ssl_expired');
      expect(result.statusDetail).toBe('SSL certificate expired');
      expect(result.leadType).toBe('fix');
    });

    it('should detect SSL invalid', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('SSL certificate problem: unable to verify'));

      const result = await checkWebsite('https://example.com', mockPlaceId);

      expect(result.status).toBe('ssl_invalid');
      expect(result.statusDetail).toBe('SSL certificate invalid');
      expect(result.leadType).toBe('fix');
    });

    it('should return up status for working sites', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        url: 'https://example.com',
        text: jest.fn().mockResolvedValue('<html><body><h1>Welcome to Example.com</h1></body></html>'),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await checkWebsite('https://example.com', mockPlaceId);

      expect(result.status).toBe('up');
      expect(result.leadType).toBeNull();
    });

    it('should extract social links from HTML', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        url: 'https://example.com',
        text: jest.fn().mockResolvedValue(`
          <html>
            <body>
              <a href="https://www.facebook.com/mybusiness">Facebook</a>
              <a href="https://instagram.com/mybiz">Instagram</a>
              <a href="https://twitter.com/mybiz">Twitter</a>
            </body>
          </html>
        `),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await checkWebsite('https://example.com', mockPlaceId);

      expect(result.socialLinks).toBeDefined();
      expect(result.socialLinks?.facebook).toContain('facebook.com/mybusiness');
      expect(result.socialLinks?.instagram).toContain('instagram.com/mybiz');
      expect(result.socialLinks?.twitter).toContain('twitter.com/mybiz');
    });
  });
});
