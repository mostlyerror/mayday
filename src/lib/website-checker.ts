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

const PLATFORM_SIGNATURES: Record<string, { patterns: RegExp[]; requiredMatches?: number; status: WebsiteStatus; detail: string }> = {
  squarespace_expired: {
    patterns: [
      /your\s+trial\s+has\s+ended/i,
      /this\s+website\s+is\s+no\s+longer\s+available/i,
      /renew\s+your\s+subscription.*squarespace/i,
      /squarespace.*subscription.*expired/i
    ],
    status: 'hosting_expired',
    detail: 'Squarespace expired'
  },
  godaddy_parked: {
    patterns: [
      /parked\s+free.*courtesy\s+of\s+godaddy/i,
      /this\s+web\s+page\s+is\s+parked.*godaddy/i,
      /<title>parked\s+domain<\/title>/i
    ],
    status: 'parked',
    detail: 'GoDaddy parked'
  },
  godaddy_expired: {
    patterns: [
      /this\s+domain\s+(?:name\s+)?has\s+expired/i,
      /renew\s+(?:it\s+)?now.*godaddy/i
    ],
    status: 'hosting_expired',
    detail: 'GoDaddy expired'
  },
  wix_expired: {
    patterns: [
      /this\s+site\s+was\s+created\s+with.*wix.*but\s+is\s+no\s+longer\s+active/i,
      /wix\.com.*site\s+not\s+available/i,
      /upgrade\s+your\s+wix\s+account/i
    ],
    status: 'hosting_expired',
    detail: 'Wix expired'
  },
  weebly_expired: {
    patterns: [
      /this\s+weebly\s+website\s+is\s+currently\s+unavailable/i,
      /weebly\.com.*no\s+longer\s+available/i
    ],
    status: 'hosting_expired',
    detail: 'Weebly expired'
  },
  namecheap_parked: {
    patterns: [
      /this\s+domain\s+is\s+parked\s+by.*namecheap/i,
      /namecheap\.com.*parking/i
    ],
    status: 'parked',
    detail: 'Namecheap parked'
  },
  generic_parked: {
    patterns: [
      /this\s+domain\s+(?:is\s+)?(?:for\s+sale|available\s+for\s+purchase)/i,
      /buy\s+this\s+domain/i,
      /<title>(?:domain\s+)?(?:for\s+sale|parked)<\/title>/i
    ],
    status: 'parked',
    detail: 'Domain parked'
  },
  generic_suspended: {
    patterns: [
      /(?:account|website|hosting)\s+(?:has\s+been\s+)?suspended/i,
      /this\s+(?:account|site)\s+is\s+suspended/i
    ],
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
  // Remove HTML to get text length for context checking
  const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const contentLength = textContent.length;

  // If the page has substantial content (>2000 chars), it's likely a real site
  // Even if it mentions these terms in a blog post or help documentation
  const isSubstantialContent = contentLength > 2000;

  for (const [platform, config] of Object.entries(PLATFORM_SIGNATURES)) {
    let matchCount = 0;

    for (const pattern of config.patterns) {
      if (pattern.test(html)) {
        matchCount++;
      }
    }

    // For substantial content, require at least 2 pattern matches to reduce false positives
    // For short content, 1 match is sufficient as it's likely an error page
    const requiredMatches = isSubstantialContent ? 2 : 1;

    if (matchCount >= requiredMatches) {
      return { platform, status: config.status, detail: config.detail };
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
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
      // 403 Forbidden is often bot detection, not a broken site
      // Only flag it if we're certain it's a real error
      if (response.status === 403) {
        // Large retailers and chains likely have bot protection - not a lead
        // Check if this looks like bot protection by examining response
        const isLikelyBotProtection =
          html.includes('Access Denied') ||
          html.includes('Cloudflare') ||
          html.includes('security check') ||
          html.includes('bot') ||
          html.length < 1000; // Very short responses are often bot blocks

        if (isLikelyBotProtection) {
          // Treat as "up" - site is fine, just blocking bots
          return {
            status: 'up',
            leadType: null,
            socialLinks
          };
        }
      }

      // For other 4xx errors (404, 401, etc.), flag as broken
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
