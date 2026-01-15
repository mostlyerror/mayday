import { updateBusinessSocialLinks } from './db';

export type WebsiteStatus = 
  | 'up'
  | 'http_4xx'
  | 'http_5xx'
  | 'timeout'
  | 'ssl_expired'
  | 'ssl_invalid'
  | 'connection_refused'
  | 'dns_failure'
  | 'hosting_expired'
  | 'parked'
  | 'redirect_social'
  | 'no_website';

export type LeadType = 'fix' | 'build' | 'social_only' | null;

export interface WebsiteCheckResult {
  status: WebsiteStatus;
  statusDetail?: string;
  platformDetected?: string;
  leadType: LeadType;
  socialLinks?: Record<string, string>;
}

const PLATFORM_SIGNATURES: Record<string, { patterns: RegExp[]; status: WebsiteStatus; detail: string }> = {
  squarespace_expired: {
    patterns: [/website.*expired/i, /owner.*login.*squarespace/i, /this site is currently unavailable/i],
    status: 'hosting_expired',
    detail: 'Squarespace expired'
  },
  godaddy_parked: {
    patterns: [/parked.*free.*courtesy.*godaddy/i, /this domain.*godaddy/i, /godaddy.*parked/i],
    status: 'parked',
    detail: 'GoDaddy parked'
  },
  godaddy_expired: {
    patterns: [/this domain has expired/i, /domain.*expired.*godaddy/i],
    status: 'hosting_expired',
    detail: 'GoDaddy expired'
  },
  wix_expired: {
    patterns: [/site.*not.*published/i, /wix.*site.*unavailable/i],
    status: 'hosting_expired',
    detail: 'Wix expired'
  },
  weebly_expired: {
    patterns: [/weebly.*site.*unavailable/i, /this site is no longer available/i],
    status: 'hosting_expired',
    detail: 'Weebly expired'
  },
  namecheap_parked: {
    patterns: [/namecheap.*parked/i, /domain.*parked.*namecheap/i],
    status: 'parked',
    detail: 'Namecheap parked'
  },
  generic_parked: {
    patterns: [/domain.*parked/i, /this domain.*for sale/i, /buy this domain/i, /domain.*available/i],
    status: 'parked',
    detail: 'Domain parked'
  },
  generic_suspended: {
    patterns: [/account.*suspended/i, /website.*suspended/i, /hosting.*suspended/i],
    status: 'hosting_expired',
    detail: 'Hosting suspended'
  }
};

const SOCIAL_PATTERNS: Record<string, RegExp> = {
  facebook: /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/([^\/\s"'<>]+)/i,
  instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^\/\s"'<>]+)/i,
  twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([^\/\s"'<>]+)/i,
  linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([^\/\s"'<>]+)/i,
  yelp: /(?:https?:\/\/)?(?:www\.)?yelp\.com\/biz\/([^\/\s"'<>]+)/i,
};

const SOCIAL_REDIRECT_PATTERNS = [
  /^https?:\/\/(?:www\.)?(?:facebook\.com|fb\.com)/i,
  /^https?:\/\/(?:www\.)?instagram\.com/i,
  /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)/i,
];

function extractSocialLinks(html: string): Record<string, string> {
  const links: Record<string, string> = {};
  for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
    const match = html.match(pattern);
    if (match) {
      links[platform] = match[0];
    }
  }
  return links;
}

function detectPlatform(html: string): { platform: string; status: WebsiteStatus; detail: string } | null {
  for (const [platform, config] of Object.entries(PLATFORM_SIGNATURES)) {
    for (const pattern of config.patterns) {
      if (pattern.test(html)) {
        return { platform, status: config.status, detail: config.detail };
      }
    }
  }
  return null;
}

function isSocialRedirect(url: string): boolean {
  return SOCIAL_REDIRECT_PATTERNS.some(pattern => pattern.test(url));
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      clearTimeout(timeout);
      return response;
    } catch (error) {
      lastError = error as Error;
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw lastError;
}

export async function checkWebsite(url: string | null, placeId: string): Promise<WebsiteCheckResult> {
  if (!url) {
    return { status: 'no_website', leadType: 'build' };
  }

  // Normalize URL
  let normalizedUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    normalizedUrl = 'https://' + url;
  }

  try {
    const response = await fetchWithRetry(normalizedUrl);
    const finalUrl = response.url;

    // Check for social redirect
    if (isSocialRedirect(finalUrl)) {
      return {
        status: 'redirect_social',
        statusDetail: `Redirects to ${new URL(finalUrl).hostname}`,
        leadType: 'social_only'
      };
    }

    const html = await response.text();

    // Extract social links while we have the HTML
    const socialLinks = extractSocialLinks(html);
    if (Object.keys(socialLinks).length > 0) {
      await updateBusinessSocialLinks(placeId, JSON.stringify(socialLinks));
    }

    // Check HTTP status
    if (response.status >= 400 && response.status < 500) {
      return {
        status: 'http_4xx',
        statusDetail: response.status.toString(),
        leadType: 'fix',
        socialLinks
      };
    }

    if (response.status >= 500) {
      return {
        status: 'http_5xx',
        statusDetail: response.status.toString(),
        leadType: 'fix',
        socialLinks
      };
    }

    // Check for platform-specific issues
    const platformResult = detectPlatform(html);
    if (platformResult) {
      return {
        status: platformResult.status,
        statusDetail: platformResult.detail,
        platformDetected: platformResult.platform.split('_')[0],
        leadType: 'fix',
        socialLinks
      };
    }

    // Site is up
    return {
      status: 'up',
      leadType: null,
      socialLinks
    };

  } catch (error) {
    const errorMessage = (error as Error).message || '';

    if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
      return { status: 'timeout', statusDetail: 'Request timed out', leadType: 'fix' };
    }

    if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      return { status: 'dns_failure', statusDetail: 'Domain not found', leadType: 'fix' };
    }

    if (errorMessage.includes('ECONNREFUSED')) {
      return { status: 'connection_refused', statusDetail: 'Connection refused', leadType: 'fix' };
    }

    if (errorMessage.includes('certificate') || errorMessage.includes('SSL') || errorMessage.includes('TLS')) {
      if (errorMessage.includes('expired')) {
        return { status: 'ssl_expired', statusDetail: 'SSL certificate expired', leadType: 'fix' };
      }
      return { status: 'ssl_invalid', statusDetail: 'SSL certificate invalid', leadType: 'fix' };
    }

    // Generic connection error
    return {
      status: 'connection_refused',
      statusDetail: errorMessage.substring(0, 100),
      leadType: 'fix'
    };
  }
}

export function getNextScanDate(currentStatus: WebsiteStatus, firstDetectedDown: string | null): string {
  const now = new Date();
  let daysToAdd: number;

  if (currentStatus === 'up') {
    daysToAdd = 7; // Weekly for working sites
  } else if (currentStatus === 'no_website' || currentStatus === 'redirect_social') {
    daysToAdd = 30; // Monthly for no website / social only
  } else if (firstDetectedDown) {
    const downDate = new Date(firstDetectedDown);
    const daysDown = Math.floor((now.getTime() - downDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDown < 7) {
      daysToAdd = 7; // Weekly for freshly down
    } else if (daysDown < 30) {
      daysToAdd = 14; // Bi-weekly for 7-30 days down
    } else {
      daysToAdd = 30; // Monthly for 30+ days down
    }
  } else {
    daysToAdd = 7; // Default weekly
  }

  const nextDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return nextDate.toISOString();
}
