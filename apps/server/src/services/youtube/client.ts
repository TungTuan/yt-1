import { google, youtube_v3 } from 'googleapis';
import type { Market } from '@komorebi/shared-types';

interface YouTubeCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  redirectUri: string;
}

function envPrefix(market: Market): string {
  return `YOUTUBE_${market.toUpperCase()}`;
}

export function getYouTubeCredentials(market: Market): YouTubeCredentials {
  const prefix = envPrefix(market);
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  const refreshToken = process.env[`${prefix}_REFRESH_TOKEN`];
  const redirectUri = process.env[`${prefix}_REDIRECT_URI`] ?? 'http://localhost:4000/api/youtube/oauth/callback';

  const missing = [
    !clientId && `${prefix}_CLIENT_ID`,
    !clientSecret && `${prefix}_CLIENT_SECRET`,
    !refreshToken && `${prefix}_REFRESH_TOKEN`,
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Thiếu YouTube OAuth config cho market=${market}: ${missing.join(', ')}`);
  }
  return { clientId: clientId!, clientSecret: clientSecret!, refreshToken: refreshToken!, redirectUri };
}

export function createYouTubeClient(market: Market): youtube_v3.Youtube {
  const credentials = getYouTubeCredentials(market);
  const auth = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret, credentials.redirectUri);
  auth.setCredentials({ refresh_token: credentials.refreshToken });
  return google.youtube({ version: 'v3', auth });
}

export function hasYouTubeCredentials(market: Market): boolean {
  const prefix = envPrefix(market);
  return Boolean(
    process.env[`${prefix}_CLIENT_ID`] &&
      process.env[`${prefix}_CLIENT_SECRET`] &&
      process.env[`${prefix}_REFRESH_TOKEN`],
  );
}
